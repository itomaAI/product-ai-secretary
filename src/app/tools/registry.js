(function(global) {
	global.App = global.App || {};
	global.App.Tools = global.App.Tools || {};
	class ToolRegistry extends global.REAL.ToolRegistry {
		constructor() {
			super();
			this.tools = new Map();
		}
		register(name, impl, signalType = global.REAL.Signal.CONTINUE) {
			this.tools.set(name, {
				impl,
				signalType
			});
		}
		async execute(action, state) {
			const toolDef = this.tools.get(action.type);
			if (!toolDef) return {
				result: {
					log: `Error: Unknown tool <${action.type}>`
					// error: true // ★追加: 未知のツールはエラー扱い
				},
				signal: global.REAL.Signal.CONTINUE
			};
			try {
				const output = await toolDef.impl(action.params, state);
				const signal = (output && output.signal) ? output.signal : toolDef.signalType;

				// ツール実装側が明示的に error: true を返していない場合でも、
				// 何らかの判定ロジックを入れる余地はあるが、基本は例外キャッチで対応
				return {
					result: output,
					signal: signal
				};
			} catch (err) {
				console.error(`Tool Execution Error <${action.type}>:`, err);
				return {
					result: {
						log: `Error executing <${action.type}>: ${err.message}`,
						ui: `❌ Error: ${err.message}`,
						error: true // ★追加: エンジンへのエラー通知フラグ
					},
					signal: global.REAL.Signal.CONTINUE
				};
			}
		}
	}
	global.App.Tools.Registry = ToolRegistry;
})(window);