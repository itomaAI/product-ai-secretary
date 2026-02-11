(function(global) {
	global.REAL = global.REAL || {};
	class LLMAdapter {
		async generateStream(messages, onChunk) {
			throw new Error("Not Implemented");
		}
	}
	class ParserAdapter {
		parse(text) {
			throw new Error("Not Implemented");
		}
	}
	class ToolRegistry {
		async execute(action, state) {
			throw new Error("Not Implemented");
		}
	}
	class ContextProjector {
		createContext(state) {
			throw new Error("Not Implemented");
		}
	}
	global.REAL.LLMAdapter = LLMAdapter;
	global.REAL.ParserAdapter = ParserAdapter;
	global.REAL.ToolRegistry = ToolRegistry;
	global.REAL.ContextProjector = ContextProjector;
})(window);