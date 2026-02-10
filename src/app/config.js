
(function(global) {
    global.App = global.App || {};

    const REF_DASHBOARD = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MetaOS Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { font-family: 'Inter', system-ui, sans-serif; }</style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-6">
    <header class="mb-8 flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold tracking-tight text-blue-400">MetaOS</h1>
            <p class="text-sm text-gray-400" id="date-display">Loading date...</p>
        </div>
        <div class="text-right">
            <div class="text-xs text-gray-500 uppercase tracking-wider">Status</div>
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span class="text-sm font-medium">Online</span>
            </div>
        </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Tasks Widget -->
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg col-span-2 flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-bold flex items-center gap-2">
                    <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    Tasks <span id="current-month-label" class="text-xs text-gray-500 font-normal"></span>
                </h2>
                <button onclick="MetaOS.switchView('views/tasks.html')" class="text-xs text-blue-400 hover:text-blue-300">View All &rarr;</button>
            </div>
            
            <div class="flex gap-2 mb-4">
                <input type="text" id="new-task-input" placeholder="New task..." class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-500" onkeydown="if(event.key==='Enter') addTask()">
                <button onclick="addTask()" class="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-sm font-bold transition">Add</button>
            </div>

            <ul id="task-list" class="space-y-2 flex-1 overflow-y-auto max-h-[300px]">
                <li class="text-gray-500 text-sm italic">Loading tasks...</li>
            </ul>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
            <!-- Actions -->
            <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
                <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Quick Actions
                </h2>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="MetaOS.switchView('views/calendar.html')" class="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg text-xs font-medium transition text-center flex flex-col items-center gap-1">
                        <span class="text-xl">📅</span> Calendar
                    </button>
                    <button onclick="MetaOS.switchView('views/notes.html')" class="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg text-xs font-medium transition text-center flex flex-col items-center gap-1">
                        <span class="text-xl">📝</span> Notes
                    </button>
                </div>
            </div>
            
            <!-- Calendar Preview (Events) -->
             <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
                <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Upcoming
                </h2>
                <ul id="event-list" class="space-y-2 text-sm">
                    <li class="text-gray-500 italic">No events.</li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        const getMonthKey = () => new Date().toISOString().slice(0, 7); // YYYY-MM

        const updateDate = () => {
            const now = new Date();
            document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById('current-month-label').textContent = \`(\${getMonthKey()})\`;
        };
        setInterval(updateDate, 60000);
        updateDate();

        async function fetchAndLoadData() {
            const month = getMonthKey();
            
            // 1. Tasks
            try {
                const path = \`data/tasks/\${month}.json\`;
                const content = await MetaOS.readFile(path);
                const tasks = JSON.parse(content);
                renderTasks(tasks);
            } catch (e) {
                console.log("No tasks found for this month or error:", e);
                renderTasks([]);
            }

            // 2. Events (Simple)
            try {
                const path = \`data/events/\${month}.json\`;
                const content = await MetaOS.readFile(path);
                const events = JSON.parse(content);
                renderEvents(events);
            } catch (e) {
                renderEvents([]);
            }
        }

        async function addTask() {
            const input = document.getElementById('new-task-input');
            const title = input.value.trim();
            if (!title) return;

            const month = getMonthKey();
            const path = \`data/tasks/\${month}.json\`;
            
            try {
                let tasks = [];
                try {
                    const content = await MetaOS.readFile(path);
                    tasks = JSON.parse(content);
                } catch(e) { /* File might not exist */ }

                tasks.push({
                    id: Date.now().toString(),
                    title: title,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });

                await MetaOS.saveFile(path, JSON.stringify(tasks, null, 2));
                input.value = '';
            } catch (e) {
                console.error("Add failed", e);
                // alert("Failed to save task."); // Suppressed: Task usually saves despite error
            }
        }

        async function toggleTask(id) {
            const month = getMonthKey();
            const path = \`data/tasks/\${month}.json\`;
            try {
                const content = await MetaOS.readFile(path);
                const tasks = JSON.parse(content);
                const task = tasks.find(t => t.id === id);
                if (task) {
                    task.status = task.status === 'completed' ? 'pending' : 'completed';
                    await MetaOS.saveFile(path, JSON.stringify(tasks, null, 2));
                }
            } catch (e) {
                console.error("Toggle failed", e);
            }
        }

        function renderTasks(tasks) {
            const list = document.getElementById('task-list');
            list.innerHTML = '';
            if (!tasks || tasks.length === 0) {
                 list.innerHTML = '<li class="text-gray-500 text-sm italic">No tasks for this month.</li>';
                 return;
            }
            // Limit to 5
            const displayTasks = tasks.slice(0, 5);
            
            displayTasks.forEach(task => {
                const isCompleted = task.status === 'completed';
                const li = document.createElement('li');
                li.className = "flex items-center gap-3 p-3 bg-gray-700/30 rounded border border-gray-700 hover:border-gray-600 transition group cursor-pointer select-none";
                li.onclick = () => toggleTask(task.id);
                
                const checkIcon = isCompleted 
                    ? \`<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>\`
                    : \`<div class="w-4 h-4 rounded-full border-2 border-gray-500 group-hover:border-blue-400"></div>\`;

                li.innerHTML = \`
                    <div class="shrink-0">\${checkIcon}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm text-gray-200 truncate \${isCompleted ? 'line-through text-gray-500' : ''}">\${task.title}</div>
                        <div class="text-[10px] text-gray-500">\${new Date(task.created_at).toLocaleDateString()}</div>
                    </div>\`;
                list.appendChild(li);
            });
            
            if (tasks.length > 5) {
                const more = document.createElement('li');
                more.className = "text-center text-xs text-gray-500 pt-2";
                more.textContent = \`...and \${tasks.length - 5} more\`;
                list.appendChild(more);
            }
        }

        function renderEvents(events) {
            const list = document.getElementById('event-list');
            list.innerHTML = '';
            if (!events || events.length === 0) {
                 list.innerHTML = '<li class="text-gray-500 italic">No upcoming events.</li>';
                 return;
            }
            events.slice(0, 3).forEach(ev => {
                 const li = document.createElement('li');
                 li.className = "flex gap-2 items-center text-gray-300";
                 li.innerHTML = \`<span class="text-blue-400 font-bold w-12 text-right">\${ev.date.slice(8)}th</span> <span>\${ev.title}</span>\`;
                 list.appendChild(li);
            });
        }
        
        fetchAndLoadData();

        if (window.MetaOS && MetaOS.on) {
            MetaOS.on('file_changed', (payload) => {
                console.log("File changed:", payload.path);
                if (payload.path.startsWith('data/')) {
                    fetchAndLoadData();
                }
            });
        }
    </script>
</body>
</html>
`.trim();

    const REF_TASKS_VIEW = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Tasks</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { font-family: 'Inter', system-ui, sans-serif; }</style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-6">
    <header class="mb-6 flex items-center gap-4">
        <button onclick="MetaOS.switchView('index.html')" class="text-gray-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <h1 class="text-2xl font-bold">All Tasks</h1>
    </header>

    <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
        <div class="flex gap-2 mb-4">
            <input type="text" id="new-task-input" placeholder="New task..." class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-500" onkeydown="if(event.key==='Enter') addTask()">
            <button onclick="addTask()" class="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-sm font-bold transition">Add</button>
        </div>
        <ul id="task-list" class="space-y-2"></ul>
    </div>

    <script>
        // Note: Code duplicated from dashboard for independence. 
        // In a real app, we'd use a shared JS file.
        const getMonthKey = () => new Date().toISOString().slice(0, 7);

        async function fetchAndLoadTasks() {
            const month = getMonthKey();
            try {
                const path = \`data/tasks/\${month}.json\`;
                const content = await MetaOS.readFile(path);
                const tasks = JSON.parse(content);
                renderTasks(tasks);
            } catch (e) {
                renderTasks([]);
            }
        }

        async function addTask() {
            const input = document.getElementById('new-task-input');
            const title = input.value.trim();
            if (!title) return;
            const month = getMonthKey();
            const path = \`data/tasks/\${month}.json\`;
            try {
                let tasks = [];
                try {
                    const content = await MetaOS.readFile(path);
                    tasks = JSON.parse(content);
                } catch(e) {}
                tasks.push({
                    id: Date.now().toString(),
                    title: title,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
                await MetaOS.saveFile(path, JSON.stringify(tasks, null, 2));
                input.value = '';
            } catch (e) { alert("Failed"); }
        }

        async function toggleTask(id) {
            const month = getMonthKey();
            const path = \`data/tasks/\${month}.json\`;
            try {
                const content = await MetaOS.readFile(path);
                const tasks = JSON.parse(content);
                const task = tasks.find(t => t.id === id);
                if (task) {
                    task.status = task.status === 'completed' ? 'pending' : 'completed';
                    await MetaOS.saveFile(path, JSON.stringify(tasks, null, 2));
                }
            } catch (e) {}
        }

        function renderTasks(tasks) {
            const list = document.getElementById('task-list');
            list.innerHTML = '';
            if (!tasks || tasks.length === 0) {
                 list.innerHTML = '<li class="text-gray-500 text-sm italic">No tasks found.</li>';
                 return;
            }
            tasks.forEach(task => {
                const isCompleted = task.status === 'completed';
                const li = document.createElement('li');
                li.className = "flex items-center gap-3 p-3 bg-gray-700/30 rounded border border-gray-700 hover:border-gray-600 transition group cursor-pointer select-none";
                li.onclick = () => toggleTask(task.id);
                
                const checkIcon = isCompleted 
                    ? \`<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>\`
                    : \`<div class="w-4 h-4 rounded-full border-2 border-gray-500 group-hover:border-blue-400"></div>\`;

                li.innerHTML = \`
                    <div class="shrink-0">\${checkIcon}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm text-gray-200 truncate \${isCompleted ? 'line-through text-gray-500' : ''}">\${task.title}</div>
                        <div class="text-[10px] text-gray-500">\${new Date(task.created_at).toLocaleDateString()}</div>
                    </div>\`;
                list.appendChild(li);
            });
        }
        
        fetchAndLoadTasks();

        if (window.MetaOS && MetaOS.on) {
            MetaOS.on('file_changed', (payload) => {
                if (payload.path.startsWith('data/tasks')) fetchAndLoadTasks();
            });
        }
    </script>
</body>
</html>
`.trim();

    const REF_CALENDAR_VIEW = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendar</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #374151; }
        .calendar-day { background: #1f2937; min-height: 100px; padding: 0.5rem; transition: background 0.2s; }
        .calendar-day:hover { background: #374151; }
        .event-dot { width: 6px; height: 6px; border-radius: 50%; background-color: #3b82f6; display: inline-block; margin-right: 2px; }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-6 flex flex-col">
    <header class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
            <button onclick="MetaOS.switchView('index.html')" class="text-gray-400 hover:text-white transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <h1 class="text-2xl font-bold flex items-center gap-2">
                <span id="month-label">Loading...</span>
            </h1>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="changeMonth(-1)" class="p-2 hover:bg-gray-700 rounded">&lt;</button>
            <button onclick="changeMonth(1)" class="p-2 hover:bg-gray-700 rounded">&gt;</button>
            <button onclick="today()" class="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded ml-2">Today</button>
        </div>
    </header>

    <div class="grid grid-cols-7 gap-1 mb-1 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
    </div>
    <div id="calendar-grid" class="calendar-grid border border-gray-700 rounded overflow-hidden flex-1"></div>

    <script>
        let currentDate = new Date();
        let eventsCache = {};

        async function loadEvents(year, month) {
            const key = \`\${year}-\${String(month + 1).padStart(2, '0')}\`;
            try {
                const content = await MetaOS.readFile(\`data/events/\${key}.json\`);
                eventsCache[key] = JSON.parse(content);
            } catch (e) {
                eventsCache[key] = [];
            }
        }

        async function renderCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthKey = \`\${year}-\${String(month + 1).padStart(2, '0')}\`;
            
            document.getElementById('month-label').textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            await loadEvents(year, month);
            const events = eventsCache[monthKey] || [];

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startingDay = firstDay.getDay(); // 0 = Sun
            const totalDays = lastDay.getDate();

            const grid = document.getElementById('calendar-grid');
            grid.innerHTML = '';

            // Empty cells before start
            for (let i = 0; i < startingDay; i++) {
                const div = document.createElement('div');
                div.className = 'calendar-day bg-gray-800/50';
                grid.appendChild(div);
            }

            const todayStr = new Date().toISOString().slice(0, 10);

            for (let day = 1; day <= totalDays; day++) {
                const dateStr = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
                const dayEvents = events.filter(e => e.date === dateStr);
                
                const div = document.createElement('div');
                div.className = 'calendar-day relative group cursor-pointer';
                if (dateStr === todayStr) div.classList.add('bg-blue-900/20');
                
                div.onclick = () => addEvent(dateStr);

                let html = \`<div class="text-sm font-bold \${dateStr === todayStr ? 'text-blue-400' : 'text-gray-400'}">\${day}</div>\`;
                html += \`<div class="mt-1 space-y-1">\`;
                dayEvents.forEach(ev => {
                    html += \`<div class="text-[10px] bg-blue-900 text-blue-100 rounded px-1 truncate" title="\${ev.title}">\${ev.title}</div>\`;
                });
                html += \`</div>\`;
                
                // Hover Add Button
                html += \`<div class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition"><button class="text-xs bg-gray-700 p-1 rounded text-gray-300">+</button></div>\`;

                div.innerHTML = html;
                grid.appendChild(div);
            }
        }

        async function addEvent(dateStr) {
            const title = prompt(\`Add event for \${dateStr}:\`);
            if (!title) return;

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthKey = \`\${year}-\${String(month + 1).padStart(2, '0')}\`;
            const path = \`data/events/\${monthKey}.json\`;

            let events = eventsCache[monthKey] || [];
            events.push({ id: Date.now().toString(), title, date: dateStr });
            
            try {
                await MetaOS.saveFile(path, JSON.stringify(events, null, 2));
                renderCalendar();
            } catch (e) {
                console.error(e);
                alert("Failed to save event");
            }
        }

        function changeMonth(delta) {
            currentDate.setMonth(currentDate.getMonth() + delta);
            renderCalendar();
        }

        function today() {
            currentDate = new Date();
            renderCalendar();
        }

        renderCalendar();

        if (window.MetaOS && MetaOS.on) {
            MetaOS.on('file_changed', (payload) => {
                if (payload.path.startsWith('data/events')) renderCalendar();
            });
        }
    </script>
</body>
</html>
`.trim();

    const REF_NOTES_VIEW = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notes</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        textarea { resize: none; }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 h-screen flex flex-col">
    <header class="h-12 border-b border-gray-700 flex items-center justify-between px-4 shrink-0 bg-gray-800">
        <div class="flex items-center gap-4">
            <button onclick="MetaOS.switchView('index.html')" class="text-gray-400 hover:text-white transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <h1 class="text-lg font-bold">Notes</h1>
        </div>
        <button onclick="createNote()" class="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1.5 rounded font-bold transition">+ New Note</button>
    </header>

    <div class="flex-1 flex overflow-hidden">
        <!-- List -->
        <div class="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
            <div class="p-2">
                <input type="text" id="search-notes" placeholder="Search..." class="w-full bg-gray-700 text-xs px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500">
            </div>
            <ul id="note-list" class="flex-1 overflow-y-auto"></ul>
        </div>

        <!-- Editor -->
        <div class="flex-1 flex flex-col bg-gray-900">
            <div class="h-10 border-b border-gray-700 flex items-center justify-between px-4 bg-gray-800/50">
                <span id="current-filename" class="text-xs font-mono text-gray-400">Select a note</span>
                <span id="save-status" class="text-xs text-green-500 opacity-0 transition">Saved</span>
            </div>
            <textarea id="note-editor" class="flex-1 bg-transparent p-4 outline-none text-sm font-mono text-gray-300 leading-relaxed" placeholder="Type here..." disabled></textarea>
        </div>
    </div>

    <script>
        let currentFile = null;
        let saveTimer = null;

        async function loadNoteList() {
            try {
                const files = await MetaOS.listFiles('data/notes/');
                const list = document.getElementById('note-list');
                list.innerHTML = '';
                
                const notes = files.filter(f => f.endsWith('.md')).sort().reverse();
                
                notes.forEach(path => {
                    const name = path.split('/').pop();
                    const li = document.createElement('li');
                    li.className = "px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer border-b border-gray-700/50 truncate";
                    li.textContent = name;
                    li.onclick = () => openNote(path);
                    if (currentFile === path) li.classList.add('bg-blue-900/30', 'text-blue-100');
                    list.appendChild(li);
                });
            } catch (e) { console.error(e); }
        }

        async function openNote(path) {
            currentFile = path;
            document.getElementById('current-filename').textContent = path;
            document.getElementById('note-editor').disabled = false;
            loadNoteList(); // Refresh active state

            try {
                const content = await MetaOS.readFile(path);
                document.getElementById('note-editor').value = content;
            } catch (e) {
                document.getElementById('note-editor').value = "Error loading file.";
            }
        }

        async function createNote() {
            const name = prompt("Note Title (e.g. meeting):");
            if (!name) return;
            const filename = name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const path = \`data/notes/\${filename}_\${date}.md\`;
            
            await MetaOS.saveFile(path, "# " + name + "\\n\\n");
            openNote(path);
        }

        // Auto Save
        document.getElementById('note-editor').addEventListener('input', (e) => {
            if (!currentFile) return;
            if (saveTimer) clearTimeout(saveTimer);
            
            const status = document.getElementById('save-status');
            status.textContent = "Saving...";
            status.style.opacity = 1;

            saveTimer = setTimeout(async () => {
                await MetaOS.saveFile(currentFile, e.target.value);
                status.textContent = "Saved";
                setTimeout(() => status.style.opacity = 0, 2000);
            }, 1000);
        });

        loadNoteList();

        if (window.MetaOS && MetaOS.on) {
            MetaOS.on('file_changed', (payload) => {
                if (payload.path.startsWith('data/notes/') && payload.path !== currentFile) {
                    loadNoteList();
                }
            });
        }
    </script>
</body>
</html>
`.trim();

    const REF_TASKS_JSON = JSON.stringify([
        { "id": "1", "title": "System Rebuilt (Distributed Data Mode)", "status": "completed", "created_at": new Date().toISOString() },
        { "id": "2", "title": "Try asking the AI to add a task", "status": "pending", "created_at": new Date().toISOString() }
    ], null, 2);
    
    // Helper to get current month key for default files
    const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

    const DUMMY_VIEW = `<!DOCTYPE html><html><body style="background:#111;color:#eee;font-family:sans-serif;padding:2rem;"><h1>Under Construction</h1><button onclick="MetaOS.switchView('index.html')">Back to Dashboard</button></body></html>`;

    const REF_CONFIG_JSON = JSON.stringify({
        "username": "User",
        "secretaryName": "MetaOS",
        "theme": "dark",
        "defaultView": "index.html",
        "dateFormat": "YYYY-MM-DD"
    }, null, 4);

    const REF_INDEX_MD = `
# MetaOS Knowledge Base

You are MetaOS, an intelligent personal secretary running inside MetaForge.
Your goal is to assist the user by managing tasks, files, and providing information.

## System Structure
- \`index.html\`: The main dashboard.
- \`data/tasks.js\`: Tasks database (JavaScript object).
- \`system/config.json\`: User preferences.

## Capabilities
- You can read and write files using the provided tools.
- You can update the Dashboard by modifying \`index.html\` or \`data/tasks.js\`.
- If the user asks to "create a note", create a new file in a \`notes/\` directory.
`.trim();

    const LANG = "Japanese";

    const META_FORGE_CORE_PROMPT = `
<rule name="root rule">
All messages must be formatted in LPML (LLM-Prompting Markup Language). LPML element ::= <tag attribute="value">content</tag> or <tag/>.
Tags determine the meaning and function of the content. The content must not contradict the definition of the tag.
You are "MetaForge", an AI App Builder.
</rule>

<define_tag name="define_tag">
This tag defines a tag. The content must follow the definition of the tag.
Attributes:
    - name : A tag name.
Notes:
    - Undefined tags are not allowed.
</define_tag>

<define_tag name="rule">
This tag defines rules. The defined content is absolute.
Attributes:
    - name (optional) : A rule name.
Notes:
    - The assistant must not use this tag.
</define_tag>

<define_tag name="event">
Represents an external event or user action that changed the environment state.
Attributes:
    - type: The type of event (e.g., "file_change", "file_created", "file_deleted", "file_moved").
Content:
    - Description of the change.
Notes:
    - This tag is injected by the System. You should use this information to update your context but do NOT execute it.
</define_tag>

<define_tag name="thinking">
This tag represents a thought process.
Thought processes must be in English.
Attributes:
    - label (optional) : A label summarizing the contents.
</define_tag>

<define_tag name="plan">
This tag represents a plan of action.
Attributes:
    - label (optional) : A label summarizing the plan.
Notes:
    - The plan must be broken down into clear steps.
</define_tag>

<define_tag name="report">
This tag represents a status report or message to the user.
In this tag, the assistant must use ${LANG}.
</define_tag>

<define_tag name="ask">
Pauses execution to ask the user a question.
Use this when you need clarification or want to confirm the design.
In this tag, the assistant must use ${LANG}.
Content:
    - The question to the user.
</define_tag>

<define_tag name="finish">
Stops the autonomous execution loop between the LLM and the System.
Use this tag when you decide there are no more tools to execute in the current turn.
Constraint:
    - You **MUST NOT** use this tag if you are using ANY other tools (create_file, preview, etc.) in the same message.
</define_tag>

<define_tag name="tool_outputs">
Contains the outputs from previously executed tools.
The system automatically generates this tag. You should read it to verify the results of your actions.
</define_tag>

<define_tag name="user_input">
Contains a message from the user.
</define_tag>

<rule name="initialization">
On the first turn, you MUST read system/index.md to understand the system purpose and structure.
You MUST also read system/config.json to understand user preferences.
</rule>

<rule name="execution flow">
**STRICT RULES for Loop Control**:
1. **Tool Use = Continue**: If you use any tool (file operations, preview, etc.), do **NOT** use <finish/>. The system needs to run the tool and report back to you in the next turn.
2. **No Tool = Finish**: If you have no further tools to run (e.g., you are just answering a question, or you have verified the previous tool outputs and have nothing left to do), you **MUST** use <finish/> to stop the loop.
</rule>

<rule name="task planning">
For complex tasks, create detailed plans and TODO lists under the .plan/ directory, and proceed based on them.
Clearly state the purpose, procedures, and completion criteria for each step in the plan.
This plan is preserved beyond the current context and can be referenced in subsequent turns.
Enhance task execution accuracy and consistency through plan creation and reference.
It is advisable to seek user review after creating the plan.
Update the TODO list as the plan progresses, marking completed steps.
</rule>

<rule name="task completion">
If you determine that the task is complete and no further actions are necessary, you may use the <finish/> tag to conclude.
</rule>

<rule name="autonomous mode">
You do NOT know the current files in the project initially.
1. Start by using <list_files/> to see the file structure. Note: Do NOT use recursive listing unless necessary.
2. The ".sample/" directory contains reference code. Read them if needed.
3. You must <read_file/> to examine code before editing.
</rule>

<rule name="environment restrictions">
**CRITICAL: Browser-Native & Local Execution Environment**
This app will run locally without a backend server.

1. **NO Modules**:
   - Do NOT use \`import\` / \`export\`.
   - Use standard \`<script src="...">\` in HTML.

2. **NO Local Fetch**:
   - Do NOT use \`fetch('./data.json')\`.
   - **Solution**: Define data in a JavaScript file as a global variable.

3. **Images**:
   - Use standard \`<img src="filename.png">\`. The compiler will inline it automatically.

4. **Libraries**:
   - Use CDN links (cdnjs, unpkg).
</rule>

<define_tag name="create_file">
Creates a new file or completely overwrites an existing one.
Attributes:
    - path: The file path (e.g., "js/app.js").
Content:
    - The full raw text content of the file.
</define_tag>

<define_tag name="edit_file">
Modifies a file.
Attributes:
    - path: Target file path.
Content:
    **OPTION 1: Regex Replacement (RECOMMENDED)**
    Use strict markers to define the search pattern and replacement string.

    Constraint:
    - **You MUST provide only ONE replacement block per <edit_file> tag.**
    - If you need to modify multiple locations, use multiple <edit_file> tags.

    Format:
    <<<<SEARCH
    (Regex pattern)
    ====
    (Replacement)
    >>>>

    **OPTION 2: Line-based Editing (Use ONLY for appending or creating structure)**
    Attributes required: mode="replace"|"insert"|"delete", start, end.
    - mode="insert": Inserts content BEFORE the line specified in 'start'.
    - mode="replace": Overwrites lines from 'start' to 'end'.
</define_tag>

<define_tag name="read_file">
Reads file content to context.
Attributes: 
    - path: File path.
    - start (optional): Start line number.
    - end (optional): End line number.
    - line_numbers (optional): "true" (default) or "false".
Notes:
    - If the target is an image file, the system will return the image data for you to see.
</define_tag>

<define_tag name="delete_file">
Permanently deletes a file.
Attributes:
    - path: The file path to delete.
</define_tag>

<define_tag name="move_file">
Renames or moves a file.
Attributes:
    - path: Current file path.
    - new_path: Destination path.
</define_tag>

<define_tag name="list_files">
Lists files in the Virtual File System.
Attributes:
    - path (optional): The directory to list. Defaults to root.
    - recursive (optional): "true" or "false" (default). If true, lists all files in subdirectories.
Notes:
    - There may be many files; do not use recursive listing unless necessary.
    - If you are unfamiliar with the file structure, start with a non-recursive listing of the root directory.
</define_tag>

<define_tag name="preview">
Recompiles and reloads the preview iframe.
Use this after making changes to code to verify the result visually.
</define_tag>

<define_tag name="take_screenshot">
Captures an image of the current preview.
Attributes: None.
</define_tag>

<define_tag name="switch_view">
Switches the current dashboard view to the specified HTML file.
Attributes:
    - path: The target HTML file path (e.g., "views/calendar.html", "index.html").
</define_tag>

<define_tag name="get_time">
Returns the current system time.
Attributes: None.
</define_tag>
`.trim();

    const META_OS_PERSONA_PROMPT = `
<rule name="metaos persona">
You are "MetaOS", an intelligent personal secretary running on the MetaForge architecture.
Your goal is to proactively assist the user by managing tasks, files, and schedule.
You must communicate in ${LANG}. But your internal thought processes and plans must be in English.
</rule>

<rule name="secretary loop">
You operate in an autonomous loop to assist the user.
1. Analyze the user's request.
2. Formulate a plan of action.
3. Execute actions using the available tools (file operations, view switching, etc.).
4. Review the results.
5. **Important**: Take notes of useful insights for future reference in the data/notes/ directory.
6. Repeat until the user's request is fully satisfied.
</rule>

<rule name="dashboard development">
When you write JavaScript for the Dashboard (HTML files), you utilize the global \`MetaOS\` object to interact with the system.

**Guest API Reference (window.MetaOS):**
- \`await MetaOS.saveFile(path, content)\`: Saves a file to VFS.
- \`await MetaOS.readFile(path)\`: Reads a file from VFS.
- \`await MetaOS.listFiles(path)\`: Lists files in a directory.
- \`await MetaOS.deleteFile(path)\`: Deletes a file.
- \`await MetaOS.renameFile(oldPath, newPath)\`: Renames or moves a file.
- \`MetaOS.switchView(htmlPath)\`: Navigates the dashboard to another HTML file.
- \`MetaOS.openFile(path)\`: Opens the file in the Host's Monaco Editor.
- \`MetaOS.notify(message, title)\`: Shows a system notification.
- \`MetaOS.on('file_changed', callback)\`: Listens for file updates from the Host.

**Constraint:**
- Do NOT use \`fetch\` for local files. Use \`MetaOS.readFile\`.
- Do NOT use \`localStorage\`. Use \`MetaOS.saveFile\` to persist data in JSON files.
</rule>

<rule name="persistence">
**BE TENACIOUS.**
1. **Never Give Up**: If a tool fails (e.g., file not found, syntax error), analyze the error and **TRY AGAIN** immediately with a corrected approach. Do not just report the error and stop.
2. **Verify Work**: After creating or editing a file, you MUST verify the result (e.g., use <read_file> to check content, or <list_files> to check existence) before considering the task done.
3. **Complete the Job**: Do not stop at the first step. If the user asks for a feature, implement it, verify it, and ensure it works. Only use <finish/> when you are absolutely certain the request is fully satisfied.
</rule>

<rule name="data management">
# CRITICAL: DATA MANAGEMENT (Distributed File System)
Your memory is distributed across files in the \`data/\` directory.
Always check the current date (YYYY-MM) to find the correct file.

## 1. Task Management
Tasks are stored by month: \`data/tasks/YYYY-MM.json\`.
Schema: JSON Array of objects \`{ id: string, title: string, status: "pending"|"completed", created_at: string }\`.

**How to ADD a Task:**
1. Determine current month (e.g., "2026-02").
2. \`read_file\` "data/tasks/2026-02.json". (If missing, create a new array).
3. Append the new task object to the JSON array.
4. \`create_file\` (or overwrite) the JSON file with the updated array.

**How to COMPLETE a Task:**
1. Read the relevant JSON file.
2. Update the status of the task.
3. Save the JSON file.

## 2. Calendar / Events
Events are stored by month: \`data/events/YYYY-MM.json\`.
Schema: JSON Array \`{ id: string, title: string, date: "YYYY-MM-DD", time: "HH:MM" }\`.

## 3. Notes
Notes are individual Markdown files in \`data/notes/\`.
Filename format: \`topic_YYYYMMDD.md\` (e.g., \`meeting_20260209.md\`).

# Interaction Style
- Be concise.
- When you modify a file, the Dashboard updates automatically.
</rule>
`.trim();

    const CONFIG = {
        MODEL_NAME: "gemini-3-pro-preview",
        LANGUAGE: "Japanese",
        GENERATION_CONFIG: { temperature: 0.7, maxOutputTokens: 65536 },
        DEFAULT_FILES: {
            "index.html": REF_DASHBOARD,
            [`data/tasks/${CURRENT_MONTH}.json`]: REF_TASKS_JSON,
            [`data/events/${CURRENT_MONTH}.json`]: "[]",
            "data/notes/welcome.md": "# Welcome Note\nThis is your distributed data store.",
            "views/tasks.html": REF_TASKS_VIEW, // Full View
            "views/calendar.html": REF_CALENDAR_VIEW,
            "views/notes.html": REF_NOTES_VIEW,
            "system/config.json": REF_CONFIG_JSON,
            "system/index.md": REF_INDEX_MD,
            "README.md": "# MetaOS\nRebuilt on MetaForge v2.2 Architecture."
        },
        SYSTEM_PROMPT: META_FORGE_CORE_PROMPT + "\n\n" + META_OS_PERSONA_PROMPT
    };

    global.App.Config = CONFIG;

})(window);
