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
			this.events = {};

			this._initElements();

			this.chat = new ChatComponent();
			this.editor = new EditorComponent();
			this.mediaViewer = new MediaViewer();
			this.explorer = new ExplorerComponent(vfs);

			this._bindProjectUI();
			this._wireComponents();
			this._initMetaOSBridge();
			this._bindMobileUI();

			this.vfs.subscribe((files, path, action, usage) => {
				this._updateStorageUI(usage);
				if (path && path.startsWith('data/')) {
					console.log(`[Controller] Data changed: ${path} (${action})`);
					this._notifyMetaOS('file_changed', {
						path,
						action
					});
				}
			});

			this._updateStorageUI(this.vfs.getUsage());
		}

		on(event, callback) {
			this.events[event] = callback;
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
				'btnBackup', 'btnHistory', 'btnReset', 'historyModal', 'btnCloseModal', 'snapshotList', 'btnCreateSnapshot', 'btnDeleteAllSnapshots',
				'sidebar', 'chatPanel', 'mobileOverlay', 'mobileNavFiles', 'mobileNavView', 'mobileNavChat',
				'storageUsageBar', 'storageUsageText'
			]
			.forEach(key => {
				let id = DOM[key];
				if (!id) id = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
				this.els[key] = document.getElementById(id);
			});
		}

		_updateStorageUI(usage) {
			if (!usage || !this.els.storageUsageBar || !this.els.storageUsageText) return;
			const usedMB = (usage.used / 1024 / 1024).toFixed(1);
			const maxMB = (usage.max / 1024 / 1024).toFixed(1);
			this.els.storageUsageText.textContent = `${usedMB} / ${maxMB} MB`;
			const percent = Math.min(100, usage.percent);
			this.els.storageUsageBar.style.width = `${percent}%`;
			this.els.storageUsageBar.className = 'absolute top-0 left-0 h-full transition-all duration-500 ease-out';
			if (percent > 95) {
				this.els.storageUsageBar.classList.add('bg-red-500', 'animate-pulse');
				this.els.storageUsageText.classList.add('text-red-400', 'font-bold');
			} else if (percent > 80) {
				this.els.storageUsageBar.classList.add('bg-yellow-500');
				this.els.storageUsageText.classList.remove('text-red-400', 'font-bold');
			} else {
				this.els.storageUsageBar.classList.add('bg-blue-500');
				this.els.storageUsageText.classList.remove('text-red-400', 'font-bold');
			}
		}

		_wireComponents() {
			this.explorer.on('open_file', (path, content) => {
				const BINARY_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|ico|pdf|zip|tar|gz|7z|rar|mp3|wav|mp4|webm|ogg|woff|woff2|ttf|eot|otf)$/i;
				if (path.match(BINARY_EXTS)) {
					this.editor.close();
					this.mediaViewer.open(path, content);
				} else {
					this.mediaViewer.close();
					this.editor.open(path, content);
				}
				this._closeMobileDrawers();
			});

			this.chat.on('preview_request', (name, base64, mimeType) => {
				this.mediaViewer.open(name, base64, mimeType);
				this._closeMobileDrawers();
			});

			this.explorer.on('history_event', (type, description) => {
				const lpml = `<event type="${type}">\n${description}\n</event>`;
				this.state.appendTurn(global.REAL.Role.SYSTEM, lpml, {
					type: 'event_log'
				});
				this.chat.renderHistory(this.state.getHistory());
			});

			this.editor.on('save', (path, content) => {
				try {
					this.vfs.writeFile(path, content);
					const lpml = `<event type="file_change">\nUser edited file content: ${path}\n</event>`;
					this.state.appendTurn(global.REAL.Role.SYSTEM, lpml, {
						type: 'event_log'
					});
					this.chat.renderHistory(this.state.getHistory());
					this.refreshPreview();
				} catch (e) {
					alert(e.message);
				}
			});
		}

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
							await this.refreshPreview(payload.path);
							this._closeMobileDrawers();
							break;
						case 'save_file':
							this.vfs.writeFile(payload.path, payload.content);
							try {
								this.explorer.render();
							} catch (err) {}
							break;
						case 'read_file':
							result = this.vfs.readFile(payload.path);
							break;
						case 'stat_file': // ★ 追加
							result = this.vfs.stat(payload.path);
							break;
						case 'list_files': {
							const options = payload.options || {};
							const allFiles = this.vfs.listFiles(options);
							
							if (payload.path) {
								const prefix = payload.path;
								if (options.detail) {
									result = allFiles.filter(f => f.path.startsWith(prefix));
								} else {
									result = allFiles.filter(f => f.startsWith(prefix));
								}
							} else {
								result = allFiles;
							}
							break;
						}
						case 'delete_file':
							this.vfs.deleteFile(payload.path);
							try {
								this.explorer.render();
							} catch (err) {}
							break;
						case 'rename_file':
							result = this.vfs.rename(payload.oldPath, payload.newPath);
							try {
								this.explorer.render();
							} catch (err) {}
							break;
						case 'open_file':
							const content = this.vfs.readFile(payload.path);
							this.editor.open(payload.path, content);
							this._closeMobileDrawers();
							break;
						case 'show_notification':
							alert(`${payload.title}\n${payload.message}`);
							break;
						case 'ask_ai':
							const lpml = `<user_input>\n${payload.text}\n</user_input>`;
							this.state.appendTurn(global.REAL.Role.USER, lpml);
							this.chat.renderHistory(this.state.getHistory());
							break;
						case 'agent_trigger':
							if (this.events['ai_request']) {
								this.events['ai_request'](payload.instruction, payload.options);
							}
							break;
						case 'view_ready':
							break;
						default:
							throw new Error(`Unknown action: ${action}`);
					}
				} catch (e) {
					console.error("MetaOS Action Error:", e);
					error = e.message;
				}

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
			if (this.els.btnBackup) {
				this.els.btnBackup.addEventListener('click', () => this.createSnapshot('Manual Backup'));
			}
			if (this.els.btnHistory) {
				this.els.btnHistory.addEventListener('click', () => this.toggleHistoryModal(true));
			}
			if (this.els.btnCloseModal) {
				this.els.btnCloseModal.addEventListener('click', () => this.toggleHistoryModal(false));
			}
			if (this.els.btnCreateSnapshot) {
				this.els.btnCreateSnapshot.addEventListener('click', () => this.createSnapshot('User Snapshot'));
			}
			if (this.els.btnDeleteAllSnapshots) {
				this.els.btnDeleteAllSnapshots.addEventListener('click', () => {
					if (confirm("WARNING: Delete ALL snapshots?")) {
						document.dispatchEvent(new CustomEvent('delete-all-snapshots'));
					}
				});
			}
			if (this.els.btnReset) {
				this.els.btnReset.addEventListener('click', () => {
					if (confirm('WARNING: Reset system?')) {
						document.dispatchEvent(new CustomEvent('system-reset'));
					}
				});
			}
		}

		_bindMobileUI() {
			const {
				sidebar,
				chatPanel,
				mobileOverlay,
				mobileNavFiles,
				mobileNavView,
				mobileNavChat
			} = this.els;
			if (!mobileNavFiles) return;

			const setActive = (target) => {
				[mobileNavFiles, mobileNavView, mobileNavChat].forEach(btn => {
					btn.classList.remove('text-blue-400', 'font-bold', 'bg-gray-700/50');
					btn.classList.add('text-gray-400');
				});
				target.classList.remove('text-gray-400');
				target.classList.add('text-blue-400', 'font-bold', 'bg-gray-700/50');
			};

			const toggleOverlay = (show) => {
				if (show) mobileOverlay.classList.remove('hidden');
				else mobileOverlay.classList.add('hidden');
			};

			mobileNavFiles.addEventListener('click', () => {
				setActive(mobileNavFiles);
				sidebar.classList.remove('-translate-x-full');
				sidebar.classList.add('translate-x-0');
				chatPanel.classList.remove('translate-x-0');
				chatPanel.classList.add('translate-x-full');
				toggleOverlay(true);
			});

			mobileNavView.addEventListener('click', () => {
				this._closeMobileDrawers();
			});

			mobileNavChat.addEventListener('click', () => {
				setActive(mobileNavChat);
				sidebar.classList.remove('translate-x-0');
				sidebar.classList.add('-translate-x-full');
				chatPanel.classList.remove('translate-x-full');
				chatPanel.classList.add('translate-x-0');
				toggleOverlay(true);
			});

			if (mobileOverlay) {
				mobileOverlay.addEventListener('click', () => {
					this._closeMobileDrawers();
				});
			}
		}

		_closeMobileDrawers() {
			const {
				sidebar,
				chatPanel,
				mobileOverlay,
				mobileNavView,
				mobileNavFiles,
				mobileNavChat
			} = this.els;
			if (!sidebar || !chatPanel) return;

			sidebar.classList.remove('translate-x-0');
			sidebar.classList.add('-translate-x-full');
			chatPanel.classList.remove('translate-x-0');
			chatPanel.classList.add('translate-x-full');

			if (mobileOverlay) mobileOverlay.classList.add('hidden');

			if (mobileNavView) {
				[mobileNavFiles, mobileNavView, mobileNavChat].forEach(btn => {
					if (btn) {
						btn.classList.remove('text-blue-400', 'font-bold', 'bg-gray-700/50');
						btn.classList.add('text-gray-400');
					}
				});
				mobileNavView.classList.remove('text-gray-400');
				mobileNavView.classList.add('text-blue-400', 'font-bold', 'bg-gray-700/50');
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
                    <div class="overflow-hidden mr-2">
                        <div class="font-bold text-gray-200 truncate" title="${snap.label || 'Snapshot'}">${snap.label || 'Snapshot'}</div>
                        <div class="text-gray-400 text-[10px]">${date}</div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                         <button class="btn-restore text-blue-400 hover:text-blue-300 underline font-medium" data-id="${snap.id}">Restore</button>
                         <button class="btn-delete text-gray-500 hover:text-red-400" data-id="${snap.id}">✕</button>
                    </div>
                `;
				this.els.snapshotList.appendChild(div);
			});
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
				if (this.els.btnBackup) this.els.btnBackup.classList.add('opacity-50', 'pointer-events-none');
				this.setSaveStatus('saving');
				setTimeout(() => {
					document.dispatchEvent(new CustomEvent('create-snapshot', {
						detail: {
							label: name
						}
					}));
					setTimeout(() => {
						if (this.els.btnBackup) this.els.btnBackup.classList.remove('opacity-50', 'pointer-events-none');
						this.setSaveStatus('saved');
					}, 500);
				}, 50);
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

		captureScreenshot() {
			return new Promise((resolve, reject) => {
				const iframe = this.els.previewFrame;
				if (!iframe || !iframe.contentWindow) return reject(new Error("No preview frame"));
				const handler = (e) => {
					if (e.data.type === 'SCREENSHOT_RESULT') {
						window.removeEventListener('message', handler);
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

		setSaveStatus(state) {
			const el = this.els.saveStatus;
			if (!el) return;
			el.classList.remove('opacity-0');
			if (state === 'saving') {
				el.textContent = 'Saving...';
				el.className = 'text-[10px] text-yellow-500 italic mr-2 self-center transition opacity-100';
			} else if (state === 'saved') {
				el.textContent = 'Saved';
				el.className = 'text-[10px] text-green-500 italic mr-2 self-center transition opacity-100';
				setTimeout(() => el.classList.add('opacity-0'), 2000);
			}
		}
	}

	global.App.UI.UIController = UIController;

})(window);