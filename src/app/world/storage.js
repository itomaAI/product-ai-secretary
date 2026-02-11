(function(global) {
	global.App = global.App || {};
	global.App.World = global.App.World || {};
	class StorageManager {
		constructor(dbName = 'metaos_core_db', storeName = 'snapshots') {
			this.dbName = dbName;
			this.storeName = storeName;
			this.db = null;
			this.initPromise = this._initDB();
			this.currentSystemKey = 'metaos_current_system'; // Key for the active state
		}
		_initDB() {
			return new Promise((resolve, reject) => {
				const request = indexedDB.open(this.dbName, 2); // Bump version to 2
				request.onerror = (e) => reject(e.target.error);
				request.onsuccess = (e) => {
					this.db = e.target.result;
					resolve(this.db);
				};
				request.onupgradeneeded = (e) => {
					const db = e.target.result;
					// Store for historical snapshots
					if (!db.objectStoreNames.contains(this.storeName)) {
						const store = db.createObjectStore(this.storeName, {
							keyPath: 'id'
						});
						store.createIndex('timestamp', 'timestamp', {
							unique: false
						});
					}
					// Store for the single active system state
					if (!db.objectStoreNames.contains('system_state')) {
						db.createObjectStore('system_state');
					}
				};
			});
		}
		async ready() {
			await this.initPromise;
		}

		// --- Active State Management ---

		async saveSystemState(vfsFiles, stateSnapshot) {
			await this.ready();
			const payload = {
				files: vfsFiles,
				state: stateSnapshot,
				timestamp: Date.now()
			};
			return new Promise((resolve, reject) => {
				const tx = this.db.transaction(['system_state'], 'readwrite');
				const req = tx.objectStore('system_state').put(payload, this.currentSystemKey);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		}

		async loadSystemState() {
			await this.ready();
			return new Promise((resolve, reject) => {
				const tx = this.db.transaction(['system_state'], 'readonly');
				const req = tx.objectStore('system_state').get(this.currentSystemKey);
				req.onsuccess = () => resolve(req.result || null);
				req.onerror = () => reject(req.error);
			});
		}

		// --- Snapshot / Time Machine Management ---

		async createSnapshot(label, vfsFiles, stateSnapshot) {
			await this.ready();
			const id = `snap_${Date.now()}`;
			const snapshot = {
				id,
				label,
				timestamp: Date.now(),
				files: vfsFiles,
				state: stateSnapshot
			};
			return new Promise((resolve, reject) => {
				const tx = this.db.transaction([this.storeName], 'readwrite');
				const req = tx.objectStore(this.storeName).put(snapshot);
				req.onsuccess = () => resolve(id);
				req.onerror = () => reject(req.error);
			});
		}

		async getSnapshot(id) {
			await this.ready();
			return new Promise((resolve, reject) => {
				const tx = this.db.transaction([this.storeName], 'readonly');
				const req = tx.objectStore(this.storeName).get(id);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
		}

		async listSnapshots() {
			await this.ready();
			return new Promise((resolve, reject) => {
				const tx = this.db.transaction([this.storeName], 'readonly');
				const store = tx.objectStore(this.storeName);
				const req = store.openCursor();
				const list = [];
				req.onsuccess = (e) => {
					const cursor = e.target.result;
					if (cursor) {
						const {
							id,
							label,
							timestamp
						} = cursor.value;
						list.push({
							id,
							label,
							timestamp
						});
						cursor.continue();
					} else {
						list.sort((a, b) => b.timestamp - a.timestamp);
						resolve(list);
					}
				};
				req.onerror = () => reject(req.error);
			});
		}

		async deleteSnapshot(id) {
			await this.ready();
			return new Promise((resolve, reject) => {
				const tx = this.db.transaction([this.storeName], 'readwrite');
				const req = tx.objectStore(this.storeName).delete(id);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		}

		async pruneSnapshots() {
			await this.ready();
			const list = await this.listSnapshots(); // Sorted Newest -> Oldest
			const now = Date.now();
			const oneDay = 24 * 60 * 60 * 1000;
			const twoWeeks = 14 * oneDay;

			const toDelete = [];
			const dayBuckets = {};

			for (const snap of list) {
				// Skip manual backups? Maybe check label? 
				// User said "Auto backup 30 mins...". 
				// If I prune manual backups, user might get mad.
				// Let's assume we prune based on time regardless, OR filter by label 'Auto Backup'.
				// User requirement: "Backup 30 mins... capacity...". Usually implies automated ones.
				// I'll check label. If it starts with "Auto Backup", prune.
				// If it's a manual one (user typed label), keep it? 
				// The user didn't specify, but safer to keep manual ones.

				if (!snap.label || !snap.label.startsWith('Auto Backup')) continue;

				const age = now - snap.timestamp;

				// 1. Delete if older than 2 weeks
				if (age > twoWeeks) {
					toDelete.push(snap.id);
					continue;
				}

				// 2. If older than 1 day, keep only one per day
				if (age > oneDay) {
					const dateKey = new Date(snap.timestamp).toDateString();
					if (dayBuckets[dateKey]) {
						// Already kept the newest for this day
						toDelete.push(snap.id);
					} else {
						dayBuckets[dateKey] = true;
					}
				}
			}

			if (toDelete.length > 0) {
				console.log(`[Storage] Pruning ${toDelete.length} old auto-backups.`);
				// Sequential delete to avoid transaction overload? Or parallel?
				// IndexedDB transactions are cheap.
				await Promise.all(toDelete.map(id => this.deleteSnapshot(id)));
			}
		}
	}
	global.App.World.StorageManager = StorageManager;
})(window);