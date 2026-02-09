
(function(global) {
	global.App = global.App || {};
	global.App.Adapters = global.App.Adapters || {};
	class GeminiAdapter extends global.REAL.LLMAdapter {
		constructor(apiKey, modelName) { super(); this.apiKey = apiKey; this.modelName = modelName; this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models"; }
		async generateStream(messages, onChunk, signal) {
			const url = `${this.baseUrl}/${this.modelName}:streamGenerateContent?key=${this.apiKey}`;
			const generationConfig = (typeof CONFIG !== 'undefined' && CONFIG.GENERATION_CONFIG) ? CONFIG.GENERATION_CONFIG : { temperature: 1.0, maxOutputTokens: 65536 };
			const payload = { contents: messages, generationConfig: generationConfig };
			const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
			if (!response.ok) { const errText = await response.text(); throw new Error(`Gemini API Error: ${response.status} - ${errText}`); }
			const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
			try {
				while (true) {
					const { done, value } = await reader.read(); if (done) break;
					buffer += decoder.decode(value, { stream: true });
					while (true) {
						const textKeyIdx = buffer.indexOf('"text"'); if (textKeyIdx === -1) break;
						let startQuote = -1; for (let i = textKeyIdx + 6; i < buffer.length; i++) { if (buffer[i] === '"') { startQuote = i; break; } }
						if (startQuote === -1) break;
						let endQuote = -1; let escaped = false;
						for (let i = startQuote + 1; i < buffer.length; i++) {
							const char = buffer[i]; if (escaped) { escaped = false; continue; }
							if (char === '\\') { escaped = true; continue; } if (char === '"') { endQuote = i; break; }
						}
						if (endQuote === -1) break;
						const rawText = buffer.substring(startQuote + 1, endQuote);
						try { const text = JSON.parse(`"${rawText}"`); if (text) onChunk(text); } catch (e) { console.warn("Stream Text Parse Error:", e); }
						buffer = buffer.substring(endQuote + 1);
					}
				}
			} catch (e) { if (e.name === 'AbortError') throw e; console.error("Stream Reading Error:", e); throw e; }
		}
	}
	global.App.Adapters.GeminiAdapter = GeminiAdapter;
})(window);
