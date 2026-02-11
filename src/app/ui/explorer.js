(function(global) {
	global.App = global.App || {}; global.App.UI = global.App.UI || {};
	const DOM = global.App.UI.DOM; const TreeView = global.App.UI.TreeView;

	class ExplorerComponent {
		constructor(vfs) {
			this.vfs = vfs; 
            this.events = {}; 
            this.currentContextUploadPath = "";
            
			this.treeView = new TreeView(DOM.fileExplorer, DOM.contextMenu); 
            this.sidebar = document.getElementById(DOM.sidebar); 
            this.resizer = document.getElementById(DOM.explorerResizer);
            
            // Upload Inputs
			this.contextUploadInput = document.getElementById(DOM.contextUploadInput); 
            this.folderInput = document.getElementById(DOM.folderUpload); 
            this.filesInput = document.getElementById(DOM.filesUpload);
            
            // Backup Restore Elements (Modified)
            // Fallback to string IDs if DOM object isn't updated yet
			this.btnImportBackup = document.getElementById(DOM.btnImportBackup || 'btn-import-backup'); 
            this.importBackupInput = document.getElementById(DOM.importBackupInput || 'import-backup-input'); 
            
            this.previewFrame = document.getElementById(DOM.previewFrame);
            
			this._bindVFS(); 
            this._bindTreeEvents(); 
            this._bindUploads(); 
            this._initResizer();
		}

		on(event, callback) { this.events[event] = callback; }

		_bindVFS() { 
            this.vfs.subscribe(() => { this.treeView.render(this.vfs.getTree()); }); 
            this.treeView.render(this.vfs.getTree()); 
        }

		_bindTreeEvents() {
			this.treeView.on('open', (path) => { if (this.events['open_file']) this.events['open_file'](path, this.vfs.readFile(path)); });
			this.treeView.on('create_file', (path) => { this.vfs.writeFile(path, ""); this._emitHistoryEvent('file_created', `User created empty file: ${path}`); if (this.events['open_file']) this.events['open_file'](path, ""); });
			this.treeView.on('create_folder', (path) => { this._emitHistoryEvent('folder_created', this.vfs.createDirectory(path)); });
			this.treeView.on('duplicate', (path) => {
				const dotIndex = path.lastIndexOf('.'); let base = dotIndex !== -1 ? path.substring(0, dotIndex) : path; let ext = dotIndex !== -1 ? path.substring(dotIndex) : "";
				let newPath = `${base}_copy${ext}`; let counter = 1; while (this.vfs.exists(newPath)) { newPath = `${base}_copy${counter}${ext}`; counter++; }
				this._emitHistoryEvent('file_created', `User duplicated file: ${this.vfs.copyFile(path, newPath)}`);
			});
			this.treeView.on('rename', (oldPath, newPath) => { this._emitHistoryEvent('file_moved', `User action: ${this.vfs.rename(oldPath, newPath)}`); });
			this.treeView.on('move', (srcPath, destPath) => { try { this._emitHistoryEvent('file_moved', `User moved file (drag&drop): ${this.vfs.rename(srcPath, destPath)}`); } catch (e) { alert(`Move failed: ${e.message}`); } });
			this.treeView.on('delete', (path) => { this._emitHistoryEvent('file_deleted', `User action: ${this.vfs.deleteFile(path)}`); });
			this.treeView.on('download', (path) => { try { this._downloadFile(path, this.vfs.readFile(path)); } catch (e) { alert(`Download failed: ${e.message}`); } });
			this.treeView.on('upload_request', (path) => { this.currentContextUploadPath = path; if (this.contextUploadInput) { this.contextUploadInput.value = ""; this.contextUploadInput.click(); } });
		}

		_bindUploads() {
            // Standard Uploads
			if (this.folderInput) this.folderInput.onchange = (e) => this._handleUploadAppend(e, true, "");
			if (this.filesInput) this.filesInput.onchange = (e) => this._handleUploadAppend(e, false, "");
			if (this.contextUploadInput) { this.contextUploadInput.onchange = (e) => { this._handleUploadAppend(e, false, this.currentContextUploadPath); this.currentContextUploadPath = ""; }; }
			
            // ★ Backup Restore Logic (Replaced Folder Open)
			if (this.btnImportBackup && this.importBackupInput) {
				this.btnImportBackup.onclick = () => { 
                    this.importBackupInput.value = ""; 
                    this.importBackupInput.click(); 
                };
				this.importBackupInput.onchange = async (e) => {
					const file = e.target.files[0]; 
                    if (!file) return;
                    
					if (!confirm(`CAUTION: This will ERASE all current files and restore from "${file.name}".\n\nContinue?`)) { 
                        e.target.value = ""; return; 
                    }
                    
                    try {
                        // Load ZIP
                        const zip = await JSZip.loadAsync(file);
                        
                        // Clear VFS
                        Object.keys(this.vfs.files).forEach(k => delete this.vfs.files[k]);
                        
                        const restoredPaths = [];
                        const promises = [];

                        zip.forEach((relativePath, zipEntry) => {
                            if (zipEntry.dir) return;
                            // Ignore system files
                            if (relativePath.startsWith('__MACOSX') || relativePath.includes('.DS_Store')) return;

                            promises.push((async () => {
                                // Determine content type
                                const isBinary = this._isBinary({ name: relativePath, type: '' });
                                let content;
                                
                                if (isBinary) {
                                    // Binary: Convert to Data URI with MIME type
                                    const base64 = await zipEntry.async("base64");
                                    const mime = this._guessMimeType(relativePath);
                                    content = `data:${mime};base64,${base64}`;
                                } else {
                                    // Text: Load as string
                                    content = await zipEntry.async("string");
                                }
                                
                                const cleanPath = relativePath.replace(/^\/+/, '');
                                this.vfs.files[cleanPath] = content;
                                restoredPaths.push(cleanPath);
                            })());
                        });

                        await Promise.all(promises);
                        this.vfs.notify();
                        this._emitHistoryEvent('project_imported', `Restored backup: ${file.name} (${restoredPaths.length} files).`);
                        alert(`Restore Complete: ${restoredPaths.length} files loaded.`);

                    } catch (err) {
                        console.error(err);
                        alert(`Restore Failed: ${err.message}`);
                    }
					e.target.value = "";
				};
			}

            // Sidebar Drag & Drop
			if (this.sidebar) {
				['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { this.sidebar.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false); });
				this.sidebar.addEventListener('dragover', (e) => { e.dataTransfer.dropEffect = 'copy'; this.sidebar.classList.add('bg-gray-700'); });
				this.sidebar.addEventListener('dragleave', () => { this.sidebar.classList.remove('bg-gray-700'); });
				this.sidebar.addEventListener('drop', async (e) => {
					this.sidebar.classList.remove('bg-gray-700'); const items = e.dataTransfer.items; if (!items) return;
					const promises = [];
					for (let i = 0; i < items.length; i++) { const item = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null; if (item) promises.push(this._traverseFileTree(item, "")); }
					const fileEntries = (await Promise.all(promises)).flat(); if (fileEntries.length > 0) this._batchWriteFiles(fileEntries);
				});
			}
		}

		_traverseFileTree(item, path) {
			return new Promise((resolve) => {
				path = path || "";
				if (item.isFile) { item.file((file) => { file.fullPath = path + file.name; resolve([file]); }); }
				else if (item.isDirectory) {
					const dirReader = item.createReader(); const entries = [];
					const readEntries = () => {
						dirReader.readEntries(async (results) => {
							if (!results.length) {
								const childPromises = entries.map(entry => this._traverseFileTree(entry, path + item.name + "/"));
								resolve((await Promise.all(childPromises)).flat());
							} else { entries.push(...results); readEntries(); }
						});
					}; readEntries();
				}
			});
		}

		async _batchWriteFiles(files) {
			const uploadedPaths = [];
			for (const file of files) {
				let relPath = (file.fullPath || file.name).replace(/^\/+/, '');
				if (relPath.startsWith('.git/') || relPath.includes('/.git/') || relPath === '.DS_Store') continue;
				try {
					let content = this._isBinary(file) ? await this._fileToBase64(file) : await file.text();
					this.vfs.writeFile(relPath, content); uploadedPaths.push(relPath);
				} catch (err) { console.error(`Failed to import ${relPath}:`, err); }
			}
			if (uploadedPaths.length > 0) this._emitHistoryEvent('file_created', `User dropped files/folders:\n${uploadedPaths.slice(0, 5).join(', ')}${uploadedPaths.length > 5 ? '...' : ''}`);
		}

		async _handleUploadAppend(e, isFolder, targetDir = "") {
			const files = Array.from(e.target.files); const uploadedPaths = [];
			for (const file of files) {
				let relPath = targetDir ? `${targetDir}/${file.name}` : (isFolder && file.webkitRelativePath ? file.webkitRelativePath : file.name);
				relPath = relPath.replace(/^\/+/, '');
				let content = this._isBinary(file) ? await this._fileToBase64(file) : await file.text();
				try { this.vfs.writeFile(relPath, content); uploadedPaths.push(relPath); } catch (err) { console.error(err); }
			}
			if (uploadedPaths.length > 0) this._emitHistoryEvent('file_created', `User uploaded files to "${targetDir || 'root'}":\nFiles: ${uploadedPaths.slice(0, 5).join(', ')}${uploadedPaths.length > 5 ? '...' : ''}`);
			e.target.value = "";
		}

		_isBinary(file) {
			const binaryExts = /\.(png|jpg|jpeg|gif|webp|svg|ico|bmp|pdf|woff|woff2|ttf|eot|otf|zip|tar|gz|7z|rar|mp3|wav|mp4|webm|ogg)$/i;
            if (file.type && (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/') || file.type === 'application/pdf')) return true;
			return !!file.name.match(binaryExts);
		}

        _guessMimeType(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const map = {
                'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml', 'ico': 'image/x-icon',
                'pdf': 'application/pdf',
                'mp3': 'audio/mpeg', 'wav': 'audio/wav',
                'mp4': 'video/mp4', 'webm': 'video/webm',
                'zip': 'application/zip',
                'woff': 'font/woff', 'woff2': 'font/woff2', 'ttf': 'font/ttf', 'otf': 'font/otf'
            };
            return map[ext] || 'application/octet-stream';
        }

		_fileToBase64(file) { return new Promise((r, j) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => r(reader.result); reader.onerror = j; }); }

		_downloadFile(path, content) {
			let blob;
			if (content.startsWith('data:')) {
				const parts = content.split(','); const mime = parts[0].split(':')[1].split(';')[0]; const byteString = atob(parts[1]);
				const ab = new ArrayBuffer(byteString.length); const ia = new Uint8Array(ab);
				for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
				blob = new Blob([ab], { type: mime });
			} else { blob = new Blob([content], { type: 'text/plain' }); }
			const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = path.split('/').pop();
			document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
		}

		_emitHistoryEvent(type, description) { if (this.events['history_event']) this.events['history_event'](type, description); }

		_initResizer() {
			if (!this.resizer || !this.sidebar) return; const overlay = document.getElementById(DOM.resizeOverlay); let isResizing = false;
			const start = (e) => { isResizing = true; document.body.style.cursor = 'col-resize'; this.resizer.classList.add('resizing'); if (overlay) overlay.classList.remove('hidden'); if (this.previewFrame) this.previewFrame.style.pointerEvents = 'none'; e.preventDefault(); };
			const stop = () => { if (!isResizing) return; isResizing = false; document.body.style.cursor = ''; this.resizer.classList.remove('resizing'); if (overlay) overlay.classList.add('hidden'); if (this.previewFrame) this.previewFrame.style.pointerEvents = ''; };
			const move = (e) => { if (!isResizing) return; const newWidth = e.clientX; if (newWidth > 150 && newWidth < 600) this.sidebar.style.width = `${newWidth}px`; };
			this.resizer.addEventListener('mousedown', start); document.addEventListener('mousemove', move); document.addEventListener('mouseup', stop); document.addEventListener('mouseleave', stop);
		}
	}
	global.App.UI.ExplorerComponent = ExplorerComponent;
})(window);