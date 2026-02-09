
(function(global) {
	global.App = global.App || {}; global.App.UI = global.App.UI || {};
	const DOM = global.App.UI.DOM; const TreeView = global.App.UI.TreeView;
	class ExplorerComponent {
		constructor(vfs) {
			this.vfs = vfs; this.events = {}; this.currentContextUploadPath = "";
			this.treeView = new TreeView(DOM.fileExplorer, DOM.contextMenu); this.sidebar = document.getElementById(DOM.sidebar); this.resizer = document.getElementById(DOM.explorerResizer);
			this.contextUploadInput = document.getElementById(DOM.contextUploadInput); this.folderInput = document.getElementById(DOM.folderUpload); this.filesInput = document.getElementById(DOM.filesUpload);
			this.btnOpenFolder = document.getElementById(DOM.btnOpenFolder); this.projectOpenInput = document.getElementById(DOM.projectOpenInput); this.previewFrame = document.getElementById(DOM.previewFrame);
			this._bindVFS(); this._bindTreeEvents(); this._bindUploads(); this._initResizer();
		}
		on(event, callback) { this.events[event] = callback; }
		_bindVFS() { this.vfs.subscribe(() => { this.treeView.render(this.vfs.getTree()); }); this.treeView.render(this.vfs.getTree()); }
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
			this.treeView.on('delete', (path) => { this._emitHistoryEvent('file_deleted', `User action: ${this.vfs.deleteFile(path)}`); });
			this.treeView.on('upload_request', (path) => { this.currentContextUploadPath = path; if (this.contextUploadInput) { this.contextUploadInput.value = ""; this.contextUploadInput.click(); } });
		}
		_bindUploads() {
			if (this.folderInput) this.folderInput.onchange = (e) => this._handleUploadAppend(e, true, "");
			if (this.filesInput) this.filesInput.onchange = (e) => this._handleUploadAppend(e, false, "");
			if (this.contextUploadInput) { this.contextUploadInput.onchange = (e) => { this._handleUploadAppend(e, false, this.currentContextUploadPath); this.currentContextUploadPath = ""; }; }
			if (this.btnOpenFolder && this.projectOpenInput) {
				this.btnOpenFolder.onclick = () => { this.projectOpenInput.value = ""; this.projectOpenInput.click(); };
				this.projectOpenInput.onchange = async (e) => {
					const files = Array.from(e.target.files); if (files.length === 0) return;
					if (!confirm(`Warning: This will DELETE all current files and replace them with the contents of "${files[0].webkitRelativePath.split('/')[0]}".\n\nContinue?`)) { e.target.value = ""; return; }
					Object.keys(this.vfs.files).forEach(k => delete this.vfs.files[k]);
					const uploadedPaths = [];
					for (const file of files) {
						let relPath = file.webkitRelativePath.split('/').slice(1).join('/') || file.name;
						if (relPath.startsWith('.git/') || relPath.includes('/.git/') || relPath === '.DS_Store') continue;
						let content = this._isBinary(file) ? await this._fileToBase64(file) : await file.text();
						this.vfs.files[relPath.replace(/^\/+/, '')] = content; uploadedPaths.push(relPath);
					}
					this.vfs.notify(); this._emitHistoryEvent('project_imported', `User opened folder. Imported ${uploadedPaths.length} files.`); e.target.value = "";
				};
			}
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
		_isBinary(file) { return file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|bmp|pdf|woff|woff2|ttf|eot)$/i); }
		_fileToBase64(file) { return new Promise((r, j) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => r(reader.result); reader.onerror = j; }); }
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
