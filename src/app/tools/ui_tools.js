(function(global) {
	global.App = global.App || {};
	global.App.Tools = global.App.Tools || {};
	const Signal = global.REAL.Signal;
	global.App.Tools.registerUITools = function(registry, uiController) {
		registry.register('preview', async (params, state) => {
			await uiController.refreshPreview(); // Main uses default args
			return {
				log: `[preview] Refreshed.`,
				ui: `🔄 Preview Refreshed`
			};
		});
		registry.register('take_screenshot', async (params, state) => {
			await new Promise(r => setTimeout(r, 1000));
			try {
				const base64 = await uiController.captureScreenshot();
				return {
					log: `[take_screenshot] Captured.`,
					ui: `📸 Screenshot`,
					image: base64
				};
			} catch (e) {
				return {
					log: `[take_screenshot] Failed: ${e.message}`,
					ui: `⚠️ Screenshot Failed`
				};
			}
		});
		registry.register('switch_view', async (params, state) => {
			const path = params.path || 'index.html';
			await uiController.refreshPreview(path);
			return {
				log: `[switch_view] Switched to ${path}`,
				ui: `Navigate: ${path}`
			};
		});
		registry.register('ask', async (params, state) => {
			return {
				log: `[ask] Displayed to user.`,
				ui: `❓ ${params.content}`,
				signal: Signal.HALT
			};
		}, Signal.HALT);
		registry.register('finish', async (params, state) => {
			return {
				log: `[finish] Completed.`,
				ui: `✅ Task Completed`,
				signal: Signal.TERMINATE
			};
		}, Signal.TERMINATE);
		registry.register('report', async (params, state) => {
			return {
				log: `[report] Displayed to user.`,
				ui: `📢 ${params.content}`,
				signal: Signal.CONTINUE
			};
		});
		registry.register('thinking', async () => null);
		registry.register('plan', async () => null);
	};
})(window);