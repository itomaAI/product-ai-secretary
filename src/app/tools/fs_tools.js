
(function(global) {
	global.App = global.App || {};
	global.App.Tools = global.App.Tools || {};
	global.App.Tools.registerFSTools = function(registry, vfs) {
		registry.register('read_file', async (params, state) => {
			const isImage = params.path.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|bmp)$/i);
			const content = vfs.readFile(params.path);
			if (isImage) {
				let base64 = content; let mimeType = 'image/png';
				if (content.startsWith('data:')) { const parts = content.split(','); base64 = parts[1]; mimeType = parts[0].match(/:(.*?);/)[1]; }
				else if (params.path.endsWith('.svg')) { base64 = btoa(unescape(encodeURIComponent(content))); mimeType = 'image/svg+xml'; }
				return { log: `[read_file] Read image: ${params.path}`, ui: `🖼️ Read Image ${params.path}`, image: base64, mimeType };
			}
			const lines = content.split(/\r?\n/);
			const showNum = params.line_numbers !== 'false';
			const s = parseInt(params.start || 1);
			const e = parseInt(params.end || 999999);
			const sliced = lines.slice(Math.max(0, s - 1), Math.min(lines.length, e));
			const contentStr = showNum ? sliced.map((l, i) => `${s + i} | ${l}`).join('\n') : sliced.join('\n');
			return { log: `[read_file] ${params.path}:\n${contentStr}`, ui: `📖 Read ${params.path} (${sliced.length} lines)` };
		});
		registry.register('create_file', async (params, state) => {
			const msg = vfs.writeFile(params.path, params.content);
			return { log: `[create_file] ${msg}`, ui: `📝 Created ${params.path}` };
		});
		registry.register('edit_file', async (params, state) => {
			const content = params.content || "";
			const MARKER_SEARCH = "<<<<SEARCH"; const MARKER_DIVIDER = "===="; const MARKER_END = ">>>>";
			if (content.split(MARKER_SEARCH).length > 2) throw new Error("Multiple replacements not allowed.");
			if (content.includes(MARKER_SEARCH)) {
				const searchStart = content.indexOf(MARKER_SEARCH) + MARKER_SEARCH.length;
				const divStart = content.indexOf(MARKER_DIVIDER);
				const divEnd = divStart + MARKER_DIVIDER.length;
				const blockEnd = content.lastIndexOf(MARKER_END);
				let patternStr = content.substring(searchStart, divStart);
				let replaceStr = content.substring(divEnd, blockEnd);
				if (patternStr.startsWith('\n')) patternStr = patternStr.substring(1);
				if (patternStr.endsWith('\n')) patternStr = patternStr.substring(0, patternStr.length - 1);
				if (replaceStr.startsWith('\n')) replaceStr = replaceStr.substring(1);
				if (replaceStr.endsWith('\n')) replaceStr = replaceStr.substring(0, replaceStr.length - 1);
				try { if (vfs.exists(params.path)) { const fileC = vfs.readFile(params.path); if (fileC.includes(patternStr)) patternStr = patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); } } catch (e) {}
				const msg = vfs.replaceContent(params.path, patternStr, replaceStr);
				return { log: `[edit_file] ${msg}`, ui: `✏️ Regex Replace in ${params.path}` };
			}
			if (!params.mode) throw new Error("Attribute 'mode' required.");
			const msg = vfs.editLines(params.path, params.start, params.end, params.mode, content);
			return { log: `[edit_file] ${msg}`, ui: `✏️ ${msg}` };
		});
	};
})(window);
