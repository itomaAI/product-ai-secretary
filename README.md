
# MetaOS

**An Intelligent Personal Secretary System running entirely in your browser.**

Built with [MetaForge](https://github.com/itomaAI/product-auto-app-builder) (The AI App Builder).

[**Try it NOW!!**](https://itomaai.github.io/product-ai-secretary/)

---

## 🚀 Overview

MetaOS is not just a dashboard; it is a "Living System" managed by an AI.
Unlike traditional apps where you manually input data, MetaOS allows you to simply tell your AI secretary what to do, and it will update the underlying system files for you.

### Key Concepts
- **Host-Driven Intelligence**: The "Brain" (MetaForge AI) resides in the host environment and manipulates the "Body" (MetaOS Dashboard).
- **Single-Tenant Architecture**: Designed as a persistent partner, not a disposable project. Includes a "Time Machine" to rollback state.
- **Local Execution**: Runs 100% client-side using browser technologies (IndexedDB, VFS). No backend server required.

---

## ✨ Features

### 1. Intelligent Task Management
- **Chat Control**: Ask the AI: *"Add a meeting with Bob tomorrow at 10 AM"* or *"Mark the report task as done"*.
- **Dashboard UI**: A clean interface to view, toggle, and add tasks manually.
- **Distributed Data**: Tasks are stored in month-separated JSON files (`data/tasks/YYYY-MM.json`) for scalability.

### 2. Apps & Tools
- **Calendar**: Visual monthly calendar integrated with the event database.
- **Notes**: Markdown-based note-taking app with auto-save.
- **Monaco Editor**: A professional-grade code editor built into the host for direct file manipulation.

### 3. Time Machine (Backup & Recovery)
- **Auto-Backup**: The system creates snapshots every 30 minutes.
- **Smart Pruning**: Keeps recent backups but thins out older ones (1 per day after 24h, deletes after 2 weeks).
- **Instant Restore**: Rollback the entire OS state to any previous point in time.

### 4. Hackable & Self-Constructing
- **You are the Developer**: The entire Dashboard is just HTML/JS files in the VFS. You can edit them directly using the Monaco Editor.
- **AI Coding**: You can ask the AI to build new features.
    - *"Add a clock widget to the top right."*
    - *"Create a new view for tracking my expenses."*
    - The AI modifies the code, and the OS evolves instantly.

---

## 🛠️ Usage Guide

### Getting Started
1.  **Factory Reset**: If this is your first time or the UI looks broken, click the **Red Reset Icon** in the sidebar to initialize the filesystem.
2.  **Explore**: Use the sidebar to navigate Apps (Dashboard, Calendar, Notes).

### Interacting with AI
Type naturally in the chat panel on the right.
- "Add a task to buy milk."
- "What do I have scheduled for this month?"
- "Create a note about the project plan."

### Manual Control
- **Edit Files**: Open `data/` files in the file explorer to edit JSON directly. The dashboard updates in real-time.
- **Backup**: Click the **Save Icon** to create a manual snapshot before making big changes.

---

## 🏗️ Technical Architecture

### The Stack
- **Engine**: MetaForge v2.2 (Gemini-powered LLM loop).
- **Storage**: Virtual File System (VFS) backed by IndexedDB.
- **View**: HTML/JS Apps running in a sandboxed `iframe`.

### The Bridge
Host and Guest communicate via the `MetaOS Bridge`:
1.  **Host -> Guest**: Sends `file_changed` events when the AI or Editor modifies data. The Guest performs a "Hot Update" (re-renders without reloading).
2.  **Guest -> Host**: Sends `save_file` requests when you interact with the Dashboard.

---

*This project demonstrates the potential of "Self-Modifying AI Applications".*
