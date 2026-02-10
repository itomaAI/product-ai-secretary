
// src/app/world/bridge.js
// MetaOS Client Bridge
// Injected into the iframe to allow communication with the Host (MetaForge)

(function(global) {
    const REQUESTS = new Map();
    
    // Listen for responses from Host
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || data.type !== 'METAOS_RESPONSE') return;
        
        const { requestId, result, error } = data;
        if (REQUESTS.has(requestId)) {
            const { resolve, reject } = REQUESTS.get(requestId);
            REQUESTS.delete(requestId);
            if (error) reject(new Error(error));
            else resolve(result);
        }
    });

    function post(action, payload = {}) {
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).substring(7);
            REQUESTS.set(requestId, { resolve, reject });
            
            window.parent.postMessage({
                type: 'METAOS_ACTION',
                requestId,
                action,
                payload
            }, '*');

            // Timeout safety (10s)
            setTimeout(() => {
                if (REQUESTS.has(requestId)) {
                    REQUESTS.delete(requestId);
                    reject(new Error(`MetaOS API Timeout: ${action}`));
                }
            }, 10000);
        });
    }

    global.MetaOS = {
        // --- Core ---
        switchView: (path) => post('switch_view', { path }),
        
        // --- File System ---
        saveFile: (path, content) => post('save_file', { path, content }),
        readFile: (path) => post('read_file', { path }),
        listFiles: (path) => post('list_files', { path }),
        deleteFile: (path) => post('delete_file', { path }),
        
        // --- System Integration ---
        notify: (message, title = 'MetaOS') => post('show_notification', { message, title }),
        copyToClipboard: (text) => post('copy_to_clipboard', { text }),
        openExternal: (url) => post('open_external', { url }),
        
        // --- AI Interaction ---
        ask: (text, attachments = []) => post('ask_ai', { text, attachments }),
        
        // --- Host Integration ---
        renameFile: (oldPath, newPath) => post('rename_file', { oldPath, newPath }),
        openFile: (path) => post('open_file', { path }),

        // Utility
        ready: () => post('view_ready', {})
    };

    console.log("MetaOS Bridge Loaded");

})(window);
