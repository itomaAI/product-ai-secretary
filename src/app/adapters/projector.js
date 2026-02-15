// src/app/adapters/projector.js
(function(global) {
	global.App = global.App || {};
	global.App.Adapters = global.App.Adapters || {};
	const Role = global.REAL.Role;
	const TurnType = global.REAL.TurnType;
	class MetaForgeProjector extends global.REAL.ContextProjector {
		constructor(systemPrompt) {
			super();
			this.systemPrompt = systemPrompt;
		}
		createContext(state) {
			this._optimizeHistory(state.history);
			const apiMessages = [];

			// Dynamic Config Loading
			let configPrompt = "";
			try {
				if (state.vfs && state.vfs.exists('system/config.json')) {
					const conf = JSON.parse(state.vfs.readFile('system/config.json'));
					const user = conf.username || "User";
					const agent = conf.secretaryName || "MetaOS";
					configPrompt = `\n\n<persona_config>\nYour Name: ${agent}\nUser Name: ${user}\n</persona_config>`;
				}
			} catch (e) {
				console.warn("Failed to load persona config", e);
			}

			// Current Time Info
			const now = new Date();
			const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			const dayName = days[now.getDay()];
			const timePrompt = `\n\n<system_info>\nCurrent Time: ${now.toLocaleString()} (${dayName})\nTimestamp: ${now.toISOString()}\n</system_info>`;

			apiMessages.push({
				role: 'user',
				parts: [{
					text: this.systemPrompt + configPrompt + timePrompt
				}]
			});
			for (const turn of state.history) {
				const parts = this._convertTurnToParts(turn);
				if (!parts || parts.length === 0) continue;
				let apiRole = 'user';
				if (turn.role === Role.MODEL) apiRole = 'model';
				if (turn.role === Role.SYSTEM) apiRole = 'user';
				apiMessages.push({
					role: apiRole,
					parts: parts
				});
			}
			return apiMessages;
		}
		_convertTurnToParts(turn) {
			if (typeof turn.content === 'string') {
				let text = turn.content;
				if (turn.role === Role.USER) text = `<user_input>\n${text}\n</user_input>`;
				return [{
					text: text
				}];
			}
			if (Array.isArray(turn.content)) {
				if (turn.meta && turn.meta.type === TurnType.TOOL_EXECUTION) {
					const logText = turn.content.map(c => {
						if (c.output && c.output.image) return "";
						if (c.output && c.output.log) return c.output.log;
						return "";
					}).join('\n').trim();
					const parts = [];
					if (logText) parts.push({
						text: `<tool_outputs>\n${logText}\n</tool_outputs>`
					});
					turn.content.forEach(c => {
						if (c.output && c.output.image) {
							parts.push({
								inlineData: {
									mimeType: c.output.mimeType || 'image/png',
									data: c.output.image
								}
							});
						}
					});
					return parts;
				}
				if (turn.role === Role.USER) {
					const parts = [];
					let userInputBuffer = "";

					const flushUserInput = () => {
						if (userInputBuffer.trim()) {
							parts.push({
								text: `<user_input>\n${userInputBuffer.trim()}\n</user_input>`
							});
						}
						userInputBuffer = "";
					};

					for (const item of turn.content) {
						if (item.text) {
							const trimmed = item.text.trim();
							// user_attachment または user_input タグで始まる場合は、
							// すでに構造化されているとみなし、バッファをフラッシュしてそのまま追加する
							if (trimmed.startsWith('<user_attachment') || trimmed.startsWith('<user_input')) {
								flushUserInput();
								parts.push({
									text: item.text
								});
							} else {
								// 通常のテキストはバッファに溜めて、後で <user_input> で囲む
								userInputBuffer += item.text + "\n";
							}
						} else if (item.inlineData) {
							flushUserInput();
							parts.push({
								inlineData: item.inlineData
							});
						}
					}
					flushUserInput();
					return parts;
				}
				return turn.content.map(c => {
					if (c.text) return {
						text: c.text
					};
					if (c.inlineData) return {
						inlineData: c.inlineData
					};
					return null;
				}).filter(Boolean);
			}
			return [];
		}
		_optimizeHistory(history) {
			let foundLatestImage = false;
			for (let i = history.length - 1; i >= 0; i--) {
				const turn = history[i];
				if (!Array.isArray(turn.content)) continue;
				if (turn.meta && turn.meta.type === TurnType.TOOL_EXECUTION) {
					turn.content.forEach(item => {
						if (item.output && item.output.image) {
							if (foundLatestImage) {
								delete item.output.image;
								item.output.log += "\n[System: Old screenshot removed]";
							} else {
								foundLatestImage = true;
							}
						}
					});
				}
			}
		}
	}
	global.App.Adapters.MetaForgeProjector = MetaForgeProjector;
})(window);