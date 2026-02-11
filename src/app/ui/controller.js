// src/app/ui/controller.js

(function(global) {
	global.App = global.App || {};
	global.App.UI = global.App.UI || {};

	const {
		ChatComponent,
		EditorComponent,
		ExplorerComponent,
		MediaViewer,
		DOM
	} = global.App.UI;

	class UIController {
		constructor(vfs, state, compiler) {
			this.vfs = vfs;
			this.state = state;
			this.compiler = compiler;
			this.els = {};

			this._initElements();

			// Initialize Components
			this.chat = new ChatComponent();
			this.editor = new EditorComponent();
			this.mediaViewer = new MediaViewer();
			this.explorer = new ExplorerComponent(vfs);

			this._bindProjectUI();
			this._wireComponents();
			this._initMetaOSBridge(); // ★ Bridge Init

			// Watch VFS for Data Changes
			this.vfs.subscribe((files, path, action) => {
				if (path && path.startsWith('data/')) {
					console.log(`[Controller] Data changed: ${path} (${action})`);
					this._notifyMetaOS('file_changed', {
						path,
						action
					});
				}
			});
		}

		_notifyMetaOS(type, payload) {
			if (this.els.previewFrame && this.els.previewFrame.contentWindow) {
				this.els.previewFrame.contentWindow.postMessage({
					type: 'METAOS_EVENT',
					event: type,
					payload
				}, '*');
			}
		}

		_initElements() {
			['previewFrame', 'previewLoader', 'saveStatus',
				'btnBackup', 'btnHistory', 'btnReset', 'historyModal', 'btnCloseModal', 'snapshotList', 'btnCreateSnapshot'
			]
			.forEach(key => {
				// Map logical names to DOM IDs (assuming simple mapping for now if not in DOM dictionary)
				const id = DOM[key] || key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()); // e.g. btnBackup -> btn-backup
				this.els[key] = document.getElementById(id);
			});
			// Manual overrides if needed
			this.els.historyModal = document.getElementById('history-modal');
			this.els.snapshotList = document.getElementById('snapshot-list');
			this.els.btnCreateSnapshot = document.getElementById('btn-create-snapshot');
			this.els.btnCloseModal = document.getElementById('btn-close-modal');
		}

		_wireComponents() {
			// 1. Explorer -> Open File
			this.explorer.on('open_file', (path, content) => {
				const BINARY_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|ico|pdf|zip|tar|gz|7z|rar|mp3|wav|mp4|webm|ogg|woff|woff2|ttf|eot|otf)$/i;
				if (path.match(BINARY_EXTS)) {
					this.editor.close();
					this.mediaViewer.open(path, content);
				} else {
					this.mediaViewer.close();
					this.editor.open(path, content);
				}
			});

			// Chat -> Media Preview
			this.chat.on('preview_request', (name, base64, mimeType) => {
				this.mediaViewer.open(name, base64, mimeType);
			});

			// 2. Explorer -> History Event
			this.explorer.on('history_event', (type, description) => {
				const lpml = `<event type="${type}">\n${description}\n</event>`;
				this.state.appendTurn(global.REAL.Role.SYSTEM, lpml, {
					type: 'event_log'
				});
				this.chat.renderHistory(this.state.getHistory());
			});

			// 3. Editor Save
			this.editor.on('save', (path, content) => {
				this.vfs.writeFile(path, content);

				const lpml = `<event type="file_change">\nUser edited file content: ${path}\n</event>`;
				this.state.appendTurn(global.REAL.Role.SYSTEM, lpml, {
					type: 'event_log'
				});
				this.chat.renderHistory(this.state.getHistory());

				// Auto refresh preview
				this.refreshPreview();
			});
		}

		// ★ MetaOS Bridge Handling
		_initMetaOSBridge() {
			window.addEventListener('message', async (event) => {
				const data = event.data;
				if (!data || data.type !== 'METAOS_ACTION') return;

				const {
					requestId,
					action,
					payload
				} = data;
				let result = null;
				let error = null;

				try {
					switch (action) {
						case 'switch_view':
							// Reload preview with new entry point
							console.log("Switching view to:", payload.path);
							await this.refreshPreview(payload.path);
							break;

						case 'save_file':
							this.vfs.writeFile(payload.path, payload.content);
							// Refresh explorer if file added
							try {
								this.explorer.render();
							} catch (err) {
								console.error("Explorer render failed", err);
							}
							break;

						case 'read_file':
							result = this.vfs.readFile(payload.path);
							break;

						case 'list_files':
							const files = this.vfs.listFiles();
							if (payload.path) {
								// Simple filter
								result = files.filter(f => f.startsWith(payload.path));
							} else {
								result = files;
							}
							break;

						case 'delete_file':
							this.vfs.deleteFile(payload.path);
							try {
								this.explorer.render();
							} catch (err) {
								console.error("Explorer render failed", err);
							}
							break;

						case 'rename_file':
							result = this.vfs.rename(payload.oldPath, payload.newPath);
							try {
								this.explorer.render();
							} catch (err) {}
							break;

						case 'open_file':
							// Open file in Host Editor
							const content = this.vfs.readFile(payload.path);
							this.editor.open(payload.path, content);
							break;

						case 'show_notification':
							console.log(`[MetaOS] ${payload.title}: ${payload.message}`);
							alert(`${payload.title}\n${payload.message}`);
							break;

						case 'ask_ai':
							// Inject into chat input and trigger send?
							// For now, just log it as a user message
							const lpml = `<user_input>\n${payload.text}\n</user_input>`;
							this.state.appendTurn(global.REAL.Role.USER, lpml);
							this.chat.renderHistory(this.state.getHistory());
							// Trigger AI response (simplified)
							// document.getElementById('btn-send').click(); // This requires DOM manipulation
							break;

						case 'view_ready':
							console.log("MetaOS View Ready");
							break;

						default:
							throw new Error(`Unknown action: ${action}`);
					}
				} catch (e) {
					console.error("MetaOS Action Error:", e);
					error = e.message;
				}

				// Send Response
				if (this.els.previewFrame && this.els.previewFrame.contentWindow) {
					this.els.previewFrame.contentWindow.postMessage({
						type: 'METAOS_RESPONSE',
						requestId,
						result,
						error
					}, '*');
				}
			});
		}

		_bindProjectUI() {
			// Replaced with System/History UI
			if (this.els.btnBackup) {
				this.els.btnBackup.addEventListener('click', () => {
					this.createSnapshot('Manual Backup');
				});
			}

			if (this.els.btnHistory) {
				this.els.btnHistory.addEventListener('click', () => {
					this.toggleHistoryModal(true);
				});
			}

			if (this.els.btnCloseModal) {
				this.els.btnCloseModal.addEventListener('click', () => {
					this.toggleHistoryModal(false);
				});
			}

			if (this.els.btnCreateSnapshot) {
				this.els.btnCreateSnapshot.addEventListener('click', () => {
					this.createSnapshot('User Snapshot');
				});
			}

			if (this.els.btnReset) {
				this.els.btnReset.addEventListener('click', () => {
					if (confirm('WARNING: This will reset MetaOS to factory settings. All data will be lost (a backup will be created). Continue?')) {
						document.dispatchEvent(new CustomEvent('system-reset'));
					}
				});
			}
		}

		toggleHistoryModal(show) {
			if (!this.els.historyModal) return;
			if (show) {
				this.els.historyModal.classList.remove('hidden');
				document.dispatchEvent(new CustomEvent('request-snapshot-list'));
			} else {
				this.els.historyModal.classList.add('hidden');
			}
		}

		renderSnapshotList(snapshots) {
			if (!this.els.snapshotList) return;
			this.els.snapshotList.innerHTML = '';

			if (snapshots.length === 0) {
				this.els.snapshotList.innerHTML = '<div class="text-center text-gray-500 text-xs py-4">No snapshots available.</div>';
				return;
			}

			snapshots.forEach(snap => {
				const date = new Date(snap.timestamp).toLocaleString();
				const div = document.createElement('div');
				div.className = 'flex justify-between items-center bg-gray-700 p-2 rounded text-xs border border-gray-600';
				div.innerHTML = `
                    <div>
                        <div class="font-bold text-gray-200">${snap.label || 'Snapshot'}</div>
                        <div class="text-gray-400">${date}</div>
                    </div>
                    <div class="flex gap-2">
                         <button class="btn-restore text-blue-400 hover:text-blue-300 underline" data-id="${snap.id}">Restore</button>
                         <button class="btn-delete text-red-400 hover:text-red-300" data-id="${snap.id}">×</button>
                    </div>
                `;
				this.els.snapshotList.appendChild(div);
			});

			// Bind restore/delete buttons
			this.els.snapshotList.querySelectorAll('.btn-restore').forEach(btn => {
				btn.addEventListener('click', (e) => {
					const id = e.target.getAttribute('data-id');
					if (confirm('Restore this snapshot? Current state will be lost unless backed up.')) {
						document.dispatchEvent(new CustomEvent('restore-snapshot', {
							detail: {
								id
							}
						}));
						this.toggleHistoryModal(false);
					}
				});
			});

			this.els.snapshotList.querySelectorAll('.btn-delete').forEach(btn => {
				btn.addEventListener('click', (e) => {
					const id = e.target.getAttribute('data-id');
					if (confirm('Delete this snapshot?')) {
						document.dispatchEvent(new CustomEvent('delete-snapshot', {
							detail: {
								id
							}
						}));
					}
				});
			});
		}

		createSnapshot(label) {
			const name = prompt("Snapshot Label:", label);
			if (name) {
				document.dispatchEvent(new CustomEvent('create-snapshot', {
					detail: {
						label: name
					}
				}));
			}
		}

		async refreshPreview(entryPath = 'index.html') {
			if (!this.els.previewLoader || !this.els.previewFrame) return;
			this.els.previewLoader.classList.remove('hidden');

			const loadPromise = new Promise(resolve => {
				const handler = () => {
					this.els.previewFrame.removeEventListener('load', handler);
					resolve();
				};
				this.els.previewFrame.addEventListener('load', handler);
			});

			try {
				const url = await this.compiler.compile(this.vfs, entryPath);
				if (url) {
					this.els.previewFrame.src = url;
					await Promise.race([loadPromise, new Promise(r => setTimeout(r, 5000))]);
				} else {
					this.els.previewFrame.srcdoc = '<div style="color:#888;padding:20px">No index.html found</div>';
				}
			} catch (e) {
				console.error("Preview Error", e);
			} finally {
				setTimeout(() => this.els.previewLoader.classList.add('hidden'), 200);
			}
		}

		setSaveStatus(state) {
			const el = this.els.saveStatus;
			if (!el) return;
			if (state === 'saving') {
				el.textContent = 'Saving...';
				el.className = 'text-[10px] text-yellow-500 italic mr-2 self-center transition opacity-100';
			} else if (state === 'saved') {
				el.textContent = 'Saved';
				el.className = 'text-[10px] text-green-500 italic mr-2 self-center transition opacity-100';
				setTimeout(() => el.classList.add('opacity-0'), 2000);
			} else el.classList.add('opacity-0');
		}

		captureScreenshot() {
			return new Promise((resolve, reject) => {
				const iframe = this.els.previewFrame;
				if (!iframe || !iframe.contentWindow) return reject(new Error("No preview frame"));

				const handler = (e) => {
					if (e.data.type === 'SCREENSHOT_RESULT') {
						window.removeEventListener('message', handler);
						// data:image/png;base64,... -> extract data
						const parts = e.data.data.split(',');
						resolve(parts.length > 1 ? parts[1] : parts[0]);
					} else if (e.data.type === 'SCREENSHOT_ERROR') {
						window.removeEventListener('message', handler);
						reject(new Error(e.data.message));
					}
				};
				window.addEventListener('message', handler);

				setTimeout(() => {
					window.removeEventListener('message', handler);
					reject(new Error("Screenshot timeout"));
				}, 15000);

				iframe.contentWindow.postMessage({
					action: 'CAPTURE'
				}, '*');
			});
		}
	}

	global.App.UI.UIController = UIController;

})(window);