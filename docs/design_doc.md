# Design Doc — _Vynta_

_Real-time screen annotation and highlighting app_
**Stack**: Tauri (Rust + WebView) + Vue 3

---

## Overview

Vynta will be a lightweight app for Windows that allows you to:

- **Annotate any part of the screen**
- **Highlight cursor and actions**
- **Spotlight / visual focus**
- **Dynamic zoom**
- **Quick tools with shortcuts**
- **Compatible with video conferencing & screencasting**

It is a native response to what _Presentify_ offers on macOS (annotations, cursor highlight, whiteboard, etc.) but for **Windows**, built with modern technologies and a **polished and customizable UX**. ([Presentify][2])

---

Translated with DeepL.com (free version)

## Common problems in the market

Based on reviews of similar tools:

- _Epic Pen_ has stability issues with Windows 11 and sometimes stops responding. ([Trustpilot][3])
- Some apps require sharing the entire screen for annotations to be visible in video calls, as their "invisible window" doesn't appear when sharing only an application. ([blog.rampatra.com][4])
- Zoom/spotlight and advanced tools are not always available with all drawing options. ([sqlbelle][5])
- Many apps do not have **interactive mode**: drawing + using apps without losing focus. ([App Store][6])

**Opportunity:** offer a stable, lightweight tool with better **UX/UI shortcuts, fluid interaction, and modern features** for Windows.

---

## Product Objectives

### Main Goal

Create a full-screen screen annotation app for **Windows** that exceeds comfort, stability, and flexibility in comparison to existing alternatives, focused on:

- **Presentations**
- **Educational videos/tutorials**
- **Remote demonstrations**
- **Collaborative visual review**

---

## Main features

---

### 1) Annotate on screen

**Description:**

Allows you to draw on any visible content — app, image, video, presentation or desktop — with:

- Pen / marker / shapes (circle, rectangle, arrow)
- Quick text
- Customizable color and thickness
- Undo/Redo
- Auto-erase and optional eraser timer

**UX Considerations:**

- Always accessible via global shortcuts.
- Floatable bar
- Soporte multi-monitor

---

### 2) Highlight cursor

**Description:**

- Halo around cursor with customizable color, size, shape
- Optional: Visibility only on move

_Inspired by Presentify and PointerFocus features._ ([Presentify][2])

---

### 3) Spotlight / foco

**Description:**

- Darkens the entire screen **except the area around the cursor** to draw attention.

Options:

- Size, shape and opacity
- Toggle shortcut
- Smooth transition

---

### 4) Dynamic zoom

Activates a **magnifying glass over the cursor** to magnify regions of interest without losing context.

Controls:

- Zoom level
- Magnifying glass size
- Toggle shortcut

---

### 5) Whiteboard and free layer

**Description:**

- Clean whiteboard as an alternative to drawing on apps in use.

Options:

- Independent panel
- Colored background
- Save capture
- Infinite layer

---

### 6) Export

**Description:**

- Whiteboard Export: Save the whiteboard content as an image (PNG).
- Screenshot: (In development 🚧) Capture the screen with annotations.
- Screen recording: (Planned 📅) Screen recording + annotations not implemented yet.

---

## UX / UI Considerations

---

### Floating control bar

Barra deslizable con:

- Drawing tools
- Color selector
- Pen size

Should be:

- Moveable
- Auto-hide configurable

---

### Global shortcuts

All modes should be accessible without using the mouse:

| Action                    | Example shortcut |
| ------------------------- | ---------------- |
| Start annotation          | Ctrl + 1         |
| Activate cursor highlight | Ctrl + 2         |
| Flash spotlight           | Ctrl + 3         |
| Whiteboard                | Ctrl + 4         |
| Toggle zoom               | Ctrl + 5         |

_(To be defined in final product — but essential for presenters)_

---

## Integrations required

### Videocalls & conferencing apps

Should work with:

- Teams, Zoom, Google Meet
- OBS / streaming

Important: able to **annotate when sharing the entire screen**, so that overlays appear correctly in the stream/livestream.

---

## Key differentiators from alternatives

---

| Feature                               | Vynta | Presentify | Epic Pen / PointerFocus  |
| ------------------------------------- | ----- | ---------- | ------------------------ |
| Native Windows                        | ✔️    | ❌ (macOS) | ✔️                       |
| Spotlight                             | ✔️    | ✔️         | ❓ limitada              |
| Dynamic zoom                          | ✔️    | ✔️         | ❌                       |
| Video recording                       | 📅    | ❌         | ❌                       |
| Export annotations (Whiteboard)       | ✔️    | ⚠️         | ⚠️                       |
| Recording + annotations               | 📅    | ❌         | ❌                       |
| Fully customizable shortcuts          | ✔️    | ✔️         | ✔️                       |
| Advanced floating toolbar             | ✔️    | ✔️         | simple                   |
| Compatible with modern apps and games | ✔️    | n/a        | ✔️ (but sometimes fails) |

---

## Technical architecture

### Stack selection

| Component    | Technology                            |
| ------------ | ------------------------------------- |
| Main shell   | **Tauri**                             |
| UI/Frontend  | **Vue 3 + Composition API**           |
| Renderer     | HTML5 Canvas/WebGL (para dibujo/zoom) |
| Build Target | Windows x64 + ARM64                   |
| Auto-update  | Squirrel / Tauri updater              |

### Internal modules

- **Overlay Engine** (Rust/WebView bridges)
- **Drawing Engine** (canvas with acceleration)
- **Cursor Enhancer**
- **Recording Module** (Planned 📅)
- **Hotkey Manager**

---

## References

[1]: https://setapp.com/es/apps/presentify?utm_source=chatgpt.com "Presentify in Setapp | Add annotations to your online presentations | Setapp"
[2]: https://presentifyapp.com/?utm_source=chatgpt.com "Screen Annotation, Cursor Highlight, Spotlight, Zoom - Presentify"
[3]: https://www.trustpilot.com/review/epic-pen.com?utm_source=chatgpt.com "Epic Pen Reviews 136"
[4]: https://blog.rampatra.com/presentify-not-working-with-zoom-or-other-video-calling-apps?utm_source=chatgpt.com "Presentify not working with Zoom or other video calling apps?"
[5]: https://www.sqlbelle.com/blog/annotate-and-draw-on-your-screen-zoomit-epicpen?utm_source=chatgpt.com "Annotate and Draw on your Screen for more Effective ..."
[6]: https://apps.apple.com/pe/app/presentify-screen-annotation/id1507246666?utm_source=chatgpt.com "App Presentify - Screen Annotation - App Store"
