# Getting Started

## What is Vynta?

**Vynta** is a lightweight Windows desktop application for **real-time screen annotation and visual enhancement**. Built with [Tauri](https://tauri.app/) and [Vue 3](https://vuejs.org/), it provides a suite of tools for presenters, educators, and content creators.

Think of it as the **Windows alternative to Presentify** — annotations, cursor highlighting, spotlight, zoom, and whiteboard — all in one app.

### Who is it for?

- **Presenters** giving live demos or slide presentations
- **Educators** recording tutorials or teaching online
- **Content creators** streaming or recording screencasts
- **Teams** doing visual reviews in remote meetings

## Requirements

| Requirement | Details |
|---|---|
| **OS** | Windows 10/11 (x64 or ARM64) |
| **Runtime** | WebView2 (included in Windows 10+) |
| **Disk space** | ~30 MB |

## Installation

1. Download the latest release from [GitHub Releases](https://github.com/daiv05/vynta/releases)
2. Run the installer (`.msi` or `.exe`)
3. Launch Vynta from the Start Menu or system tray

## Quick Tour

After launching Vynta, you'll see the **main settings window** where you can configure all modes. The app lives in your **system tray** — use it to toggle modes or open settings.

### Modes

Vynta has five independent modes, each activated by a global shortcut:

| Mode | Default Shortcut | Description |
|---|---|---|
| **Live Draw** | `Ctrl + 1` | Draw annotations on screen |
| **Cursor Highlight** | `Ctrl + 2` | Show a halo around your cursor |
| **Spotlight** | `Ctrl + 3` | Focus attention with a spotlight effect |
| **Whiteboard** | `Ctrl + 4` | Open a clean canvas for drawing |
| **Dynamic Zoom** | `Ctrl + 5` | Magnify areas of the screen |

Each mode opens as a **separate transparent window** that overlays your desktop (except whiteboard), so annotations and effects are visible when screen sharing.

### Floating Toolbar

When **Live Draw** or **Whiteboard** is active, a floating toolbar appears with:

- Drawing tools (pen, marker, shapes, text, eraser)
- Color and stroke width controls
- Undo / Redo buttons
- Clear canvas

The toolbar is **draggable** — position it wherever works best for your workflow. You can also toggle its visibility by pressing `H`.

## Next Steps

- Explore each feature in detail: [Live Draw](/features/live-draw), [Cursor Highlight](/features/cursor-highlight), [Spotlight](/features/spotlight), [Dynamic Zoom](/features/zoom), [Whiteboard](/features/whiteboard)
- Configure [keyboard shortcuts](/reference/shortcuts) to fit your workflow
- Adjust [settings](/reference/settings) for colors, sizes, and behavior
