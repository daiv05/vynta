# Frontend Architecture

The frontend is built with **Vue 3** using the **Composition API** (`<script setup lang="ts">`) and **TypeScript** throughout. It is designed to be lightweight, reacting directly to state changes and commands originating from both user interactions and the Rust backend.

## Directory Structure

```
src/
├── App.vue                  # Entry point & shell router (conditional rendering)
├── main.ts                  # Vue app initialization
├── i18n.ts                  # Vue I18n setup
├── components/
│   ├── app/                 # Main settings UI
│   │   ├── AppShell.vue     # Settings window shell
│   │   ├── AppPanel.vue     # Panel container
│   │   └── panels/          # Settings sub-panels
│   │       ├── HomeModes.vue     # Mode configuration (zoom, spotlight, etc.)
│   │       ├── HomeTools.vue     # Tool configuration (drawing colors/sizes)
│   │       ├── HotkeysPanel.vue  # Shortcut editor
│   │       └── SettingsPanel.vue # General settings (autostart, language)
│   ├── overlay/             # Overlay mode components
│   │   ├── OverlayShell.vue          # Drawing overlay
│   │   ├── CursorHighlightShell.vue  # Cursor halo
│   │   ├── SpotlightShell.vue        # Spotlight effect
│   │   └── ZoomShell.vue             # Zoom lens (rendered only for DXGI backend)
│   ├── whiteboard/
│   │   └── WhiteboardShell.vue       # Whiteboard canvas
│   ├── shared/              # Shared components across shells
│   ├── modals/              # Modal dialogs
│   └── ui/                  # Reusable UI components
│       └── ToastManager.vue # Global toast notifications
├── composables/             # Reusable Composition API logic
├── stores/                  # Pinia state stores
├── types/                   # TypeScript type definitions
├── constants/               # Static system constants
├── locales/                 # i18n translation JSONs
└── utils/                   # Pure utility modules
    └── canvas/              # Canvas rendering and logic helpers
```

## Component Patterns

### Shell Components (Pseudo-Router)

Vynta eschews `vue-router` in favor of conditional shell rendering within `App.vue`. The active shell is dictated by the URL query parameters injected by the Rust backend when spawning the window.

- **AppShell**: The primary configuration interface.
- **OverlayShell**: A completely transparent Canvas layer spanning the monitor for annotations.
- **CursorHighlightShell**: A tight window tracing the OS cursor to render a highlight halo.
- **SpotlightShell**: A full-screen dimming overlay that renders a transparent cutout around the cursor.
- **ZoomShell**: A window displaying the magnified screen region. *Note: As Vynta supports multiple zoom engines, this shell is only rendered if the `dxgi` engine is active; the `magnifier` engine uses a pure OS-level window without a WebView.*
- **WhiteboardShell**: An opaque Canvas mode for standalone drawing.

Shells are **self-contained** ecosystems—they initialize their own event listeners bridging to Rust and handle their internal canvases.

### Settings Panels

The `AppShell` employs a panel-based structure:
- **HomeModes**: Tunes visual attributes for modes like Zoom (e.g., lens size, factor) and Spotlight.
- **HomeTools**: Sets drawing tool defaults, custom color palettes, and stroke thicknesses.
- **HotkeysPanel**: Validates and allows rebinding of global OS shortcuts.
- **SettingsPanel**: Manages startup behavior, UI language, and other generalized system preferences.

## Composables (`src/composables`)

Business and integration logic is decoupled from components into composables:

| Composable | Purpose |
|---|---|
| `useCanvasDrawing` | **Core Drawing Engine:** Strokes, shapes, text, undo/redo, auto-erase mechanisms. |
| `useGlobalShortcuts` | Binds interactions with the Rust hotkey manager. |
| `useLocalShortcuts` | Key bindings active only while an overlay is focused (e.g., tool switching). |
| `shortcutValidation` | Formatter and sanity checker for ensuring user hotkey inputs are valid Windows bindings. |
| `useOverlayWindow` | Manages the Vue lifecycle bindings for the main drawing overlay. |
| `useCursorHighlightWindow` | Syncs the highlight halo state. |
| `useSpotlightWindow` | Syncs the spotlight effect state. |
| `useZoomWindow` | Syncs the zoom lens state. |
| `useWhiteboardWindow` | Setup logic for the opaque whiteboard mode. |
| `useMainWindow` | Manages the main configuration window lifecycle. |
| `useMonitorContext` | Identifies which monitor a specific window belongs to for multi-monitor support. |
| `useToolState` | A reactive wrapper around the active drawing tool, its color, and its stroke width. |
| `useAutostart` | High-level interactions with the Windows OS startup registry via Tauri. |

### Drawing Engine Architecture

`useCanvasDrawing` is the largest composable and powers both the `OverlayShell` and `WhiteboardShell`. It abstracts HTML5 Canvas operations:
- **Pointer Handlers**: Calculates deltas and pressure sensitivity (if hardware supports it).
- **Tool Logic**: Distinct paths for rendering brushes, highlighters, rectangles, ellipses, lines, and typed text.
- **Smoothing**: Applies Bézier curves to raw pointer data to produce smooth, aesthetic freehand strokes.
- **Event History**: Maintains a robust Undo/Redo stack holding explicit action records.
- **Auto-Erase (Ghost Mode)**: Engages a timer to fade out strokes fluidly using `requestAnimationFrame`.
- **Hit Testing**: Provides structural detection on rasterized strokes (for the eraser or selection tool).

## Pinia State Management (`src/stores`)

| Store | Purpose |
|---|---|
| `settings` | Comprehensive, disk-persisted source of truth for all user preferences (colors, bindings, engine choices like Zoom Motor). |
| `tools` | Ephemeral state handling the active tool, shared seamlessly across different window contexts. |
| `overlay` | Runtime tracking for the overlay system (e.g., indicating whether drawing is currently active). |
| `toast` | Centralized queue for dispatching and tearing down UI notifications. |

The `settings` store handles serialization through the `@tauri-apps/plugin-store`, persisting to a local JSON automatically on value mutation (with debouncing to prevent disk thrashing).

## Type System (`src/types`)

Vynta leverages strict TypeScript typing to ensure consistency between Vue state and Rust payload structures:
- `tools.ts` — Definition unions for tools (e.g., `'pen' | 'marker' | 'eraser'`).
- `modes.ts` — Types backing complex behaviors (e.g., zoom backends, spotlight shapes).
- `drawing.ts` — Structural interfaces for coordinate points, stroke paths, and drawing actions.
- `settings.ts` — The massive interface strictly defining every field within the settings disk representation.

## Internationalization (i18n)

UI language is dynamically interchangeable between English (`en`) and Spanish (`es`) (and future languages) via `vue-i18n`. The locale is bound to the `settings` store, enforcing consistent translations across the main interface, the shells, and all dialogs recursively.
