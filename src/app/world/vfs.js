(function(global) {
    global.App = global.App || {};
    global.App.World = global.App.World || {};

    class VirtualFileSystem {
        constructor(initialFiles = {}) {
            // 初期化時にマイグレーションを行う
            this.files = {};
            this.listeners = [];

            // 容量制限設定 (Default: 256MB)
            const configMB = (global.App.Config && global.App.Config.VFS_CAPACITY_MB) ? global.App.Config.VFS_CAPACITY_MB : 256;
            this.MAX_SIZE = configMB * 1024 * 1024;

            this.loadFiles(initialFiles);
        }

        // 内部データを正規化（String -> Object）
        _migrateFile(contentOrObj) {
            const now = Date.now();
            if (typeof contentOrObj === 'string') {
                return {
                    content: contentOrObj,
                    meta: {
                        created_at: now,
                        updated_at: now
                    }
                };
            }
            // 既にオブジェクト構造ならそのまま（不足プロパティがあれば補完）
            if (typeof contentOrObj === 'object' && contentOrObj !== null) {
                return {
                    content: contentOrObj.content || "",
                    meta: {
                        created_at: contentOrObj.meta?.created_at || now,
                        updated_at: contentOrObj.meta?.updated_at || now
                    }
                };
            }
            return {
                content: "",
                meta: {
                    created_at: now,
                    updated_at: now
                }
            };
        }

        _recalculateTotalSize() {
            this._totalSize = 0;
            Object.values(this.files).forEach(file => {
                this._totalSize += file.content.length;
            });
        }

        getUsage() {
            return {
                used: this._totalSize,
                max: this.MAX_SIZE,
                percent: Math.min(100, (this._totalSize / this.MAX_SIZE) * 100),
                isFull: this._totalSize >= this.MAX_SIZE
            };
        }

        subscribe(callback) {
            this.listeners.push(callback);
            return () => this.listeners = this.listeners.filter(cb => cb !== callback);
        }

        notify(path = null, action = null) {
            const usage = this.getUsage();
            this.listeners.forEach(cb => cb(this.files, path, action, usage));
        }

        _norm(path) {
            if (!path) return "";
            return path.replace(/^\/+/, '');
        }

        exists(path) {
            return Object.prototype.hasOwnProperty.call(this.files, this._norm(path));
        }

        isDirectory(path) {
            let p = this._norm(path);
            if (!p) return true;
            if (!p.endsWith('/')) p += '/';
            return Object.keys(this.files).some(key => key.startsWith(p));
        }

        loadFiles(newFiles) {
            this.files = {};
            Object.entries(newFiles).forEach(([path, data]) => {
                this.files[path] = this._migrateFile(data);
            });
            this._recalculateTotalSize();
            this.notify();
        }

        // コンテンツのみを返す（互換性維持）
        readFile(path) {
            const p = this._norm(path);
            if (!this.exists(p)) throw new Error(`File not found: ${p}`);
            return this.files[p].content;
        }

        // メタデータを返す（新規メソッド）
        stat(path) {
            const p = this._norm(path);
            if (!this.exists(p)) throw new Error(`File not found: ${p}`);
            const file = this.files[p];
            return {
                path: p,
                size: file.content.length,
                created_at: file.meta.created_at,
                updated_at: file.meta.updated_at,
                type: 'file' // 将来的にディレクトリ対応など拡張可
            };
        }

        writeFile(path, content) {
            let p = this._norm(path);
            if (!p) throw new Error("Cannot write to root path.");
            if (p.includes('..')) throw new Error("Invalid path");

            const now = Date.now();
            const newSize = content.length;
            const exists = this.exists(p);
            const oldSize = exists ? this.files[p].content.length : 0;
            const delta = newSize - oldSize;

            if (this._totalSize + delta > this.MAX_SIZE) {
                throw new Error(`Storage Quota Exceeded. Cannot write ${p} (${(newSize/1024).toFixed(1)}KB). Limit: ${this.MAX_SIZE/1024/1024}MB.`);
            }

            if (exists) {
                // 更新: created_at維持、updated_at更新
                this.files[p].content = content;
                this.files[p].meta.updated_at = now;
            } else {
                // 新規作成
                this.files[p] = {
                    content: content,
                    meta: {
                        created_at: now,
                        updated_at: now
                    }
                };
            }

            this._totalSize += delta;
            this.notify(p, exists ? 'modify' : 'create');
            return exists ? `Overwrote ${p} (${content.length} chars)` : `Created ${p} (${content.length} chars)`;
        }

        createDirectory(path) {
            let p = this._norm(path);
            if (p.endsWith('/')) p = p.slice(0, -1);
            if (!p) return "Root directory always exists.";
            const keepFile = `${p}/.keep`;

            if (!this.exists(keepFile)) {
                try {
                    this.writeFile(keepFile, "");
                    return `Created directory: ${p}`;
                } catch (e) {
                    throw e;
                }
            }
            return `Directory already exists: ${p}`;
        }

        deleteFile(path) {
            const p = this._norm(path);
            if (this.exists(p)) {
                const size = this.files[p].content.length;
                delete this.files[p];
                this._totalSize -= size;
                this.notify(p, 'delete');
                return `Deleted file: ${p}`;
            }
            return this.deleteDirectory(p);
        }

        deleteDirectory(path) {
            let p = this._norm(path);
            if (!p.endsWith('/')) p += '/';
            const keysToDelete = Object.keys(this.files).filter(k => k.startsWith(p));

            if (keysToDelete.length === 0) return `Path ${p} not found or empty.`;

            let deletedSize = 0;
            keysToDelete.forEach(k => {
                deletedSize += this.files[k].content.length;
                delete this.files[k];
            });
            this._totalSize -= deletedSize;

            this.notify();
            return `Deleted directory ${p} (removed ${keysToDelete.length} files).`;
        }

        rename(oldPath, newPath) {
            const oldP = this._norm(oldPath);
            const newP = this._norm(newPath);

            if (this.exists(oldP)) {
                if (this.exists(newP)) throw new Error(`Destination ${newP} already exists.`);
                this.files[newP] = this.files[oldP];
                delete this.files[oldP];
                
                this.notify();
                return `Renamed file: ${oldP} -> ${newP}`;
            }

            let oldDir = oldP.endsWith('/') ? oldP : oldP + '/';
            let newDir = newP.endsWith('/') ? newP : newP + '/';
            const targets = Object.keys(this.files).filter(k => k.startsWith(oldDir));

            if (targets.length > 0) {
                const conflict = targets.some(k => this.exists(k.replace(oldDir, newDir)));
                if (conflict) throw new Error(`Destination conflict`);

                targets.forEach(k => {
                    const dest = k.replace(oldDir, newDir);
                    this.files[dest] = this.files[k];
                    delete this.files[k];
                });
                this.notify();
                return `Moved directory: ${oldP} -> ${newP}`;
            }
            throw new Error(`Source path ${oldP} not found.`);
        }

        copyFile(srcPath, destPath) {
            const src = this._norm(srcPath);
            const dest = this._norm(destPath);
            if (!this.exists(src)) throw new Error(`Source ${src} not found.`);
            if (this.exists(dest)) throw new Error(`Destination ${dest} already exists.`);

            const srcFile = this.files[src];
            if (this._totalSize + srcFile.content.length > this.MAX_SIZE) {
                throw new Error(`Storage Quota Exceeded. Cannot copy file.`);
            }

            const now = Date.now();
            this.files[dest] = {
                content: srcFile.content,
                meta: {
                    created_at: now,
                    updated_at: now
                }
            };
            this._totalSize += srcFile.content.length;

            this.notify();
            return `Copied: ${src} -> ${dest}`;
        }

        listFiles(options = {}) {
            const paths = Object.keys(this.files).sort();
            
            if (options.detail) {
                return paths.map(path => {
                    const f = this.files[path];
                    return {
                        path: path,
                        size: f.content.length,
                        created_at: f.meta.created_at,
                        updated_at: f.meta.updated_at,
                        type: 'file'
                    };
                });
            }
            
            return paths;
        }

        getTree() {
            const root = {
                name: "root",
                path: "",
                type: "folder",
                children: {}
            };
            Object.keys(this.files).sort().forEach(filePath => {
                const parts = filePath.split('/');
                let current = root;
                parts.forEach((part, index) => {
                    const isLast = index === parts.length - 1;
                    const fullPath = parts.slice(0, index + 1).join('/');
                    if (!current.children[part]) {
                        // ファイルの場合、メタデータを取得
                        let meta = null;
                        if (isLast && this.files[fullPath]) {
                             const f = this.files[fullPath];
                             meta = {
                                 size: f.content.length,
                                 updated_at: f.meta.updated_at
                             };
                        }

                        current.children[part] = {
                            name: part,
                            path: fullPath,
                            type: isLast ? "file" : "folder",
                            children: {},
                            meta: meta // ★ メタデータを追加
                        };
                    }
                    current = current.children[part];
                    if (!isLast && current.type === "file") current.type = "folder";
                });
            });
            const toArray = (node) => {
                const children = Object.values(node.children).map(child => toArray(child));
                children.sort((a, b) => (a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name)));
                return {
                    name: node.name,
                    path: node.path,
                    type: node.type,
                    children: children,
                    meta: node.meta // ★
                };
            };
            return toArray(root).children;
        }

        replaceContent(path, patternStr, replacement) {
            const p = this._norm(path);
            if (!this.exists(p)) throw new Error(`File not found: ${p}`);

            const content = this.files[p].content;
            let regex;
            try {
                regex = new RegExp(patternStr, 'm');
            } catch (e) {
                throw new Error(`Invalid RegExp: ${e.message}`);
            }

            if (!regex.test(content)) {
                const snippet = patternStr.length > 50 ? patternStr.slice(0, 50) + "..." : patternStr;
                throw new Error(`Pattern not found in ${p}. Search: "${snippet}"`);
            }

            const newContent = content.replace(regex, replacement);
            if (newContent === content) throw new Error(`Pattern matched but replacement resulted in no change.`);

            const delta = newContent.length - content.length;
            if (this._totalSize + delta > this.MAX_SIZE) {
                throw new Error(`Storage Quota Exceeded during replacement.`);
            }

            this.files[p].content = newContent;
            this.files[p].meta.updated_at = Date.now();
            this._totalSize += delta;

            this.notify();
            return `Replaced pattern match in ${p}.`;
        }

        editLines(path, startLine, endLine, mode, newContent = "") {
            const p = this._norm(path);
            if (!this.exists(p)) throw new Error(`File not found: ${p}`);

            const content = this.files[p].content;
            let lines = content.split(/\r?\n/);
            let cleanContent = newContent;
            if (cleanContent.startsWith('\n')) cleanContent = cleanContent.substring(1);
            if (cleanContent.endsWith('\n')) cleanContent = cleanContent.substring(0, cleanContent.length - 1);
            const insertLines = cleanContent.split(/\r?\n/);

            const sLine = parseInt(startLine);
            const sIdx = Math.max(0, sLine - 1);
            const eLine = parseInt(endLine);
            let actionLog = "";

            if (mode === 'replace') {
                if (isNaN(eLine)) throw new Error("Attribute 'end' is required for mode='replace'");
                const deleteCount = Math.max(0, eLine - sLine + 1);
                while (lines.length < sIdx) lines.push("");
                lines.splice(sIdx, deleteCount, ...insertLines);
                actionLog = `Replaced lines ${sLine}-${eLine}`;
            } else if (mode === 'insert') {
                while (lines.length < sIdx) lines.push("");
                lines.splice(sIdx, 0, ...insertLines);
                actionLog = `Inserted ${insertLines.length} lines at line ${sLine}`;
            } else if (mode === 'delete') {
                if (isNaN(eLine)) throw new Error("Attribute 'end' is required for mode='delete'");
                const deleteCount = Math.max(0, eLine - sLine + 1);
                if (sIdx < lines.length) lines.splice(sIdx, deleteCount);
                actionLog = `Deleted lines ${sLine}-${eLine}`;
            } else if (mode === 'append') {
                lines.push(...insertLines);
                actionLog = `Appended ${insertLines.length} lines`;
            } else {
                throw new Error(`Unknown edit mode: ${mode}`);
            }

            const finalContent = lines.join('\n');
            const delta = finalContent.length - content.length;

            if (this._totalSize + delta > this.MAX_SIZE) {
                throw new Error(`Storage Quota Exceeded during line edit.`);
            }

            this.files[p].content = finalContent;
            this.files[p].meta.updated_at = Date.now();
            this._totalSize += delta;

            this.notify();
            return `Edited ${p}: ${actionLog}`;
        }
    }
    global.App.World.VirtualFileSystem = VirtualFileSystem;
})(window);