// src/app/main.js

document.addEventListener('DOMContentLoaded', async () => {
	const {
		REAL,
		App
	} = window;
	const {
		Engine,
		WorldState
	} = REAL;
	const {
		Config
	} = App;
	const {
		VirtualFileSystem,
		Compiler,
		StorageManager
	} = App.World;
	const {
		UIController,
		DOM
	} = App.UI;
	const {
		Registry
	} = App.Tools;
	const {
		GeminiAdapter,
		LPMLAdapter,
		MetaForgeProjector
	} = App.Adapters;

	// --- 1. Initialize Infrastructure ---
	const storage = new StorageManager();
	const compiler = new Compiler();
	const parser = new LPMLAdapter();
	const projector = new MetaForgeProjector(Config.SYSTEM_PROMPT);

	// --- 2. Initialize Model (Domain) ---
	const vfs = new VirtualFileSystem({});
	const state = new WorldState(vfs);

	// --- 3. Initialize UI (View & Controllers) ---
	const ui = new UIController(vfs, state, compiler);

	// --- 4. Initialize Tools ---
	const registry = new Registry();
	App.Tools.registerFSTools(registry, vfs);
	App.Tools.registerNavTools(registry, vfs);
	App.Tools.registerUITools(registry, ui);
	if (App.Tools.registerBasicTools) App.Tools.registerBasicTools(registry);
	if (App.Tools.registerSearchTools) App.Tools.registerSearchTools(registry, vfs);

	// --- 5. Initialize Engine (Logic) ---
	let apiKey = localStorage.getItem('metaforge_api_key') || '';
	if (apiKey && document.getElementById(DOM.apiKey)) {
		document.getElementById(DOM.apiKey).value = apiKey;
	}
	if (document.getElementById(DOM.modelStatus)) {
		document.getElementById(DOM.modelStatus).innerText = Config.MODEL_NAME;
	}

	const createLLM = () => new GeminiAdapter(apiKey, Config.MODEL_NAME);
	const engine = new Engine(state, projector, createLLM(), parser, registry);

	const fileToBase64 = (file) => {
		return new Promise((r, j) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => r(reader.result);
			reader.onerror = j;
		});
	};

	// --- System State Logic ---
	let saveDebounceTimer = null;

	const loadSystemData = (payload) => {
		// Use VFS method to ensure size recalculation
		vfs.loadFiles(payload.files);

		state.history = payload.state || [];
		ui.chat.renderHistory(state.getHistory());
		ui.refreshPreview();
	};

	const initializeSystem = async () => {
		try {
			const systemState = await storage.loadSystemState();
			if (systemState) {
				console.log("Restoring system state...");
				loadSystemData(systemState);
			} else {
				console.log("Initializing fresh system...");
				// Use VFS method
				vfs.loadFiles(Config.DEFAULT_FILES);

				ui.refreshPreview();
				await storage.saveSystemState(vfs.files, state.getHistory());
			}
		} catch (e) {
			console.error("System Initialization Failed:", e);
			alert("System Load Error. Starting with defaults.");

			// Fallback with VFS method
			vfs.loadFiles(Config.DEFAULT_FILES);

			ui.refreshPreview();
		}
	};

	const triggerAutoSave = () => {
		if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
		ui.setSaveStatus('saving');
		saveDebounceTimer = setTimeout(async () => {
			await storage.saveSystemState(vfs.files, state.getHistory());
			ui.setSaveStatus('saved');
		}, 1000);
	};

	// --- Event Wiring ---
	engine.on('turn_start', (data) => {
		if (data.role === REAL.Role.MODEL) {
			ui.chat.setProcessing(true);
			ui.chat.startStreaming();
		}
	});
	engine.on('stream_chunk', (chunk) => ui.chat.updateStreaming(chunk));
	engine.on('turn_end', (data) => {
		if (data.role === REAL.Role.MODEL) ui.chat.finalizeStreaming();
		else ui.chat.renderHistory(state.getHistory());
		triggerAutoSave();
	});
	engine.on('loop_stop', (data) => {
		if (ui.chat.currentStreamEl) ui.chat.finalizeStreaming();
		ui.chat.setProcessing(false);
		ui.chat.renderHistory(state.getHistory());
		triggerAutoSave();
		if (data.reason === 'error') alert('Engine Error. See console.');
	});

	vfs.subscribe(() => triggerAutoSave());

	// --- Snapshot Event Listeners ---

	document.addEventListener('create-snapshot', async (e) => {
		const {
			label
		} = e.detail;
		setTimeout(async () => {
			try {
				await storage.createSnapshot(label, vfs.files, state.getHistory());
				const list = await storage.listSnapshots();
				ui.renderSnapshotList(list);
				console.log("Snapshot created");
			} catch (err) {
				console.error(err);
				alert('Failed to create snapshot: ' + err.message);
			}
		}, 50);
	});

	document.addEventListener('request-snapshot-list', async () => {
		const snapshots = await storage.listSnapshots();
		ui.renderSnapshotList(snapshots);
	});

	document.addEventListener('restore-snapshot', async (e) => {
		const {
			id
		} = e.detail;
		try {
			const snapshot = await storage.getSnapshot(id);
			if (snapshot) {
				loadSystemData({
					files: snapshot.files,
					state: snapshot.state
				});
				triggerAutoSave();
				alert("Restored successfully.");
			}
		} catch (err) {
			console.error(err);
			alert('Failed to restore snapshot.');
		}
	});

	document.addEventListener('delete-snapshot', async (e) => {
		const {
			id
		} = e.detail;
		await storage.deleteSnapshot(id);
		ui.renderSnapshotList(await storage.listSnapshots());
	});

	document.addEventListener('delete-all-snapshots', async () => {
		try {
			await storage.deleteAllSnapshots();
			ui.renderSnapshotList([]);
			alert("All snapshots deleted.");
		} catch (e) {
			console.error(e);
			alert("Failed to delete snapshots.");
		}
	});

	document.addEventListener('system-reset', async () => {
		try {
			await storage.createSnapshot('Pre-Reset Backup', vfs.files, state.getHistory());
		} catch (e) {
			console.error("Backup failed", e);
		}

		// Use VFS method for reset
		vfs.loadFiles(Config.DEFAULT_FILES);

		state.history = [];
		ui.chat.renderHistory([]);
		ui.refreshPreview();
		await storage.saveSystemState(vfs.files, state.getHistory());
		alert('System reset complete.');
	});

	// ★ Agent Interface Listener
	ui.on('ai_request', async (instruction, options = {}) => {
		if (engine.isRunning) return; // Busy

		// Reset option
		if (options.reset) {
			state.history = [];
			ui.chat.renderHistory([]);
		}

		// Context construction
		let text = `[INTERNAL AGENT TRIGGER]\n${instruction}`;
		if (options.context) {
			text += `\n\n[Context Data]\n\`\`\`json\n${JSON.stringify(options.context, null, 2)}\n\`\`\``;
		}

		const content = [{
			text: `<user_input>\n${text}\n</user_input>`
		}];

		// Silent option
		const meta = {
			visible: !options.silent
		};

		engine.llm = createLLM(); // Refresh key just in case
		try {
			await engine.injectUserTurn(content, meta);
		} catch (e) {
			console.error(e);
		}
	});

	ui.chat.on('send', async (text, files) => {
		ui.chat.setProcessing(true);
		const content = [];
		if (text) content.push({
			text
		});
		for (const file of files) {
			if (file.type.startsWith('text/') || file.name.match(/\.(js|py|html|json|css|md|txt)$/)) {
				content.push({
					text: `<user_attachment name="${file.name}">\n${await file.text()}\n</user_attachment>`
				});
			} else {
				content.push({
					inlineData: {
						mimeType: file.type,
						data: (await fileToBase64(file)).split(',')[1]
					}
				});
			}
		}
		engine.llm = createLLM();
		try {
			await engine.injectUserTurn(content);
		} catch (e) {
			console.error(e);
			ui.chat.setProcessing(false);
			alert("Error: " + e.message);
		}
	});

	ui.chat.on('stop', () => {
		engine.stop();
		ui.chat.setProcessing(false);
	});
	ui.chat.on('clear', () => {
		if (confirm("Clear chat history?")) {
			state.history = [];
			ui.chat.renderHistory([]);
			triggerAutoSave();
		}
	});

	const btnDownload = document.getElementById(DOM.btnDownload);
	if (btnDownload) btnDownload.onclick = async () => {
		if (typeof JSZip === 'undefined') {
			alert('JSZip not loaded');
			return;
		}
		const zip = new JSZip();
		vfs.listFiles().forEach(path => {
			if (!path.startsWith('.sample/')) {
				const content = vfs.readFile(path);
				if (content.startsWith('data:')) {
					zip.file(path, content.split(',')[1], {
						base64: true
					});
				} else {
					zip.file(path, content);
				}
			}
		});
		const blob = await zip.generateAsync({
			type: 'blob'
		});
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
		a.download = `metaos_backup_${timestamp}.bk`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 100);
	};

	const btnSaveKey = document.getElementById(DOM.btnSaveKey);
	if (btnSaveKey) btnSaveKey.onclick = () => {
		apiKey = document.getElementById(DOM.apiKey).value.trim();
		localStorage.setItem('metaforge_api_key', apiKey);
		alert('API Key Saved');
	};

	const btnRefresh = document.getElementById(DOM.btnRefresh);
	if (btnRefresh) btnRefresh.onclick = () => ui.refreshPreview();

	console.log("MetaForge v2.2 (REAL+DI) Booting...");
	await initializeSystem();
});