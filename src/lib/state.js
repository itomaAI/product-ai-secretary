(function(global) {
	global.REAL = global.REAL || {};
	class WorldState {
		constructor(vfs, memory = {}) {
			this.vfs = vfs;
			this.memory = memory;
			this.history = [];
		}
		appendTurn(role, content, meta = {}) {
			const turn = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				role,
				content,
				meta
			};
			this.history.push(turn);
			return turn;
		}
		getHistory() {
			return this.history;
		}
		getLastTurn() {
			return this.history.length === 0 ? null : this.history[this.history.length - 1];
		}
		snapshot() {
			return {
				history: JSON.parse(JSON.stringify(this.history)),
				memory: {
					...this.memory
				}
			};
		}
		restore(snapshotData) {
			this.history = snapshotData.history || [];
			this.memory = snapshotData.memory || {};
		}
	}
	global.REAL.WorldState = WorldState;
})(window);