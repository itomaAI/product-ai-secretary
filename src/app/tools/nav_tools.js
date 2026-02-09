
(function(global) {
	global.App = global.App || {}; global.App.Tools = global.App.Tools || {};
	global.App.Tools.registerNavTools = function(registry, vfs) {
		registry.register('list_files', async (params, state) => {
			const files = vfs.listFiles();
			return { log: `[list_files]\n${files.join('\n')}`, ui: `📂 Listed ${files.length} files` };
		});
		registry.register('delete_file', async (params, state) => { return { log: `[delete_file] ${vfs.deleteFile(params.path)}`, ui: `🗑️ Deleted ${params.path}` }; });
		registry.register('move_file', async (params, state) => { return { log: `[move_file] ${vfs.rename(params.path, params.new_path)}`, ui: `🚚 Moved ${params.path}` }; });
		registry.register('copy_file', async (params, state) => { return { log: `[copy_file] ${vfs.copyFile(params.path, params.new_path)}`, ui: `📄 Copied ${params.path}` }; });
	};
})(window);
