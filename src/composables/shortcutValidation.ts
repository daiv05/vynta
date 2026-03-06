import { register } from "@tauri-apps/plugin-global-shortcut";
import type { ShortcutDefinition } from "../constants/shortcut-types";

export function buildAcceleratorCounts(shortcutList: ShortcutDefinition[]) {
  const counts = new Map<string, number>();
  for (const shortcut of shortcutList) {
    if (!shortcut.accelerator) continue;
    counts.set(
      shortcut.accelerator,
      (counts.get(shortcut.accelerator) ?? 0) + 1,
    );
  }
  return counts;
}

export function getShortcutError(
  shortcut: ShortcutDefinition,
  counts: Map<string, number>,
) {
  if (!shortcut.accelerator) return "Sin combinación";
  if ((counts.get(shortcut.accelerator) ?? 0) > 1) return "Duplicada";
  return null;
}

function hasModifier(accelerator: string) {
  const pattern =
    /(^|\+)(commandorcontrol|ctrl|control|shift|alt|super|meta|cmd|command|win|windows)(\+|$)/i;
  return pattern.test(accelerator);
}

export function getGlobalShortcutError(
  shortcut: ShortcutDefinition,
  counts: Map<string, number>,
) {
  if (!shortcut.accelerator) return "Sin combinación";
  if (!hasModifier(shortcut.accelerator)) return "Requiere modificador";
  if ((counts.get(shortcut.accelerator) ?? 0) > 1) return "Duplicada";
  return null;
}

export async function registerShortcut(
  shortcut: ShortcutDefinition,
  handler: () => void,
) {
  try {
    await register(shortcut.accelerator, handler);
    return null;
  } catch (error: unknown) {
    return error instanceof String ? error : "";
  }
}
