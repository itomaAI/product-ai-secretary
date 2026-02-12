
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
    <script src="js/app.js"></script>
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
                <input type="text" id="new-task-input" placeholder="New task... (/due today /p high)" class="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-500" onkeydown="if(event.key==='Enter') addTask()">
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
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-bold flex items-center gap-2">
                        <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        Upcoming
                    </h2>
                    <button onclick="openEventModal()" class="text-xs text-green-400 hover:text-green-300 font-bold border border-green-500/30 px-2 py-1 rounded hover:bg-green-500/10 transition flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Add
                    </button>
                </div>
                <ul id="event-list" class="space-y-2 text-sm">
                    <li class="text-gray-500 italic">No events.</li>
                </ul>
            </div>

            <!-- Recent Notes -->
            <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
                <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Recent Notes
                </h2>
                <ul id="note-list" class="space-y-2 text-sm">
                    <li class="text-gray-500 italic">Loading...</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- Event Modal -->
    <div id="event-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center hidden z-50 backdrop-blur-sm transition-opacity duration-300">
        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl w-full max-w-sm transform transition-all scale-100">
            <h3 class="text-lg font-bold mb-4 text-white flex items-center justify-between">
                <span>Add Event</span>
                <button onclick="closeEventModal()" class="text-gray-500 hover:text-white">&times;</button>
            </h3>
            
            <div class="space-y-3">
                <div>
                    <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Title</label>
                    <input type="text" id="event-title" placeholder="Meeting with..." class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 placeholder-gray-500 transition-colors">
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Date</label>
                        <input type="date" id="event-date" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 scheme-dark">
                    </div>
                    <div>
                        <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Time</label>
                        <input type="time" id="event-time" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 scheme-dark">
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-6">
                <button onclick="closeEventModal()" class="px-4 py-2 text-gray-400 hover:text-white transition text-sm font-medium">Cancel</button>
                <button onclick="saveEvent()" class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg shadow-green-900/20 transition transform active:scale-95 text-sm">Save Event</button>
            </div>
        </div>
    </div>

    <script>
        // Use App.openTaskModal(id) instead of local logic
        // --- Event Modal Logic ---
        function openEventModal() {
            const modal = document.getElementById('event-modal');
            modal.classList.remove('hidden');
            // Animate in
            modal.querySelector('div').classList.add('scale-100');
            modal.querySelector('div').classList.remove('scale-95');
            
            document.getElementById('event-date').value = new Date().toISOString().slice(0, 10);
            document.getElementById('event-time').value = new Date().toTimeString().slice(0, 5);
            setTimeout(() => document.getElementById('event-title').focus(), 50);
        }

        function closeEventModal() {
            const modal = document.getElementById('event-modal');
            modal.classList.add('hidden');
            document.getElementById('event-title').value = '';
            document.getElementById('event-time').value = '';
        }

        async function saveEvent() {
            const title = document.getElementById('event-title').value;
            const date = document.getElementById('event-date').value;
            const time = document.getElementById('event-time').value;
            
            if(!title || !date) {
                // Shake animation for error?
                return;
            }
            
            await App.addEvent(title, date, time);
            closeEventModal();
            refreshData();
        }

        const updateDate = () => {
            const now = new Date();
            document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById('current-month-label').textContent = \`(\${App.getMonthKey()})\`;
        };
        setInterval(updateDate, 60000);
        updateDate();

        async function refreshData() {
            try {
                // 1. Tasks
                const tasks = await App.getTasks();

                // Sort: Status > Due Date (Asc) > Priority (Desc)
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                tasks.sort((a, b) => {
                    // 1. Status: Pending first
                    if (a.status !== b.status) {
                        return a.status === 'completed' ? 1 : -1;
                    }

                    // 2. Due Date: Earlier first. No date = last.
                    const dateA = a.dueDate ? a.dueDate : '9999-12-31';
                    const dateB = b.dueDate ? b.dueDate : '9999-12-31';
                    
                    if (dateA !== dateB) {
                        return dateA < dateB ? -1 : 1;
                    }

                    // 3. Priority: High > Medium > Low
                    const pA = priorityOrder[a.priority] || 1;
                    const pB = priorityOrder[b.priority] || 1;
                    
                    return pB - pA; 
                });

                renderTasks(tasks);
            } catch(e) { console.error("Tasks error", e); }

            try {
                // 2. Events (Sorted)
                const events = await App.getUpcomingEvents();
                renderEvents(events);
            } catch(e) { console.error("Events error", e); }

            try {
                // 3. Recent Notes
                const notes = await App.getRecentNotes();
                renderNotes(notes);
            } catch(e) { 
                console.error("Notes error", e); 
                document.getElementById('note-list').innerHTML = '<li class="text-red-500 italic">Error loading notes.</li>';
            }
        }

        async function addTask() {
            const input = document.getElementById('new-task-input');
            const title = input.value.trim();
            if (!title) return;

            await App.addTask(title);
            input.value = '';
            refreshData();
        }

        async function toggleTask(id) {
            await App.toggleTask(id);
            refreshData();
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
                
                // Priority Color
                let borderClass = "border-gray-700 hover:border-gray-600";
                if (!isCompleted) {
                    if (task.priority === 'high') borderClass = "border-red-900/50 hover:border-red-700";
                    else if (task.priority === 'low') borderClass = "border-blue-900/50 hover:border-blue-700";
                }

                li.className = \`flex items-center gap-3 p-3 bg-gray-700/30 rounded border \${borderClass} transition group select-none relative overflow-hidden\`;
                // Removed global li.onclick

                const checkIcon = isCompleted 
                    ? \`<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>\`
                    : \`<div class="w-4 h-4 rounded-full border-2 border-gray-500 group-hover:border-blue-400 transition-colors"></div>\`;

                // Meta Info
                let metaHtml = \`<span class="text-[10px] text-gray-500">\${new Date(task.created_at).toLocaleDateString()}</span>\`;
                if (task.dueDate) {
                     const due = new Date(task.dueDate);
                     const today = new Date();
                     today.setHours(0,0,0,0);
                     const isOverdue = due < today && !isCompleted;
                     const dueColor = isOverdue ? 'text-red-400 font-bold' : 'text-blue-300';
                     metaHtml += \` <span class="ml-2 \${dueColor}">Due: \${task.dueDate}</span>\`;
                }
                if (task.priority && task.priority !== 'medium') {
                     const pColor = task.priority === 'high' ? 'text-red-400' : 'text-blue-400';
                     metaHtml += \` <span class="ml-2 \${pColor} uppercase text-[9px] border border-gray-600 px-1 rounded">\${task.priority}</span>\`;
                }

                li.innerHTML = \`
                    <div class="shrink-0 cursor-pointer p-1 -m-1" onclick="toggleTask('\${task.id}')">\${checkIcon}</div>
                    <div class="flex-1 min-w-0 cursor-pointer" onclick="App.openTaskModal('\${task.id}')">
                        <div class="text-sm text-gray-200 truncate \${isCompleted ? 'line-through text-gray-500' : ''}">\${task.title}</div>
                        <div class="flex items-center mt-0.5">\${metaHtml}</div>
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

        function renderNotes(notes) {
            const list = document.getElementById('note-list');
            list.innerHTML = '';
            if (!notes || notes.length === 0) {
                 list.innerHTML = '<li class="text-gray-500 italic">No recent notes.</li>';
                 return;
            }
            notes.forEach(path => {
                 // path is "data/notes/.../filename.md"
                 const parts = path.split('/');
                 const filename = parts.pop().replace('.md', '');
                 
                 // Display raw filename
                 const display = filename;

                 const li = document.createElement('li');
                 li.className = "flex gap-2 items-center text-gray-300 hover:text-white cursor-pointer group p-1 rounded hover:bg-gray-700/50 transition";
                 li.onclick = () => {
                     localStorage.setItem('metaos_open_note', path);
                     MetaOS.switchView('views/notes.html');
                 };
                 li.innerHTML = \`
                    <svg class="w-4 h-4 text-gray-500 group-hover:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span class="truncate text-xs font-mono" title="\${path}">\${display}</span>
                 \`;
                 list.appendChild(li);
            });
        }
        
        refreshData();

        if (window.MetaOS && MetaOS.on) {
            MetaOS.on('file_changed', (payload) => {
                if (payload.path.startsWith('data/')) {
                    refreshData();
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
    <script src="../js/app.js"></script>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen p-6">
    <header class="mb-6 flex items-center gap-4">
        <button onclick="MetaOS.switchView('index.html')" class="text-gray-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <h1 class="text-2xl font-bold">All Tasks</h1>
    </header>

    <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
        <!-- Add Task Form -->
        <div class="flex flex-col gap-2 mb-6 bg-gray-700/50 p-3 rounded-lg border border-gray-700">
            <input type="text" id="new-task-input" placeholder="New task title..." class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-500" onkeydown="if(event.key==='Enter') addTask()">
            <div class="flex gap-2">
                <input type="date" id="new-task-date" class="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
                <select id="new-task-priority" class="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
                <button onclick="addTask()" class="ml-auto bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded text-xs font-bold transition">Add Task</button>
            </div>
        </div>

        <!-- Filters -->
        <div class="flex gap-4 mb-4 text-sm border-b border-gray-700 pb-2">
            <button onclick="setFilter('all')" id="filter-all" class="text-blue-400 font-bold border-b-2 border-blue-400 pb-2 px-1">All</button>
            <button onclick="setFilter('pending')" id="filter-pending" class="text-gray-400 hover:text-gray-200 pb-2 px-1">Pending</button>
            <button onclick="setFilter('completed')" id="filter-completed" class="text-gray-400 hover:text-gray-200 pb-2 px-1">Completed</button>
        </div>

        <ul id="task-list" class="space-y-2"></ul>
    </div>

    <!-- Edit Modal (Simple prompt implementation for now) -->

    <script>
        let currentFilter = 'all';

        async function refreshTasks() {
            let tasks = await App.getTasks();
            
            // Filter
            if (currentFilter === 'pending') tasks = tasks.filter(t => t.status === 'pending');
            if (currentFilter === 'completed') tasks = tasks.filter(t => t.status === 'completed');

            // Sort: Status > Due Date (Asc) > Priority (Desc)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            
            tasks.sort((a, b) => {
                // 1. Status: Pending first
                if (a.status !== b.status) {
                    return a.status === 'completed' ? 1 : -1;
                }

                // 2. Due Date: Earlier first. No date = last.
                const dateA = a.dueDate ? a.dueDate : '9999-12-31';
                const dateB = b.dueDate ? b.dueDate : '9999-12-31';
                
                if (dateA !== dateB) {
                    return dateA < dateB ? -1 : 1;
                }

                // 3. Priority: High > Medium > Low
                const pA = priorityOrder[a.priority] || 1;
                const pB = priorityOrder[b.priority] || 1;
                
                return pB - pA; 
            });

            renderTasks(tasks);
        }

        function setFilter(filter) {
            currentFilter = filter;
            document.querySelectorAll('[id^="filter-"]').forEach(btn => {
                btn.className = "text-gray-400 hover:text-gray-200 pb-2 px-1 transition";
                btn.style.borderBottom = "none";
            });
            const activeBtn = document.getElementById(\`filter-\${filter}\`);
            activeBtn.className = "text-blue-400 font-bold border-b-2 border-blue-400 pb-2 px-1";
            refreshTasks();
        }

        async function addTask() {
            const input = document.getElementById('new-task-input');
            const dateInput = document.getElementById('new-task-date');
            const prioInput = document.getElementById('new-task-priority');
            
            const title = input.value.trim();
            if (!title) return;

            await App.addTask(title, dateInput.value, prioInput.value);
            
            input.value = '';
            dateInput.value = '';
            prioInput.value = 'medium';
            refreshTasks();
        }

        async function toggleTask(id) {
            await App.toggleTask(id);
            refreshTasks();
        }

        async function deleteTask(id, event) {
            event.stopPropagation();
            if (!confirm("Delete this task?")) return;
            await App.deleteTask(id);
            refreshTasks();
        }

        async function editTask(id, currentTitle, event) {
            event.stopPropagation();
            App.openTaskModal(id);
        }

        function renderTasks(tasks) {
            const list = document.getElementById('task-list');
            list.innerHTML = '';
            if (!tasks || tasks.length === 0) {
                 list.innerHTML = '<li class="text-gray-500 text-sm italic py-4 text-center">No tasks found.</li>';
                 return;
            }
            
            const priorityColors = {
                high: 'text-red-400',
                medium: 'text-yellow-400',
                low: 'text-green-400'
            };

            tasks.forEach(task => {
                const isCompleted = task.status === 'completed';
                const li = document.createElement('li');
                li.className = \`flex items-center gap-3 p-3 bg-gray-700/30 rounded border \${isCompleted ? 'border-gray-800 opacity-60' : 'border-gray-700'} hover:border-gray-600 transition group select-none relative\`;
                
                const checkIcon = isCompleted 
                    ? \`<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>\`
                    : \`<div class="w-5 h-5 rounded-full border-2 border-gray-500 group-hover:border-blue-400 transition"></div>\`;

                const priorityDot = \`<span class="text-[10px] uppercase font-bold \${priorityColors[task.priority] || 'text-gray-400'} border border-current px-1 rounded">\${task.priority || 'med'}</span>\`;
                const dueDateDisplay = task.dueDate ? \`<span class="text-xs text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>\${task.dueDate}</span>\` : '';

                li.innerHTML = \`
                    <div class="shrink-0 cursor-pointer p-1 -m-1" onclick="toggleTask('\${task.id}')">\${checkIcon}</div>
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 cursor-pointer" onclick="App.openTaskModal('\${task.id}')">
                        <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-200 truncate font-medium \${isCompleted ? 'line-through text-gray-500' : ''}">\${task.title}</span>
                            \${priorityDot}
                        </div>
                        <div class="flex items-center gap-3">
                            \${dueDateDisplay}
                            <span class="text-[10px] text-gray-600">Created: \${new Date(task.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                \`;
                list.appendChild(li);
            });
        }
        
        refreshTasks();

        if (window.MetaOS && MetaOS.on) {
            MetaOS.on('file_changed', (payload) => {
                if (payload.path.startsWith('data/tasks')) refreshTasks();
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
    <title>Notes - MetaOS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        /* Markdown Styles */
        .prose h1 { color: white; font-size: 2em; margin-bottom: 0.5em; border-bottom: 1px solid #374151; padding-bottom: 0.3em; }
        .prose h2 { color: #e5e7eb; font-size: 1.5em; margin-top: 1em; margin-bottom: 0.5em; font-weight: bold; }
        .prose h3 { color: #d1d5db; font-size: 1.25em; margin-top: 1em; font-weight: bold; }
        .prose p { margin-bottom: 1em; line-height: 1.6; color: #d1d5db; }
        .prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; color: #d1d5db; }
        .prose ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; color: #d1d5db; }
        .prose a { color: #60a5fa; text-decoration: underline; }
        .prose code { background: #374151; padding: 0.2em 0.4em; border-radius: 0.25em; color: #f3f4f6; font-family: monospace; }
        .prose pre { background: #1f2937; padding: 1em; overflow-x: auto; border-radius: 0.5em; margin-bottom: 1em; }
        .prose blockquote { border-left: 4px solid #4b5563; padding-left: 1em; color: #9ca3af; font-style: italic; }
        
        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111827; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
    </style>
    <script src="../js/app.js"></script>
</head>
<body class="bg-gray-900 text-gray-100 h-screen flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/95 backdrop-blur shrink-0 z-20">
        <div class="flex items-center gap-4">
            <button onclick="MetaOS.switchView('index.html')" class="text-gray-400 hover:text-white transition p-1 rounded hover:bg-gray-800">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <h1 class="text-xl font-bold tracking-tight text-blue-400">Notes Explorer</h1>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 uppercase tracking-wider font-mono" id="status-indicator">Ready</span>
        </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar: File Tree -->
        <div class="w-72 bg-gray-800/50 border-r border-gray-800 flex flex-col">
            <div class="p-4 border-b border-gray-700/50">
                <input type="text" id="search-input" placeholder="Search projects..." class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600">
            </div>
            <ul id="file-list" class="flex-1 overflow-y-auto p-2 space-y-0.5">
                <li class="text-center py-8 text-gray-500 text-sm animate-pulse">Loading files...</li>
            </ul>
        </div>

        <!-- Main Content: Preview & Actions -->
        <div class="flex-1 flex flex-col bg-gray-900 relative">
            
            <!-- Empty State -->
            <div id="empty-state" class="absolute inset-0 flex flex-col items-center justify-center text-gray-600 z-0">
                <svg class="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p class="text-lg font-medium">Select a note to view</p>
                <p class="text-sm opacity-60">PARA Structure Supported</p>
            </div>

            <!-- Toolbar (Sticky) -->
            <div id="toolbar" class="hidden h-12 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/95 backdrop-blur z-10 shrink-0">
                <div class="flex items-center gap-2 overflow-hidden">
                    <svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <h2 id="note-title" class="text-sm font-bold text-gray-200 truncate font-mono"></h2>
                </div>
                <button onclick="editCurrentNote()" class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition transform active:scale-95 shadow-lg shadow-blue-900/20">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Edit
                </button>
            </div>

            <!-- Content -->
            <div id="content-scroll" class="hidden flex-1 overflow-y-auto p-8 z-0 scroll-smooth">
                <div id="note-body" class="prose max-w-4xl mx-auto pb-20"></div>
            </div>
        </div>
    </div>

    <script>
        let currentFile = null;
        let allFiles = [];

        // --- Initialization ---
        
        async function init() {
            await loadFileList();
            
            // Check for pending open request
            const pending = localStorage.getItem('metaos_open_note');
            if (pending) {
                localStorage.removeItem('metaos_open_note');
                // Validate it exists
                if (allFiles.includes(pending)) {
                    openNote(pending);
                } else {
                    // Maybe it wasn't loaded yet, try anyway
                    openNote(pending);
                }
            }
        }

        // --- File Listing ---

        async function loadFileList() {
            try {
                // Use the recursive function from App.js if available
                if (App.listFilesRecursive) {
                    allFiles = await App.listFilesRecursive('data/notes');
                } else {
                    // Fallback to flat listing
                    allFiles = await MetaOS.listFiles('data/notes');
                }
                
                // Sort: 01_Projects first, then alphabetical
                allFiles.sort();

                renderFileList(allFiles);
            } catch (e) {
                console.error("List error", e);
                document.getElementById('file-list').innerHTML = \`<li class="text-red-400 p-4 text-xs text-center">Error: \${e.message}</li>\`;
            }
        }

        function renderFileList(files) {
            const list = document.getElementById('file-list');
            const search = document.getElementById('search-input').value.toLowerCase();
            list.innerHTML = '';

            // 1. Filter files
            const filtered = files.filter(path => {
                if (!path.endsWith('.md')) return false;
                // If search is active, match filename. 
                // (Advanced: match path too, but filename is usually enough)
                return path.toLowerCase().includes(search);
            });

            if (filtered.length === 0) {
                list.innerHTML = '<li class="text-gray-500 text-xs text-center py-4">No matching notes.</li>';
                return;
            }

            // 2. Build Tree Structure
            const tree = {};
            filtered.forEach(path => {
                // Remove 'data/notes/' prefix for cleaner structure
                const relPath = path.replace(/^data\\/notes\\//, '');
                const parts = relPath.split('/');
                
                let current = tree;
                parts.forEach((part, i) => {
                    if (i === parts.length - 1) {
                        // It's a file
                        current[part] = path; // Leaf node value = full path
                    } else {
                        // It's a folder
                        if (!current[part]) current[part] = {};
                        // If it happens to be a string (conflict file/folder), object wins (rare case)
                        if (typeof current[part] === 'string') current[part] = { '__file_path': current[part] };
                        current = current[part];
                    }
                });
            });

            // 3. Render Tree
            list.appendChild(renderTreeLevel(tree));
        }

        function renderTreeLevel(node, depth = 0) {
            const ul = document.createElement('ul');
            ul.className = depth > 0 ? "border-l border-gray-700/50 ml-3 pl-1" : "";
            
            // Sort keys: Folders first, then Files
            const keys = Object.keys(node).sort((a, b) => {
                const isAFolder = typeof node[a] === 'object';
                const isBFolder = typeof node[b] === 'object';
                if (isAFolder && !isBFolder) return -1;
                if (!isAFolder && isBFolder) return 1;
                return a.localeCompare(b);
            });

            keys.forEach(key => {
                const value = node[key];
                const li = document.createElement('li');
                
                if (typeof value === 'object') {
                    // --- FOLDER ---
                    const details = document.createElement('details');
                    details.open = true; // Default open
                    // If deep hierarchy, maybe close? For now open is better for visibility.
                    
                    const summary = document.createElement('summary');
                    summary.className = "cursor-pointer px-2 py-1 text-xs font-bold text-gray-500 hover:text-white uppercase tracking-wider flex items-center gap-1 select-none group";
                    summary.innerHTML = \`
                        <svg class="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        <svg class="w-3 h-3 text-yellow-600/70 group-hover:text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4c0-1.1.9-2 2-2h4.59L12 4h6c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4z"/></svg>
                        \${key}
                    \`;
                    
                    details.appendChild(summary);
                    details.appendChild(renderTreeLevel(value, depth + 1));
                    li.appendChild(details);
                } else {
                    // --- FILE ---
                    const path = value;
                    const fileName = key.replace('.md', '');
                    
                    // Display raw filename
                    const displayName = fileName;

                    const isActive = currentFile === path;
                    
                    const div = document.createElement('div');
                    div.className = \`cursor-pointer px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition flex items-center gap-2 rounded-sm truncate \${isActive ? 'bg-blue-900/30 text-blue-200' : ''}\`;
                    div.onclick = () => openNote(path);
                    div.title = fileName; // Full name on hover
                    
                    div.innerHTML = \`
                        <svg class="w-3 h-3 text-blue-500/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <span class="truncate">\${displayName}</span>
                    \`;
                    
                    li.appendChild(div);
                }
                ul.appendChild(li);
            });
            return ul;
        }

        // --- Note Viewing ---

        async function openNote(path) {
            currentFile = path;
            
            // UI Updates
            renderFileList(allFiles); // To update active highlight
            document.getElementById('empty-state').classList.add('hidden');
            document.getElementById('toolbar').classList.remove('hidden');
            document.getElementById('content-scroll').classList.remove('hidden');
            
            // Set Title
            const parts = path.split('/');
            document.getElementById('note-title').textContent = parts.pop();
            document.getElementById('status-indicator').textContent = "Loading...";

            // Skeleton Loader
            const body = document.getElementById('note-body');
            body.innerHTML = \`
                <div class="animate-pulse space-y-4 pt-4">
                    <div class="h-8 bg-gray-800 rounded w-1/3 mb-6"></div>
                    <div class="h-4 bg-gray-800 rounded w-full"></div>
                    <div class="h-4 bg-gray-800 rounded w-5/6"></div>
                    <div class="h-4 bg-gray-800 rounded w-4/6"></div>
                </div>\`;

            try {
                const content = await MetaOS.readFile(path);
                // Render Markdown
                body.innerHTML = marked.parse(content);
                document.getElementById('status-indicator').textContent = "Synced";
            } catch (e) {
                body.innerHTML = \`<div class="p-4 bg-red-900/20 border border-red-900 rounded text-red-200">Failed to load file: \${e.message}</div>\`;
                document.getElementById('status-indicator').textContent = "Error";
            }
        }

        function editCurrentNote() {
            if (currentFile && window.MetaOS) {
                MetaOS.openFile(currentFile);
            }
        }

        document.getElementById('search-input').addEventListener('input', () => renderFileList(allFiles));

        // --- Event Listeners (Sync) ---
        
        if (window.MetaOS && MetaOS.on) {
            MetaOS.on('file_changed', (payload) => {
                if (!payload || !payload.path) return;
                
                console.log("File change detected:", payload.path);

                // 1. Content Update
                if (currentFile && payload.path === currentFile) {
                    console.log("Reloading current note...");
                    // Add a small visual indicator
                    document.getElementById('status-indicator').textContent = "Updating...";
                    document.getElementById('status-indicator').classList.add('text-green-400');
                    
                    openNote(currentFile).then(() => {
                         setTimeout(() => {
                             document.getElementById('status-indicator').classList.remove('text-green-400');
                         }, 1000);
                    });
                }

                // 2. List Update (if it's a note)
                if (payload.path.startsWith('data/notes/') && payload.path.endsWith('.md')) {
                    // If it's a new file, we need to reload the list
                    // Since we don't know if it's new or just edited, we reload anyway.
                    // To avoid UI flickering, we can check if it exists in allFiles.
                    if (!allFiles.includes(payload.path)) {
                        console.log("New note detected, reloading list...");
                        loadFileList();
                    }
                }
            });
        }

        // Start
        init();

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
    <script src="../js/app.js"></script>
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

    <!-- Event Modal -->
    <div id="event-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center hidden z-50 backdrop-blur-sm transition-opacity duration-300">
        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl w-full max-w-sm transform transition-all scale-100">
            <h3 class="text-lg font-bold mb-4 text-white flex items-center justify-between">
                <span id="event-modal-title">Add Event</span>
                <button onclick="closeEventModal()" class="text-gray-500 hover:text-white">&times;</button>
            </h3>
            
            <input type="hidden" id="event-id">
            <input type="hidden" id="event-original-date">

            <div class="space-y-3">
                <div>
                    <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Title</label>
                    <input type="text" id="event-title" placeholder="Meeting with..." class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 placeholder-gray-500 transition-colors">
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Date</label>
                        <input type="date" id="event-date" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 scheme-dark">
                    </div>
                    <div>
                        <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Time</label>
                        <input type="time" id="event-time" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 scheme-dark">
                    </div>
                </div>

                <div>
                    <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Note</label>
                    <textarea id="event-note" placeholder="Details..." class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 placeholder-gray-500 transition-colors h-24 resize-none"></textarea>
                </div>
            </div>

            <div class="flex justify-between gap-2 mt-6">
                <button id="event-delete-btn" onclick="deleteEvent()" class="px-4 py-2 text-red-400 hover:text-red-300 transition text-sm font-medium hidden">Delete</button>
                <div class="flex gap-2 ml-auto">
                    <button onclick="closeEventModal()" class="px-4 py-2 text-gray-400 hover:text-white transition text-sm font-medium">Cancel</button>
                    <button onclick="saveEvent()" class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg shadow-green-900/20 transition transform active:scale-95 text-sm">Save</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentDate = new Date();
        let eventsCache = {};
        let currentItems = []; // Store current view items for easy access

        async function loadEvents(year, month) {
            const key = \`\${year}-\${String(month + 1).padStart(2, '0')}\`;
            // Use App.getEvents if available, or fallback
            // App.getEvents expects "YYYY-MM"
            if (window.App) {
                const events = await App.getEvents(key);
                eventsCache[key] = events;
            } else {
                // Fallback
                try {
                    const content = await MetaOS.readFile(\`data/events/\${key}.json\`);
                    eventsCache[key] = JSON.parse(content);
                } catch (e) {
                    eventsCache[key] = [];
                }
            }
        }

        async function renderCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthKey = \`\${year}-\${String(month + 1).padStart(2, '0')}\`;
            
            document.getElementById('month-label').textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            let items = [];
            if (window.App && App.getCalendarItems) {
                items = await App.getCalendarItems(monthKey);
            } else {
                // Fallback for just events if App not fully loaded
                await loadEvents(year, month);
                items = eventsCache[monthKey] || [];
            }
            
            currentItems = items; // Update global reference

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
                const dayItems = items.filter(e => e.date === dateStr);
                
                const div = document.createElement('div');
                div.className = 'calendar-day relative group cursor-pointer overflow-hidden';
                if (dateStr === todayStr) div.classList.add('bg-blue-900/20');
                
                // Allow clicking anywhere to add event, unless clicking specifically on a task/event (future enhancement)
                div.onclick = (e) => {
                    if(e.target === div || e.target.classList.contains('calendar-day-label')) {
                        addEvent(dateStr);
                    }
                };

                let html = \`<div class="calendar-day-label text-sm font-bold \${dateStr === todayStr ? 'text-blue-400' : 'text-gray-400'}">\${day}</div>\`;
                html += \`<div class="mt-1 space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">\`;
                
                dayItems.forEach(item => {
                    let colorClass = 'bg-blue-900 text-blue-100'; // Default Event
                    let onclickAttr = '';

                    if (item.type === 'task') {
                        colorClass = 'bg-green-900 text-green-100 border-l-2 border-green-500 hover:bg-green-800 cursor-pointer';
                        onclickAttr = \`onclick="event.stopPropagation(); App.openTaskModal('\${item.id}')"\`; 
                    } else {
                        colorClass = 'bg-blue-900 text-blue-100 border-l-2 border-blue-500 hover:bg-blue-800 cursor-pointer';
                        // Safe call using ID lookup
                        onclickAttr = \`onclick="event.stopPropagation(); openEditEventModal('\${item.id}')"\`;
                    }
                    
                    html += \`<div class="text-[10px] \${colorClass} rounded px-1 py-0.5 truncate transition-colors" title="\${item.title}" \${onclickAttr}>
                                \${item.time ? \`<span class="opacity-75 mr-1">\${item.time}</span>\` : ''}\${item.title}
                             </div>\`;
                });
                html += \`</div>\`;
                
                // Hover Add Button
                html += \`<div class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition z-10">
                            <button onclick="addEvent('\${dateStr}')" class="text-xs bg-gray-700 hover:bg-gray-600 p-1 rounded text-gray-300 shadow-md">+</button>
                         </div>\`;

                div.innerHTML = html;
                grid.appendChild(div);
            }
        }

        function openEventModal(dateStr) {
            const modal = document.getElementById('event-modal');
            modal.classList.remove('hidden');
            
            // Reset for Add
            document.getElementById('event-modal-title').textContent = "Add Event";
            document.getElementById('event-id').value = ""; // Clear ID
            document.getElementById('event-original-date').value = "";
            document.getElementById('event-title').value = "";
            document.getElementById('event-note').value = "";
            document.getElementById('event-delete-btn').classList.add('hidden');

            document.getElementById('event-date').value = dateStr || new Date().toISOString().slice(0, 10);
            document.getElementById('event-time').value = new Date().toTimeString().slice(0, 5);
            
            setTimeout(() => document.getElementById('event-title').focus(), 50);
        }

        function openEditEventModal(id) {
            const item = currentItems.find(i => i.id === id);
            if (!item) return;

            const modal = document.getElementById('event-modal');
            modal.classList.remove('hidden');

            document.getElementById('event-modal-title').textContent = "Edit Event";
            document.getElementById('event-id').value = item.id;
            document.getElementById('event-original-date').value = item.date; // For deletion/move
            document.getElementById('event-title').value = item.title;
            document.getElementById('event-date').value = item.date;
            document.getElementById('event-time').value = item.time || '';
            document.getElementById('event-note').value = item.note || '';
            
            document.getElementById('event-delete-btn').classList.remove('hidden');
        }

        function closeEventModal() {
            const modal = document.getElementById('event-modal');
            modal.classList.add('hidden');
            document.getElementById('event-title').value = '';
            document.getElementById('event-time').value = '';
            document.getElementById('event-note').value = '';
        }

        async function saveEvent() {
            const id = document.getElementById('event-id').value;
            const title = document.getElementById('event-title').value;
            const date = document.getElementById('event-date').value;
            const time = document.getElementById('event-time').value;
            const note = document.getElementById('event-note').value;
            const originalDate = document.getElementById('event-original-date').value;
            
            if(!title || !date) return;
            
            if (window.App) {
                if (id) {
                    // Update
                    await App.updateEvent(id, {
                        title, date, time, note, originalDate
                    });
                } else {
                    // Create
                    await App.addEvent(title, date, time, note);
                }
            } else {
                console.error("App logic not loaded");
            }
            closeEventModal();
            renderCalendar();
        }

        async function deleteEvent() {
            const id = document.getElementById('event-id').value;
            const date = document.getElementById('event-original-date').value; // Use original date to find file
            
            if (confirm("Are you sure you want to delete this event?")) {
                if (window.App) {
                    await App.deleteEvent(id, date);
                }
                closeEventModal();
                renderCalendar();
            }
        }

        // Bridge for clicking a date
        function addEvent(dateStr) {
            openEventModal(dateStr);
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
                if (payload.path.startsWith('data/events') || payload.path.startsWith('data/tasks')) {
                    renderCalendar();
                }
            });
        }
    </script>
</body>
</html>
`.trim();

    const REF_APP_JS = `
// MetaOS Shared Logic
// This file contains shared functions for the dashboard and views.

window.App = {
    // Utilities
    getMonthKey: () => new Date().toISOString().slice(0, 7), // YYYY-MM
    
    getCurrentDate: () => new Date().toISOString().slice(0, 10), // YYYY-MM-DD

    // --- Tasks ---

    async getTasks(month = null) {
        const m = month || this.getMonthKey();
        const path = \`data/tasks/\${m}.json\`;
        try {
            const content = await MetaOS.readFile(path);
            return JSON.parse(content);
        } catch (e) {
            return [];
        }
    },

    async saveTasks(tasks, month = null) {
        const m = month || this.getMonthKey();
        const path = \`data/tasks/\${m}.json\`;
        await MetaOS.saveFile(path, JSON.stringify(tasks, null, 2));
    },

    async addTask(rawTitle, dueDate = '', priority = 'medium') {
        if (!rawTitle.trim()) return;

        let title = rawTitle;
        
        // Parse Priority: /p high|medium|low
        const pMatch = title.match(/\\/p\\s+(high|medium|low)/i);
        if (pMatch) {
            priority = pMatch[1].toLowerCase();
            title = title.replace(pMatch[0], '');
        }

        // Parse Due Date: /due YYYY-MM-DD | today | tomorrow
        const dMatch = title.match(/\\/due\\s+(\\S+)/i);
        if (dMatch) {
            let dVal = dMatch[1];
            const now = new Date();
            
            if (dVal.toLowerCase() === 'today') {
                dVal = now.toISOString().slice(0, 10);
            } else if (dVal.toLowerCase() === 'tomorrow') {
                const tmr = new Date(now);
                tmr.setDate(tmr.getDate() + 1);
                dVal = tmr.toISOString().slice(0, 10);
            }
            
            // Validate YYYY-MM-DD
            if (dVal.match(/^\\d{4}-\\d{2}-\\d{2}\$/)) {
                dueDate = dVal;
            }
            title = title.replace(dMatch[0], '');
        }

        title = title.trim();
        if (!title) return;

        const tasks = await this.getTasks();
        const newTask = {
            id: Date.now().toString(),
            title: title,
            status: 'pending',
            dueDate: dueDate,
            priority: priority,
            created_at: new Date().toISOString()
        };
        tasks.push(newTask);
        await this.saveTasks(tasks);
        return newTask;
    },

    async updateTask(id, updates) {
        const tasks = await this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updates };
            await this.saveTasks(tasks);
            return true;
        }
        return false;
    },

    async deleteTask(id) {
        let tasks = await this.getTasks();
        const initialLength = tasks.length;
        tasks = tasks.filter(t => t.id !== id);
        if (tasks.length !== initialLength) {
            await this.saveTasks(tasks);
            return true;
        }
        return false;
    },

    async toggleTask(id) {
        const tasks = await this.getTasks();
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.status = task.status === 'completed' ? 'pending' : 'completed';
            await this.saveTasks(tasks);
            return true;
        }
        return false;
    },

    // --- Events ---

    async addEvent(title, date, time = '', note = '') {
        if (!title.trim() || !date) return;
        
        // Determine file path based on event date
        const monthKey = date.slice(0, 7); // YYYY-MM
        const path = \`data/events/\${monthKey}.json\`;
        
        let events = [];
        try {
            const content = await MetaOS.readFile(path);
            events = JSON.parse(content);
        } catch (e) {
            // File might not exist, start fresh
            events = [];
        }

        const newEvent = {
            id: Date.now().toString(),
            title: title.trim(),
            date: date,
            time: time,
            note: note
        };
        
        events.push(newEvent);
        
        // Sort by date then time
        events.sort((a, b) => {
             if (a.date < b.date) return -1;
             if (a.date > b.date) return 1;
             if (a.time < b.time) return -1;
             if (a.time > b.time) return 1;
             return 0;
        });

        await MetaOS.saveFile(path, JSON.stringify(events, null, 2));
        return newEvent;
    },

    async updateEvent(id, updates) {
        // We need to find the event. Since we don't know the month, we might need to search.
        // HOWEVER, usually updates come from a context where we know the date.
        // If updates.date is present, we might need to move the event file.
        
        // Strategy: We require 'date' in updates OR we assume it's in the current month view?
        // Better: Search in the month of the OLD date if known, or search recent months.
        
        // Ideally, the UI passes the old date or we store it.
        // For now, let's assume we pass the *original* date in updates or we search the target month.
        
        // Wait, if we change the date, we might move months.
        // Let's implement a simple version that assumes we know the old date.
        
        if (!updates.originalDate) {
             console.error("updateEvent requires originalDate to find the file.");
             return false;
        }

        const oldMonthKey = updates.originalDate.slice(0, 7);
        const path = \`data/events/\${oldMonthKey}.json\`;
        
        let events = [];
        try {
            const content = await MetaOS.readFile(path);
            events = JSON.parse(content);
        } catch (e) {
            return false;
        }

        const index = events.findIndex(e => e.id === id);
        if (index === -1) return false;
        
        const oldEvent = events[index];
        const newEvent = { ...oldEvent, ...updates };
        delete newEvent.originalDate; // Cleanup

        // Check if month changed
        const newMonthKey = newEvent.date.slice(0, 7);
        
        if (oldMonthKey !== newMonthKey) {
            // Remove from old file
            events.splice(index, 1);
            await MetaOS.saveFile(path, JSON.stringify(events, null, 2));
            
            // Add to new file
            // We can reuse addEvent logic but we want to keep the ID
            const newPath = \`data/events/\${newMonthKey}.json\`;
            let newEvents = [];
            try {
                const newContent = await MetaOS.readFile(newPath);
                newEvents = JSON.parse(newContent);
            } catch (e) {
                newEvents = [];
            }
            newEvents.push(newEvent);
            newEvents.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
            await MetaOS.saveFile(newPath, JSON.stringify(newEvents, null, 2));
        } else {
            // Update in place
            events[index] = newEvent;
            events.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
            await MetaOS.saveFile(path, JSON.stringify(events, null, 2));
        }
        
        return true;
    },

    async deleteEvent(id, date) {
        const monthKey = date.slice(0, 7);
        const path = \`data/events/\${monthKey}.json\`;
        
        try {
            const content = await MetaOS.readFile(path);
            let events = JSON.parse(content);
            const initLen = events.length;
            events = events.filter(e => e.id !== id);
            
            if (events.length !== initLen) {
                await MetaOS.saveFile(path, JSON.stringify(events, null, 2));
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    },

    async getEvents(month = null) {
        const m = month || this.getMonthKey();
        const path = \`data/events/\${m}.json\`;
        try {
            const content = await MetaOS.readFile(path);
            let events = JSON.parse(content);
            
            // Sort by date (ascending)
            events.sort((a, b) => {
                if (a.date < b.date) return -1;
                if (a.date > b.date) return 1;
                return 0;
            });
            
            return events;
        } catch (e) {
            return [];
        }
    },

    async getUpcomingEvents(limit = 5) {
        // Fetch current month and next month to ensure we show upcoming
        const currentMonth = this.getMonthKey();
        // Simple logic: just current month for now, sorted.
        // TODO: Support cross-month fetching
        let events = await this.getEvents(currentMonth);
        
        // Filter out past events (optional, but good for "Upcoming")
        const today = this.getCurrentDate();
        events = events.filter(e => e.date >= today);

        return events.slice(0, limit);
    },

    async getCalendarItems(targetMonth = null) {
        const targetM = targetMonth || this.getMonthKey();
        
        // 1. Get Events for the target month
        // Events are stored by their date's month, so this is straightforward.
        const events = await this.getEvents(targetM);
        const formattedEvents = events.map(e => ({
            ...e,
            type: 'event'
        }));

        // 2. Get Tasks
        // Tasks are scattered. We primarily check the current real-time month.
        // TODO: In the future, iterate recursively or maintain a master index.
        const currentM = this.getMonthKey();
        let tasks = await this.getTasks(currentM);

        // If target month is different, maybe check that one too (in case tasks were moved/archived there)
        if (targetM !== currentM) {
            const otherTasks = await this.getTasks(targetM);
            tasks = [...tasks, ...otherTasks];
        }

        const formattedTasks = tasks
            .filter(t => {
                if (!t.dueDate || t.status === 'completed') return false;
                // Check if due date falls in target month
                return t.dueDate.startsWith(targetM);
            })
            .map(t => ({
                id: t.id,
                title: t.title, // Removed [Task] prefix as styling handles it
                date: t.dueDate,
                time: '',
                type: 'task',
                original: t
            }));

        // 3. Merge and Sort
        const items = [...formattedEvents, ...formattedTasks];
        items.sort((a, b) => {
             if (a.date < b.date) return -1;
             if (a.date > b.date) return 1;
             return 0;
        });

        return items;
    },

    // --- Notes ---
    
    async getRecentNotes(limit = 5) {
        try {
            let files = [];
            try {
                files = await MetaOS.listFiles('data/notes/');
            } catch(e) {
                // Try without trailing slash
                files = await MetaOS.listFiles('data/notes');
            }
            
            if (!Array.isArray(files)) return [];

            const notes = files
                .filter(f => typeof f === 'string' && f.endsWith('.md'))
                .sort()
                .reverse()
                .slice(0, limit);
                
            return notes;
        } catch(e) {
            console.error("Failed to load notes", e);
            return [];
        }
    },

    // --- Shared UI Components ---

    injectTaskModal() {
        if (document.getElementById('shared-task-modal')) return;

        const modalHtml = \`
        <div id="shared-task-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center hidden z-50 backdrop-blur-sm transition-opacity duration-300">
            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg transform transition-all scale-100">
                <h3 class="text-lg font-bold mb-4 text-white flex items-center justify-between">
                    <span>Edit Task</span>
                    <button id="stm-close-btn" class="text-gray-500 hover:text-white">&times;</button>
                </h3>
                
                <input type="hidden" id="stm-id">
                
                <div class="space-y-4">
                    <div>
                        <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Task Name</label>
                        <input type="text" id="stm-title" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Due Date</label>
                            <input type="date" id="stm-date" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 scheme-dark">
                        </div>
                        <div>
                            <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Priority</label>
                            <select id="stm-priority" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="flex justify-between items-center mt-6">
                    <button id="stm-delete-btn" class="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Delete
                    </button>
                    <div class="flex gap-2">
                        <button id="stm-cancel-btn" class="px-4 py-2 text-gray-400 hover:text-white transition text-sm font-medium">Cancel</button>
                        <button id="stm-save-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg shadow-blue-900/20 transition transform active:scale-95 text-sm">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>\`;

        const div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div.firstElementChild);

        // Bind Events
        document.getElementById('stm-close-btn').onclick = App.closeTaskModal;
        document.getElementById('stm-cancel-btn').onclick = App.closeTaskModal;
        
        document.getElementById('stm-save-btn').onclick = async () => {
            const id = document.getElementById('stm-id').value;
            const title = document.getElementById('stm-title').value;
            const date = document.getElementById('stm-date').value;
            const priority = document.getElementById('stm-priority').value;

            if (!title.trim()) return;

            await App.updateTask(id, {
                title: title,
                dueDate: date,
                priority: priority
            });
            
            App.closeTaskModal();
            // File watcher triggers refresh
        };

        document.getElementById('stm-delete-btn').onclick = async () => {
             const id = document.getElementById('stm-id').value;
             if (confirm("Are you sure you want to delete this task?")) {
                await App.deleteTask(id);
                App.closeTaskModal();
             }
        };
    },

    async openTaskModal(taskId) {
        this.injectTaskModal(); // Ensure it exists
        
        const tasks = await this.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        document.getElementById('stm-id').value = task.id;
        document.getElementById('stm-title').value = task.title;
        document.getElementById('stm-date').value = task.dueDate || '';
        document.getElementById('stm-priority').value = task.priority || 'medium';

        const modal = document.getElementById('shared-task-modal');
        modal.classList.remove('hidden');
    },

    closeTaskModal() {
        const modal = document.getElementById('shared-task-modal');
        if (modal) modal.classList.add('hidden');
    }
};
`.trim();

    const REF_TASKS_JSON = JSON.stringify([
        { "id": "1", "title": "System Rebuilt (Distributed Data Mode)", "status": "completed", "created_at": new Date().toISOString() },
        { "id": "2", "title": "Try asking the AI to add a task", "status": "pending", "created_at": new Date().toISOString() }
    ], null, 2);
    
    // Helper to get current month key for default files
    const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

    const REF_CONFIG_JSON = JSON.stringify({
        "username": "User",
        "secretaryName": "MetaOS",
        "theme": "dark",
        "defaultView": "index.html",
        "dateFormat": "YYYY-MM-DD"
    }, null, 4);

    const REF_INIT_MD = `
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

    global.App.InitialFiles = {
        "index.html": REF_DASHBOARD,
        [`data/tasks/${CURRENT_MONTH}.json`]: REF_TASKS_JSON,
        [`data/events/${CURRENT_MONTH}.json`]: "[]",
        "data/notes/welcome.md": "# Welcome Note\nThis is your distributed data store.",
        "views/tasks.html": REF_TASKS_VIEW,
        "views/calendar.html": REF_CALENDAR_VIEW,
        "views/notes.html": REF_NOTES_VIEW,
        "js/app.js": REF_APP_JS,
        "system/config.json": REF_CONFIG_JSON,
        "system/init.md": REF_INIT_MD,
        "README.md": "# MetaOS\nRebuilt on MetaForge v2.2 Architecture."
    };

})(window);
