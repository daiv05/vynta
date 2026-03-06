import type { ShortcutDefinition } from "./shortcut-types";

export const GLOBAL_SHORTCUTS: ShortcutDefinition[] = [
  { id: "open-draw", label: "Abrir Live Draw", accelerator: "Ctrl+1" },
  {
    id: "open-cursor-highlight",
    label: "Abrir Cursor Highlight",
    accelerator: "Ctrl+2",
  },
  {
    id: "open-spotlight",
    label: "Abrir Focus Spotlight",
    accelerator: "Ctrl+3",
  },
  { id: "open-whiteboard", label: "Abrir Whiteboard", accelerator: "Ctrl+4" },
  { id: "open-zoom", label: "Abrir Zoom", accelerator: "Ctrl+5" },
];
