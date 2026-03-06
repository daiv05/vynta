import type { Ref } from "vue";
import { computed } from "vue";
import type { ShortcutDefinition } from "../constants/shortcut-types";
import type { ToolId } from "./useToolState";

export type LocalShortcutHandlers = {
  shortcuts: Ref<ShortcutDefinition[]>;
  enabledTools: Ref<Record<ToolId, boolean>>;
  setTool: (tool: ToolId) => void;
  toggleAutoErase: () => void;
  toggleSmoothing: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  toggleDock?: () => void;
};

const LOCAL_SHORTCUT_IDS = new Set([
  "tool-select",
  "tool-pen",
  "tool-marker",
  "tool-rect",
  "tool-ellipse",
  "tool-arrow",
  "tool-text",
  "tool-eraser",
  "toggle-auto-erase",
  "toggle-smoothing",
  "undo",
  "redo",
  "clear",
  "toggle-dock",
]);

function normalizeToken(token: string) {
  const lower = token.trim().toLowerCase();
  if (["commandorcontrol", "ctrl", "control", "cmd", "command"].includes(lower))
    return "cmdorctrl";
  if (["super", "meta", "win", "windows"].includes(lower)) return "super";
  if (lower === "shift") return "shift";
  if (lower === "alt" || lower === "option") return "alt";
  return token.length === 1 ? token.toUpperCase() : token;
}

function normalizeAccelerator(accelerator: string) {
  if (!accelerator) return "";
  const parts = accelerator.split("+").map(normalizeToken);
  return parts.join("+");
}

function formatKey(event: KeyboardEvent) {
  if (event.code === "Space") return "Space";
  if (event.code.startsWith("Key")) return event.code.replace("Key", "");
  if (event.code.startsWith("Digit")) return event.code.replace("Digit", "");
  if (event.code.startsWith("Numpad"))
    return event.code.replace("Numpad", "Num");
  if (event.code.startsWith("Arrow")) return event.code;
  if (event.code.startsWith("F")) return event.code;
  return event.key.length === 1 ? event.key.toUpperCase() : event.code;
}

function isModifierKey(event: KeyboardEvent) {
  const modifierKeys = ["Shift", "Control", "Alt", "Meta"];
  if (modifierKeys.includes(event.key)) return true;
  return (
    event.code.includes("Shift") ||
    event.code.includes("Control") ||
    event.code.includes("Alt") ||
    event.code.includes("Meta")
  );
}

function eventToAccelerator(event: KeyboardEvent) {
  if (isModifierKey(event)) return "";
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("CommandOrControl");
  if (event.metaKey) parts.push("Super");
  if (event.shiftKey) parts.push("Shift");
  if (event.altKey) parts.push("Alt");
  parts.push(formatKey(event));
  return normalizeAccelerator(parts.join("+"));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (["input", "textarea", "select"].includes(tag)) return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest(".text-input"));
}

export function useLocalShortcuts(handlers: LocalShortcutHandlers) {
  const localShortcutMap = computed(() => {
    const map = new Map<string, string>();
    handlers.shortcuts.value.forEach((shortcut) => {
      if (!LOCAL_SHORTCUT_IDS.has(shortcut.id)) return;
      map.set(normalizeAccelerator(shortcut.accelerator), shortcut.id);
    });
    return map;
  });

  function applyToolShortcut(id: string) {
    const toolMap: Record<string, ToolId> = {
      "tool-select": "select",
      "tool-pen": "pen",
      "tool-marker": "marker",
      "tool-rect": "rect",
      "tool-ellipse": "ellipse",
      "tool-arrow": "arrow",
      "tool-text": "text",
      "tool-eraser": "eraser",
    };
    const tool = toolMap[id];
    if (!tool) return;
    if (!handlers.enabledTools.value[tool]) return;
    handlers.setTool(tool);
  }

  function handleLocalShortcut(event: KeyboardEvent) {
    if (isEditableTarget(event.target)) return;
    const accelerator = eventToAccelerator(event);
    if (!accelerator) return;
    const id = localShortcutMap.value.get(accelerator);
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    if (id.startsWith("tool-")) {
      applyToolShortcut(id);
      return;
    }
    if (id === "toggle-smoothing") {
      handlers.toggleSmoothing();
      return;
    }
    if (id === "toggle-auto-erase") {
      handlers.toggleAutoErase();
      return;
    }
    if (id === "undo") {
      handlers.undo();
      return;
    }
    if (id === "redo") {
      handlers.redo();
      return;
    }
    if (id === "clear") {
      handlers.clear();
      return;
    }
    if (id === "toggle-dock") {
      handlers.toggleDock?.();
    }
  }

  return {
    handleLocalShortcut,
  };
}
