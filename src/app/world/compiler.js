
(function(global) {
	global.App = global.App || {};
	global.App.World = global.App.World || {};

	class Compiler {
		constructor() {
			this.blobUrls = [];
		}

		/**
		 * VFSの状態からプレビュー用のエントリーポイントURLを生成
		 * @param {VirtualFileSystem} vfs 
		 * @returns {Promise<string|null>} index.htmlのBlob URL
		 */
		async compile(vfs, entryPath = 'index.html') {
			this.revokeAll(); // メモリリーク防止

			const filePaths = vfs.listFiles();
			const urlMap = {};

			// 1. Assets (HTML以外) のBlob化
			for (const path of filePaths) {
				if (path.endsWith('.html')) continue;
				if (path.startsWith('.sample/')) continue;
                if (path.startsWith('src/')) continue; // ホストコードは除外（VFSにホストコードが含まれる場合）

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

			// 2. HTML の処理 (リンク解決 & スクリプト注入)
			let entryPointUrl = null;

			for (const path of filePaths) {
				if (!path.endsWith('.html')) continue;
				if (path.startsWith('.sample/')) continue;

				let htmlContent = vfs.readFile(path);
				htmlContent = this.processHtmlReferences(htmlContent, urlMap);
                
                // ★ MetaOS Bridge Injection
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

			// 指定されたエントリポイントが見つからない場合のフォールバック
			if (!entryPointUrl) {
                // index.htmlを探す
                if (urlMap['index.html']) {
                    entryPointUrl = urlMap['index.html'];
                } else {
                    // それもなければ最初のHTML
				    const firstHtml = filePaths.find(p => p.endsWith('.html') && !p.startsWith('.sample/'));
				    if (firstHtml) entryPointUrl = urlMap[firstHtml];
                }
			}

			return entryPointUrl;
		}

		processHtmlReferences(html, urlMap) {
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			const replaceAttr = (selector, attr) => {
				doc.querySelectorAll(selector).forEach(el => {
					const val = el.getAttribute(attr);
					if (urlMap[val]) el.setAttribute(attr, urlMap[val]);
				});
			};

			replaceAttr('script[src]', 'src');
			replaceAttr('link[href]', 'href');
			replaceAttr('img[src]', 'src');
			replaceAttr('a[href]', 'href');

			return doc.documentElement.outerHTML;
		}

        injectMetaOSBridge(html) {
            // MetaOS Client Bridge Code (Minified/Inline)
            const script = `
<script>
(function(global) {
    const REQUESTS = new Map();
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data) return;

        // Handle Responses
        if (data.type === 'METAOS_RESPONSE') {
            const { requestId, result, error } = data;
            if (REQUESTS.has(requestId)) {
                const { resolve, reject } = REQUESTS.get(requestId);
                REQUESTS.delete(requestId);
                if (error) reject(new Error(error));
                else resolve(result);
            }
        }
        
        // Handle Events from Host
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
        listFiles: (path) => post('list_files', { path }),
        deleteFile: (path) => post('delete_file', { path }),
        notify: (message, title) => post('show_notification', { message, title }),
        copyToClipboard: (text) => post('copy_to_clipboard', { text }),
        openExternal: (url) => post('open_external', { url }),
        ask: (text, attachments) => post('ask_ai', { text, attachments }),
        ready: () => post('view_ready', {}),
        on: (event, callback) => window.addEventListener('metaos:' + event, (e) => callback(e.detail))
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
