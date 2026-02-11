(function(global) {
	global.REAL = global.REAL || {};
	global.REAL.Signal = {
		CONTINUE: 'SIGNAL_CONTINUE',
		HALT: 'SIGNAL_HALT',
		TERMINATE: 'SIGNAL_TERMINATE'
	};
	global.REAL.Role = {
		USER: 'user',
		MODEL: 'model',
		SYSTEM: 'system'
	};
	global.REAL.TurnType = {
		USER_INPUT: 'user_input',
		MODEL_THOUGHT: 'model_thought',
		TOOL_EXECUTION: 'tool_execution',
		ERROR: 'error'
	};
})(window);