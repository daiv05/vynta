# Zoom / Magnifier

![Dynamic Zoom](/images/zoom.webp)

The **Zoom** feature provides a magnifying lens that follows your cursor, allowing you to enlarge any region of the screen without losing context.

**Default shortcut:** `Ctrl + 5`

## Motors (Engines)

Due to hardware and OS variations, Vynta provides two different zoom engines to ensure maximum compatibility. You can select the one that works best for your system:

### 1. DirectX (DXGI)
The default high-performance engine. It captures screen pixels directly using the GPU.
DXGI offers two distinct operating modes:
- **Live Mode**: The default behavior. It streams real-time screen content to the zoom lens. You can interact with other windows while the zoom is active. 
  ::: warning
  In Live mode, the zoom lens is NOT visible in screen shares, screenshots, or recordings.
  :::
- **Freeze Mode**: Creates a static, momentary capture of your entire screen. The zoom lens operates over this frozen image, making the lens **visible** in screenshots and screen recordings. You can also adjust the zoom level dynamically using the mouse wheel.

### 2. Magnification API
A native Windows magnifier integration. Use this motor if you experience compatibility issues, freezing, or black screens with the DXGI engine.
- You can interact with other windows while the zoom is active.
- The zoom lens is **visible** when taking screenshots or recording the screen.

## Configuration

| Setting | Options | Description |
|---|---|---|
| **Motor** | DXGI, Magnifier | The underlying capture engine |
| **Mode** *(DXGI only)* | Live, Freeze | Whether to show real-time content or a static capture |
| **Zoom level** | 1.5x - 5.0x | Magnification factor |
| **Lens size** | 100px - 400px | Diameter/dimensions of the zoom lens |
| **Shape** | Circle, Square | Shape of the magnifying lens |

## Technical Details

Depending on the selected motor and mode, the architecture differs:

**DXGI Live Mode** (`zoom.rs`):
1. Runs a continuous capture loop reading a rectangular region of screen pixels around the cursor.
2. The captured RGBA pixel data is **base64-encoded** as a PNG and streamed to the **Vue frontend** via Tauri events (`zoom-frame`).
3. Uses backpressure—waiting for the frontend to acknowledge each frame.
4. Adaptive FPS: **60 FPS** when moving, **30 FPS** when idle.

**Magnification API** (`magnifier.rs`):
1. Creates a native Win32 magnifier control on a dedicated thread.
2. Auto-excludes itself from its own capture to avoid recursive feedback.
3. Hooked into standard Windows features, offering excellent performance and recording compatibility.

## Use Cases

- **Code demos**: Magnify small text, variable names, or error messages.
- **Design reviews**: Zoom into pixel-level details of UI elements.
- **Accessibility**: Help viewers with limited screen resolution see fine details.
- **Teaching**: Enlarge formulas, diagrams, or small interface elements.

## Tips

- Use the **circle shape** for a natural magnifying glass feel.
- Use the **square shape** when zooming into tabular data or code blocks.
- Higher zoom levels work better with a larger lens size.
- If you need to record the zoom lens in real-time, switch to the **Magnification API** motor. If you need a static shot for a presentation, use **DXGI Freeze** mode.
