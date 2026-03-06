# Vynta

> [!NOTE]
> **This is a personal side project** — an experiment to learn [Tauri](https://tauri.app/) and Rust. It grew more than expected, but it is still mostly vibe-coded. A webview-based app is not the ideal architecture for a screen-overlay tool performance-wise, and a pure-Rust rewrite is planned. Use it knowing that!

![Vynta Banner](/app-banner.webp)

**Vynta** is a modern Windows desktop tool for **real-time screen annotation and visual enhancement**. Think of it as the Windows alternative to Presentify — draw, highlight, spotlight, and zoom directly on your desktop without ever interrupting the app underneath.

---

## 👥 Who is it for?

| Audience | Use case |
|---|---|
| **Presenters** | Annotate slides and live demos on the fly |
| **Educators** | Record tutorials with drawings and zoom |
| **Content creators** | Stream or screencast with visual effects |
| **Remote teams** | Visual reviews and async walkthroughs |

---

## ✨ Features at a glance

| Mode | Shortcut | What it does |
|---|---|---|
| **✏️ Live Draw** | `Ctrl + 1` | Draw with pen, marker, shapes, arrows & text directly on screen |
| **🎯 Cursor Highlight** | `Ctrl + 2` | Add a visible halo around your cursor to guide attention |
| **🔦 Spotlight** | `Ctrl + 3` | Dim everything except the area around your cursor |
| **🎨 Whiteboard** | `Ctrl + 4` | Open a clean canvas with grid support — export as PNG |
| **🔍 Dynamic Zoom** | `Ctrl + 5` | Magnify any region with a configurable lens |

All shortcuts are **global** (work even when Vynta is not focused) and fully **customizable** from the settings panel.

### Highlights

- 🖌️ **Rich drawing tools** — gradient strokes, auto-erase, Bézier smoothing, quick color slots
- 🪟 **Non-intrusive overlays** — transparent windows on top of your desktop; other apps keep working (in certain cases)
- 🖥️ **Multi-monitor aware** — works seamlessly across multiple displays (one monitor at a time)
- 🌐 **Localized** — English and Spanish, more coming
- 💾 **Persistent settings** — all preferences saved automatically

---

## 💻 Requirements

| | Details |
|---|---|
| **OS** | Windows 10 / 11 (x64 or ARM64) |
| **Runtime** | WebView2 (pre-installed on Windows 10+) |
| **Disk** | ~30 MB |

---

## 📝 Documentation

- Visit <a href="https://vynta.deras.dev">Documentation</a> for more information.

---

## 📦 Installation options

### GitHub Releases

1. Download the latest release from [**GitHub Releases**](https://github.com/daiv05/vynta/releases)
2. Run the installer (`.msi` or `.exe`)
3. Launch Vynta from the Start Menu or system tray

### Microsoft Store

1. You can find Vynta in the Microsoft Store: [https://apps.microsoft.com/detail/9PDH2H0KDGHC](https://apps.microsoft.com/detail/9PDH2H0KDGHC)
2. Just install it from there

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

**Tech stack:** Rust · [Tauri v2](https://tauri.app/) · [Vue 3](https://vuejs.org/) + TypeScript · [Pinia](https://pinia.vuejs.org/) · [Lucide](https://lucide.dev/)

---

## 🗺️ Roadmap (highlights)

- 📸 Screenshot with annotations
- 🎥 Screen Recording with live overlay capture
- 📤 Advanced export options (profiles, cloud upload)
- 🖊️ Extended toolset (more shapes, notes, diagrams)
- 🌍 Cross-platform exploration (macOS / Linux)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](src-tauri/installer_assets/LICENSE.txt) file for details.

---

## 🤝 Contributing

This project is **open source** — contributions, bug reports, and ideas are welcome! Feel free to open an issue or a pull request.

---

<p align="center">
  Built with ❤️ by DDeras
</p>
