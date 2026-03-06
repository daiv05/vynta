import { unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ShortcutDefinition } from "../constants/shortcuts";
import {
  buildAcceleratorCounts,
  getGlobalShortcutError,
  registerShortcut,
} from "./shortcutValidation";

export function useGlobalShortcuts(actions: {
  openDraw: () => void;
  openCursorHighlight: () => void;
  openSpotlight: () => void;
  openWhiteboard: () => void;
  openZoom: () => void;
  shortcuts: () => ShortcutDefinition[];
}) {
  const registered = ref(false);
  const shortcutErrors = ref<Record<string, string>>({});
  const lastTriggered = new Map<string, number>();

  function wrapHandler(id: string, handler: () => void, guard?: () => boolean) {
    return () => {
      if (guard && !guard()) return;
      const now = Date.now();
      const last = lastTriggered.get(id) ?? 0;
      if (now - last < 200) return;
      lastTriggered.set(id, now);
      handler();
    };
  }

  const handlers: Record<string, () => void> = {
    "open-draw": wrapHandler("open-draw", actions.openDraw),
    "open-cursor-highlight": wrapHandler(
      "open-cursor-highlight",
      actions.openCursorHighlight,
    ),
    "open-spotlight": wrapHandler("open-spotlight", actions.openSpotlight),
    "open-whiteboard": wrapHandler("open-whiteboard", actions.openWhiteboard),
    "open-zoom": wrapHandler("open-zoom", actions.openZoom),
  };

  async function registerShortcuts(force = false) {
    if (registered.value && !force) return;
    await unregisterAll();
    const shortcutList = actions.shortcuts();
    const relevantShortcuts = shortcutList.filter(
      (shortcut) => handlers[shortcut.id],
    );
    const counts = buildAcceleratorCounts(relevantShortcuts);
    const errors: Record<string, string> = {};

    for (const shortcut of shortcutList) {
      const handler = handlers[shortcut.id];
      if (!handler) continue;
      const validationError = getGlobalShortcutError(shortcut, counts);
      if (validationError) {
        errors[shortcut.id] = validationError;
        continue;
      }
      const registerError = await registerShortcut(shortcut, handler);
      if (registerError) {
        errors[shortcut.id] = registerError as string;
      }
    }
    shortcutErrors.value = errors;
    registered.value = true;
  }

  async function unregisterShortcuts() {
    if (!registered.value) return;
    await unregisterAll();
    registered.value = false;
    shortcutErrors.value = {};
  }

  onMounted(() => {
    registerShortcuts();
  });

  onBeforeUnmount(() => {
    unregisterShortcuts();
  });

  watch(
    () => actions.shortcuts(),
    () => {
      registerShortcuts(true);
    },
    { deep: true },
  );

  return {
    registerShortcuts,
    unregisterShortcuts,
    shortcutErrors,
  };
}
