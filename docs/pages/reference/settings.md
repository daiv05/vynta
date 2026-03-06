# Settings

All Vynta settings are accessible from the main configuration window and are **automatically saved** to disk. This page documents every configurable option.

## Persistence

Settings are stored using **Tauri's plugin-store** as a JSON file on disk. Changes are saved with a debounce delay to avoid excessive writes. On startup, settings are hydrated from the saved file.

The **"Restore preferences"** option restores the layout and settings to their default values.

## Drawing Settings

| Setting | Type | Description |
|---|---|---|
| **Stroke color** | Color | Default drawing color |
| **Stroke width** | Number | Default stroke thickness |
| **Text font** | Select | Font family for the text tool (Inter, Arial, Courier New, etc.) |
| **Text size** | Number | Default font size for text tool |
| **Fill opacity** | Number (0–1) | Fill transparency for shapes |
| **Smoothing** | Toggle | Enable Bézier smoothing on freehand strokes |

### Gradient Settings

| Setting | Type | Description |
|---|---|---|
| **Gradient enabled** | Toggle | Use gradient colors instead of solid |
| **Gradient type** | Select | Linear or Radial |
| **Gradient angle** | Number | Angle for linear gradients (degrees) |
| **Gradient stops** | List | Color + position pairs defining the gradient |

### Auto-Erase

| Setting | Type | Description |
|---|---|---|
| **Auto-erase enabled** | Toggle | Annotations fade out after a delay |
| **Auto-erase delay** | Number (seconds) | How long before strokes start fading |

### Quick Color Slots

Save frequently used colors in quick-access slots for fast switching during annotation sessions.

### Enabled Tools

Individual tools can be **shown or hidden** in the overlay toolbar. Disable tools you don't use to keep the toolbar compact.

## Cursor Highlight Settings

| Setting | Type | Description |
|---|---|---|
| **Color** | Color | Halo fill color |
| **Size** | Number | Halo radius |
| **Shape** | Select | Circle, Square, or Diamond |

## Spotlight Settings

| Setting | Type | Description |
|---|---|---|
| **Backdrop color** | Color | Color of the darkened area |
| **Radius** | Number | Size of the clear area |
| **Opacity** | Number (0–1) | Backdrop darkness level |

## Dynamic Zoom Settings

| Setting | Type | Description |
|---|---|---|
| **Zoom level** | Number | Magnification factor |
| **Lens size** | Number | Diameter of the zoom lens |
| **Shape** | Select | Circle or Square |
| **Mode** | Select | **Live** (real-time magnification) or **Freeze** (takes a static snapshot of the screen) |
| **Capture Engine** | Select | **DXGI** (high performance) or **Magnifier** API (fixes compatibility with screen recording tools like OBS) |

## Whiteboard Settings

| Setting | Type | Description |
|---|---|---|
| **Grid enabled** | Toggle | Show grid lines on the canvas |

## General Settings

| Setting | Type | Description |
|---|---|---|
| **Start with Windows** | Toggle | Launch Vynta on system startup |
| **Restore preferences on launch** | Toggle | Load saved settings on startup |
| **Preview enabled** | Toggle | Show live preview of overlay in settings |
| **Language** | Select | English / Spanish (and more coming soon) |

## Layout Persistence

The following positions are saved and restored between sessions:

- **Overlay toolbar position** (x, y coordinates and screen size)
- **Overlay toolbar orientation** (horizontal / vertical)
- **Whiteboard toolbar position** (x, y coordinates)
