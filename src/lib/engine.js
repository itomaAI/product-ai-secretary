(function(global) {
	global.REAL = global.REAL || {};
	class Engine {
		constructor(state, projector, llm, parser, tools) {
			this.state = state;
			this.projector = projector;
			this.llm = llm;
			this.parser = parser;
			this.tools = tools;
			this.isRunning = false;
			this.abortController = null;
			this.listeners = {
				'turn_start': [],
				'stream_chunk': [],
				'turn_end': [],
				'loop_stop': []
			};
		}
		on(event, callback) {
			if (this.listeners[event]) this.listeners[event].push(callback);
		}
		_emit(event, data) {
			if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data));
		}
		async injectUserTurn(inputContent) {
			const turn = this.state.appendTurn(global.REAL.Role.USER, inputContent, {
				type: global.REAL.TurnType.USER_INPUT
			});
			this._emit('turn_end', {
				role: global.REAL.Role.USER,
				turn
			});
			await this.run();
		}
		async run() {
			if (this.isRunning) return;
			this.isRunning = true;
			this.abortController = new AbortController();
			const Signal = global.REAL.Signal;

			let currentSignal = Signal.CONTINUE;
			let loopCount = 0;
			const MAX_LOOPS = 1000;

			// ★追加: 前のターンでエラーが発生したかを追跡するフラグ
			let lastTurnHadError = false;

			try {
				while (currentSignal === Signal.CONTINUE) {
					// 1. 無限ループ防止チェック
					if (loopCount >= MAX_LOOPS) {
						console.warn(`Max autonomous loops (${MAX_LOOPS}) reached.`);
						this.state.appendTurn(global.REAL.Role.SYSTEM, `System Alert: Maximum autonomous turn limit (${MAX_LOOPS}) reached. Stopping execution.`, {
							type: global.REAL.TurnType.ERROR
						});
						currentSignal = Signal.HALT;
						break;
					}
					loopCount++;

					// 2. LLM生成
					const messages = this.projector.createContext(this.state);
					this._emit('turn_start', {
						role: global.REAL.Role.MODEL
					});
					let rawResponse = "";
					await this.llm.generateStream(messages, (chunk) => {
						rawResponse += chunk;
						this._emit('stream_chunk', chunk);
					}, this.abortController.signal);
					this.state.appendTurn(global.REAL.Role.MODEL, rawResponse, {
						type: global.REAL.TurnType.MODEL_THOUGHT
					});

					// 3. アクション解析
					const actions = this.parser.parse(rawResponse);

					// ★修正: アクションが無い場合の判定ロジック強化
					if (actions.length === 0) {
						if (lastTurnHadError) {
							// 前のターンでエラーだったのに、今回何もアクションしなかった場合
							// システム側から叱咤してループを強制継続させる
							const retryMsg = "System: The previous tool execution failed. You MUST retry with a corrected action or fix the error. Do not finish without resolving the issue.";

							this.state.appendTurn(global.REAL.Role.SYSTEM, retryMsg, {
								type: global.REAL.TurnType.ERROR
							});

							// UIに反映させるためイベント発火
							this._emit('turn_end', {
								role: global.REAL.Role.SYSTEM,
								results: [{
									actionType: 'system_retry',
									output: {
										ui: "⚠️ Retry Requested: Action required to fix error."
									}
								}]
							});

							// フラグをリセットして再試行（無限ループ防止のため、これ以上の空アクションは許容しない設計も可能だが、今回はループ回数制限に委ねる）
							lastTurnHadError = false;
							continue;
						} else {
							// 通常終了
							currentSignal = Signal.HALT;
							break;
						}
					}

					this._emit('turn_start', {
						role: global.REAL.Role.SYSTEM
					});

					// 4. ツール実行 & シグナル決定
					const results = [];
					let dominantSignal = Signal.CONTINUE;
					let hasError = false; // 今回のターンのエラー判定

					for (const action of actions) {
						const {
							result,
							signal
						} = await this.tools.execute(action, this.state);

						results.push({
							actionType: action.type,
							output: result
						});

						// エラー判定: Registryが error: true を返しているかチェック
						if (result && result.error) {
							hasError = true;
						}

						// シグナルの優先順位判定
						if (signal === Signal.TERMINATE) dominantSignal = Signal.TERMINATE;
						else if (signal === Signal.HALT && dominantSignal !== Signal.TERMINATE) dominantSignal = Signal.HALT;
					}

					// ★修正: エラー発生時のFinishキャンセル (Finish無視ロジック)
					// エラーがあるのに終了しようとした場合、強制的にCONTINUEにする
					if (hasError && dominantSignal === Signal.TERMINATE) {
						dominantSignal = Signal.CONTINUE;
						results.push({
							actionType: 'system_override',
							output: {
								log: "System Notice: <finish> signal was IGNORED because a tool execution failed. You must verify the error and retry.",
								ui: "🚫 Finish Cancelled: Error detected."
							}
						});
					}

					// 次のループ判定のためにエラー状態を保存
					lastTurnHadError = hasError;

					this.state.appendTurn(global.REAL.Role.SYSTEM, results, {
						type: global.REAL.TurnType.TOOL_EXECUTION
					});
					this._emit('turn_end', {
						role: global.REAL.Role.SYSTEM,
						results
					});
					currentSignal = dominantSignal;
					await new Promise(r => setTimeout(r, 10));
				}
			} catch (error) {
				if (error.name === 'AbortError') console.log('Loop aborted.');
				else {
					console.error('Engine Error:', error);
					this.state.appendTurn(global.REAL.Role.SYSTEM, `System Error: ${error.message}`, {
						type: global.REAL.TurnType.ERROR
					});
					this._emit('loop_stop', {
						reason: 'error',
						error
					});
				}
			} finally {
				this.isRunning = false;
				this.abortController = null;
				if (currentSignal === Signal.HALT) this._emit('loop_stop', {
					reason: 'halt'
				});
				else if (currentSignal === Signal.TERMINATE) this._emit('loop_stop', {
					reason: 'terminate'
				});
			}
		}
		stop() {
			if (this.abortController) this.abortController.abort();
		}
	}
	global.REAL.Engine = Engine;
})(window);