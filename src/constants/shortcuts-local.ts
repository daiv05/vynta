import type { ShortcutDefinition } from "./shortcut-types";

export const LOCAL_SHORTCUTS: ShortcutDefinition[] = [
  { id: "tool-select", label: "Mover", accelerator: "V" },
  { id: "tool-pen", label: "Lápiz", accelerator: "P" },
  { id: "tool-marker", label: "Marcador", accelerator: "M" },
  { id: "tool-rect", label: "Rectángulo", accelerator: "R" },
  { id: "tool-ellipse", label: "Elipse", accelerator: "O" },
  { id: "tool-arrow", label: "Flecha", accelerator: "A" },
  { id: "tool-text", label: "Texto", accelerator: "T" },
  { id: "tool-eraser", label: "Goma", accelerator: "E" },
  {
    id: "toggle-auto-erase",
    label: "Borrado automático",
    accelerator: "Ctrl+Shift+E",
  },
  {
    id: "toggle-dock",
    label: "Mostrar/Ocultar Dock",
    accelerator: "H",
  },
  {
    id: "toggle-smoothing",
    label: "Trazos suaves on/off",
    accelerator: "Ctrl+M",
  },
  { id: "undo", label: "Undo", accelerator: "Ctrl+Z" },
  { id: "redo", label: "Redo", accelerator: "Ctrl+Shift+Z" },
  { id: "clear", label: "Limpiar", accelerator: "Escape" },
];
