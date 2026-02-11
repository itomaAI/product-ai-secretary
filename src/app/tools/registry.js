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
				},
				signal: global.REAL.Signal.CONTINUE
			};
			try {
				const output = await toolDef.impl(action.params, state);
				const signal = (output && output.signal) ? output.signal : toolDef.signalType;
				return {
					result: output,
					signal: signal
				};
			} catch (err) {
				console.error(`Tool Execution Error <${action.type}>:`, err);
				return {
					result: {
						log: `Error executing <${action.type}>: ${err.message}`,
						ui: `❌ Error: ${err.message}`
					},
					signal: global.REAL.Signal.CONTINUE
				};
			}
		}
	}
	global.App.Tools.Registry = ToolRegistry;
})(window);