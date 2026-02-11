(function(global) {
	global.App = global.App || {};
	global.App.Tools = global.App.Tools || {};

	global.App.Tools.registerBasicTools = function(registry) {
		registry.register('get_time', async () => {
			const now = new Date();
			const log = `Current Time: ${now.toLocaleString()}\nISO: ${now.toISOString()}`;
			return {
				log: log
			};
		});
	};
})(window);