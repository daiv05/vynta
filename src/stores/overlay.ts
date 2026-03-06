import { load } from "@tauri-apps/plugin-store";
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type { ToolId } from "../types/tools";
import type { OverlayDockOrientation } from "../types/ui";

export const useOverlayStore = defineStore("overlay", () => {
  const overlayDockOrientation = ref<OverlayDockOrientation>("horizontal");
  const enabledTools = ref<Record<ToolId, boolean>>({
    select: true,
    pen: true,
    marker: true,
    rect: true,
    ellipse: true,
    arrow: true,
    text: true,
    eraser: true,
    whiteboard: true,
    cursor: true,
    spotlight: true,
    zoom: true,
    line: true,
  });

  const selectedTool = ref<ToolId>("pen");

  function setOverlayDockOrientation(orientation: OverlayDockOrientation) {
    overlayDockOrientation.value = orientation;
  }

  function toggleToolEnabled(tool: ToolId, enabled: boolean) {
    enabledTools.value = {
      ...enabledTools.value,
      [tool]: enabled,
    };

    if (!enabled && selectedTool.value === tool) {
      const fallback = Object.entries(enabledTools.value).find(
        ([, value]) => value,
      );
      if (fallback) {
        selectedTool.value = fallback[0] as ToolId;
      }
    }
  }

  function setTool(tool: ToolId) {
    if (enabledTools.value[tool]) {
      selectedTool.value = tool;
    }
  }

  const ready = ref(false);
  const isHydrating = ref(false);
  let storeRef: Awaited<ReturnType<typeof load>> | null = null;
  let persistTimer: number | null = null;

  function snapshotOverlay() {
    return {
      overlayDockOrientation: overlayDockOrientation.value,
      enabledTools: enabledTools.value,
    };
  }

  function applyOverlay(stored: any) {
    if (stored.overlayDockOrientation) {
      overlayDockOrientation.value = stored.overlayDockOrientation;
    }
    if (stored.enabledTools) {
      enabledTools.value = { ...enabledTools.value, ...stored.enabledTools };
    }
  }

  async function persist() {
    const store = storeRef;
    if (!store) return;
    await store.set("app-overlay", snapshotOverlay());
    await store.save();
  }

  function schedulePersist() {
    if (isHydrating.value) return;
    if (persistTimer) {
      window.clearTimeout(persistTimer);
    }
    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      persist();
    }, 500);
  }

  async function hydrate() {
    if (ready.value) return;
    isHydrating.value = true;
    try {
      storeRef = await load("overlay.json", { autoSave: false, defaults: {} });
      const stored = await storeRef.get<any>("app-overlay");
      if (stored) {
        applyOverlay(stored);
      } else {
        await persist();
      }
    } catch (err) {
      console.error("Failed to hydrate overlay:", err);
    } finally {
      isHydrating.value = false;
      ready.value = true;
    }
  }

  watch(
    () => snapshotOverlay(),
    () => schedulePersist(),
    { deep: true },
  );

  return {
    ready,
    hydrate,
    overlayDockOrientation,
    enabledTools,
    selectedTool,
    setOverlayDockOrientation,
    toggleToolEnabled,
    setTool,
  };
});
