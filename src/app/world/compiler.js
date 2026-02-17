// src/app/world/compiler.js

(function(global) {
	global.App = global.App || {};
	global.App.World = global.App.World || {};

	class Compiler {
		constructor() {
			this.blobUrls = [];
		}

		async compile(vfs, entryPath = 'index.html') {
			this.revokeAll();

			const filePaths = vfs.listFiles();
			const urlMap = {};

			for (const path of filePaths) {
				if (path.endsWith('.html')) continue;
				if (path.startsWith('.sample/')) continue;
				if (path.startsWith('src/')) continue;

				const content = vfs.readFile(path);
				const mimeType = this.getMimeType(path);

				let blob;
				if (mimeType.startsWith('image/') && content.startsWith('data:')) {
					const res = await fetch(content);
					blob = await res.blob();
				} else {
					blob = new Blob([content], {
						type: mimeType
					});
				}

				const url = URL.createObjectURL(blob);
				urlMap[path] = url;
				this.blobUrls.push(url);
			}

			let entryPointUrl = null;

			for (const path of filePaths) {
				if (!path.endsWith('.html')) continue;
				if (path.startsWith('.sample/')) continue;

				let htmlContent = vfs.readFile(path);
				htmlContent = this.processHtmlReferences(htmlContent, urlMap, path);
				htmlContent = this.injectMetaOSBridge(htmlContent);
				htmlContent = this.injectScreenshotHelper(htmlContent);

				const blob = new Blob([htmlContent], {
					type: 'text/html'
				});
				const url = URL.createObjectURL(blob);

				urlMap[path] = url;
				this.blobUrls.push(url);

				if (path === entryPath) {
					entryPointUrl = url;
				}
			}

			if (!entryPointUrl) {
				if (urlMap['index.html']) {
					entryPointUrl = urlMap['index.html'];
				} else {
					const firstHtml = filePaths.find(p => p.endsWith('.html') && !p.startsWith('.sample/'));
					if (firstHtml) entryPointUrl = urlMap[firstHtml];
				}
			}

			return entryPointUrl;
		}

		processHtmlReferences(html, urlMap, currentFilePath) {
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			const currentDir = currentFilePath.includes('/') ? currentFilePath.substring(0, currentFilePath.lastIndexOf('/')) : '';

			const resolvePath = (relPath) => {
				if (relPath.startsWith('/')) return relPath.substring(1);
				if (relPath.match(/^https?:\/\//)) return null;
				const stack = currentDir ? currentDir.split('/') : [];
				const parts = relPath.split('/');
				for (const part of parts) {
					if (part === '.') continue;
					if (part === '..') {
						if (stack.length > 0) stack.pop();
					} else {
						stack.push(part);
					}
				}
				return stack.join('/');
			};

			const replaceAttr = (selector, attr) => {
				doc.querySelectorAll(selector).forEach(el => {
					const val = el.getAttribute(attr);
					if (!val) return;
					if (urlMap[val]) {
						el.setAttribute(attr, urlMap[val]);
						return;
					}
					const resolved = resolvePath(val);
					if (resolved && urlMap[resolved]) {
						el.setAttribute(attr, urlMap[resolved]);
					}
				});
			};

			replaceAttr('script[src]', 'src');
			replaceAttr('link[href]', 'href');
			replaceAttr('img[src]', 'src');
			replaceAttr('a[href]', 'href');

			return doc.documentElement.outerHTML;
		}

		injectMetaOSBridge(html) {
			// ★ 修正: 注入スクリプトに新API (stat, listFiles options) を追加
			const script = `
<script>
(function(global) {
    const REQUESTS = new Map();
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data) return;
        if (data.type === 'METAOS_RESPONSE') {
            const { requestId, result, error } = data;
            if (REQUESTS.has(requestId)) {
                const { resolve, reject } = REQUESTS.get(requestId);
                REQUESTS.delete(requestId);
                if (error) reject(new Error(error));
                else resolve(result);
            }
        }
        if (data.type === 'METAOS_EVENT') {
            const evt = new CustomEvent('metaos:' + data.event, { detail: data.payload });
            window.dispatchEvent(evt);
        }
    });
    function post(action, payload = {}) {
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).substring(7);
            REQUESTS.set(requestId, { resolve, reject });
            window.parent.postMessage({ type: 'METAOS_ACTION', requestId, action, payload }, '*');
            setTimeout(() => {
                if (REQUESTS.has(requestId)) {
                    REQUESTS.delete(requestId);
                    reject(new Error("MetaOS API Timeout: " + action));
                }
            }, 10000);
        });
    }
    global.MetaOS = {
        switchView: (path) => post('switch_view', { path }),
        saveFile: (path, content) => post('save_file', { path, content }),
        readFile: (path) => post('read_file', { path }),
        
        // ★ UPDATED: オプション引数を追加
        listFiles: (path, options) => post('list_files', { path, options }),
        
        // ★ ADDED: stat API
        stat: (path) => post('stat_file', { path }),
        
        deleteFile: (path) => post('delete_file', { path }),
        notify: (message, title) => post('show_notification', { message, title }),
        copyToClipboard: (text) => post('copy_to_clipboard', { text }),
        openExternal: (url) => post('open_external', { url }),
        ask: (text, attachments) => post('agent_trigger', { instruction: text, options: { attachments } }),
        agent: (instruction, options) => post('agent_trigger', { instruction, options }),
        ready: () => post('view_ready', {}),
        on: (event, callback) => window.addEventListener('metaos:' + event, (e) => callback(e.detail)),
        renameFile: (oldPath, newPath) => post('rename_file', { oldPath, newPath }),
        openFile: (path) => post('open_file', { path })
    };
    console.log("MetaOS Bridge Injected");
})(window);
</script>
`;
			if (html.includes('<head>')) {
				return html.replace('<head>', '<head>' + script);
			} else {
				return script + html;
			}
		}

		injectScreenshotHelper(html) {
			const script = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js"></script>
<script>
window.addEventListener('message', async (e) => {
    if (e.data.action === 'CAPTURE') {
        try {
            let attempts = 0;
            while (typeof htmlToImage === 'undefined' && attempts < 20) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }
            if (typeof htmlToImage === 'undefined') throw new Error('html-to-image failed to load');
            const data = await htmlToImage.toPng(document.body, { 
                backgroundColor: null, skipOnError: true, preferredFontFormat: 'woff2',
                filter: (node) => {
                    if (node.tagName === 'IMG' && (!node.src || node.src === '' || node.src === window.location.href)) return false;
                    return true;
                }
            });
            parent.postMessage({ type: 'SCREENSHOT_RESULT', data }, '*');
        } catch (err) {
            parent.postMessage({ type: 'SCREENSHOT_ERROR', message: String(err) }, '*');
        }
    }
});
</script>`;
			if (html.includes('</body>')) {
				return html.replace('</body>', `${script}</body>`);
			} else {
				return html + script;
			}
		}

		getMimeType(filename) {
			if (filename.endsWith('.js')) return 'application/javascript';
			if (filename.endsWith('.css')) return 'text/css';
			if (filename.endsWith('.json')) return 'application/json';
			if (filename.endsWith('.svg')) return 'image/svg+xml';
			if (filename.endsWith('.png')) return 'image/png';
			if (filename.endsWith('.jpg')) return 'image/jpeg';
			if (filename.endsWith('.html')) return 'text/html';
			return 'text/plain';
		}

		revokeAll() {
			this.blobUrls.forEach(url => URL.revokeObjectURL(url));
			this.blobUrls = [];
		}
	}

	global.App.World.Compiler = Compiler;

})(window);