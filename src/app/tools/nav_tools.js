(function(global) {
	global.App = global.App || {};
	global.App.Tools = global.App.Tools || {};
	global.App.Tools.registerNavTools = function(registry, vfs) {
		registry.register('list_files', async (params, state) => {
			const allFiles = vfs.listFiles();
			let dir = params.path || '';
			if (dir === '.' || dir === './') dir = '';
			else if (dir.length > 0 && !dir.endsWith('/')) dir += '/';

			const isRecursive = params.recursive === 'true';

			let result = [];
			if (isRecursive) {
				result = allFiles.filter(f => f.startsWith(dir));
			} else {
				const entries = new Set();
				allFiles.forEach(f => {
					if (f.startsWith(dir)) {
						const rel = f.substring(dir.length);
						if (!rel) return; // Exact match to dir (shouldn't happen with file paths usually)
						const parts = rel.split('/');
						if (parts.length === 1) entries.add(parts[0]); // File
						else entries.add(parts[0] + '/'); // Directory
					}
				});
				result = Array.from(entries).sort().map(e => dir + e);
			}
			return {
				log: `[list_files] path="${dir || './'}" recursive=${isRecursive}\n${result.join('\n')}`,
				ui: `📂 Listed ${result.length} items`
			};
		});
		registry.register('delete_file', async (params, state) => {
			return {
				log: `[delete_file] ${vfs.deleteFile(params.path)}`,
				ui: `🗑️ Deleted ${params.path}`
			};
		});
		registry.register('move_file', async (params, state) => {
			return {
				log: `[move_file] ${vfs.rename(params.path, params.new_path)}`,
				ui: `🚚 Moved ${params.path}`
			};
		});
		registry.register('copy_file', async (params, state) => {
			return {
				log: `[copy_file] ${vfs.copyFile(params.path, params.new_path)}`,
				ui: `📄 Copied ${params.path}`
			};
		});
	};
})(window);