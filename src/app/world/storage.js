// src/app/world/storage.js

(function(global) {
	global.App = global.App || {};
	global.App.World = global.App.World || {};
	class StorageManager {
		constructor(dbName = 'metaos_core_db', storeName = 'snapshots') {
			this.dbName = dbName;
			this.storeName = storeName;
			this.db = null;
			this.initPromise = this._initDB();
			this.currentSystemKey = 'metaos_current_system';
		}
		_initDB() {
			return new Promise((resolve, reject) => {
				const request = indexedDB.open(this.dbName, 2);
				request.onerror = (e) => reject(e.target.error);
				request.onsuccess = (e) => {
					this.db = e.target.result;
					resolve(this.db);
				};
				request.onupgradeneeded = (e) => {
					const db = e.target.result;
					if (!db.objectStoreNames.contains(this.storeName)) {
						const store = db.createObjectStore(this.storeName, {
							keyPath: 'id'
						});
						store.createIndex('timestamp', 'timestamp', {
							unique: false
						});
					}
					if (!db.objectStoreNames.contains('system_state')) {
						db.createObjectStore('system_state');
					}
				};
			});
		}
		async ready() {
			await this.initPromise;
		}

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

		// ★ 追加: 全削除機能
		async deleteAllSnapshots() {
			await this.ready();
			return new Promise((resolve, reject) => {
				const tx = this.db.transaction([this.storeName], 'readwrite');
				const req = tx.objectStore(this.storeName).clear();
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		}

		async pruneSnapshots() {
			await this.ready();
			const list = await this.listSnapshots();
			const now = Date.now();
			const oneDay = 24 * 60 * 60 * 1000;
			const twoWeeks = 14 * oneDay;

			const toDelete = [];
			const dayBuckets = {};

			for (const snap of list) {
				if (!snap.label || !snap.label.startsWith('Auto Backup')) continue;

				const age = now - snap.timestamp;
				if (age > twoWeeks) {
					toDelete.push(snap.id);
					continue;
				}
				if (age > oneDay) {
					const dateKey = new Date(snap.timestamp).toDateString();
					if (dayBuckets[dateKey]) {
						toDelete.push(snap.id);
					} else {
						dayBuckets[dateKey] = true;
					}
				}
			}

			if (toDelete.length > 0) {
				console.log(`[Storage] Pruning ${toDelete.length} old auto-backups.`);
				await Promise.all(toDelete.map(id => this.deleteSnapshot(id)));
			}
		}
	}
	global.App.World.StorageManager = StorageManager;
})(window);