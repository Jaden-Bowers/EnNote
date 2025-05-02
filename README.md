# 📝 EnNote

**EnNote** is a modern, and cross-platform notepad application with optional encryption. Built using [Tauri](https://tauri.app/) and [Vite](https://vitejs.dev/), EnNote runs natively on Windows, macOS, and Linux with minimal system resource usage.

---

## ✨ Features

- 🖊️ Simple, distraction-free text editor
- 🔐 Optional AES-256 encryption with password hashing
- 💾 "Save As", "Open", and persistent file caching
- ⚙️ Font size control and encryption settings
- 📂 File browser for directory navigation
- 💡 Auto-title, unsaved changes indicator, and file type association (`.ennote`)

---

## 📦 Installation

Download the latest version for your platform from the [Releases](https://github.com/Jaden-Bowers/EnNote/releases/) page.

- **Windows:** `.msi` or `.exe` installer
- **macOS:** `.dmg` or `.app` (_Currently in the works_)
- **Linux:** `.deb` or `.AppImage` (_Currently in the works_)

> Update your system settings to Double-click `.ennote` files to open them in EnNote

---

## 🛠️ Development Setup

```bash
# Clone the repo
git clone https://github.com/your-username/ennote.git
cd ennote

# Install dependencies
npm install

# Run in dev mode
npm run tauri dev
