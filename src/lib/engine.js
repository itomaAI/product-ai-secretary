
(function(global) {
	global.REAL = global.REAL || {};
	class Engine {
		constructor(state, projector, llm, parser, tools) {
			this.state = state; this.projector = projector; this.llm = llm; this.parser = parser; this.tools = tools;
			this.isRunning = false; this.abortController = null;
			this.listeners = { 'turn_start': [], 'stream_chunk': [], 'turn_end': [], 'loop_stop': [] };
		}
		on(event, callback) { if (this.listeners[event]) this.listeners[event].push(callback); }
		_emit(event, data) { if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data)); }
		async injectUserTurn(inputContent) {
			const turn = this.state.appendTurn(global.REAL.Role.USER, inputContent, { type: global.REAL.TurnType.USER_INPUT });
			this._emit('turn_end', { role: global.REAL.Role.USER, turn });
			await this.run();
		}
		async run() {
			if (this.isRunning) return; this.isRunning = true; this.abortController = new AbortController();
			const Signal = global.REAL.Signal; let currentSignal = Signal.CONTINUE;
			try {
				while (currentSignal === Signal.CONTINUE) {
					const messages = this.projector.createContext(this.state);
					this._emit('turn_start', { role: global.REAL.Role.MODEL });
					let rawResponse = "";
					await this.llm.generateStream(messages, (chunk) => { rawResponse += chunk; this._emit('stream_chunk', chunk); }, this.abortController.signal);
					this.state.appendTurn(global.REAL.Role.MODEL, rawResponse, { type: global.REAL.TurnType.MODEL_THOUGHT });
					const actions = this.parser.parse(rawResponse);
					if (actions.length === 0) { currentSignal = Signal.HALT; break; }
					this._emit('turn_start', { role: global.REAL.Role.SYSTEM });
					const results = []; let dominantSignal = Signal.CONTINUE;
					for (const action of actions) {
						const { result, signal } = await this.tools.execute(action, this.state);
						results.push({ actionType: action.type, output: result });
						if (signal === Signal.TERMINATE) dominantSignal = Signal.TERMINATE;
						else if (signal === Signal.HALT && dominantSignal !== Signal.TERMINATE) dominantSignal = Signal.HALT;
					}
					this.state.appendTurn(global.REAL.Role.SYSTEM, results, { type: global.REAL.TurnType.TOOL_EXECUTION });
					this._emit('turn_end', { role: global.REAL.Role.SYSTEM, results });
					currentSignal = dominantSignal;
					await new Promise(r => setTimeout(r, 10));
				}
			} catch (error) {
				if (error.name === 'AbortError') console.log('Loop aborted.');
				else { console.error('Engine Error:', error); this.state.appendTurn(global.REAL.Role.SYSTEM, `System Error: ${error.message}`, { type: global.REAL.TurnType.ERROR }); this._emit('loop_stop', { reason: 'error', error }); }
			} finally {
				this.isRunning = false; this.abortController = null;
				if (currentSignal === Signal.HALT) this._emit('loop_stop', { reason: 'halt' });
				else if (currentSignal === Signal.TERMINATE) this._emit('loop_stop', { reason: 'terminate' });
			}
		}
		stop() { if (this.abortController) this.abortController.abort(); }
	}
	global.REAL.Engine = Engine;
})(window);
