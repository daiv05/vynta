import { invoke } from "@tauri-apps/api/core";
import { ref } from "vue";
import { useSettingsStore } from "../stores/settings";

export function useZoomWindow() {
  const zoomVisible = ref(false);
  const isUpdating = ref(false);

  async function setZoomVisible(visible: boolean) {
    if (isUpdating.value) return;
    isUpdating.value = true;
    try {
      const settings = useSettingsStore();
      if (settings.zoomMotor === "magnifier") {
        if (visible) {
          const scaleFactor = window.devicePixelRatio || 1;
          const effectiveSize = Math.round(settings.zoomSize * scaleFactor);
          await invoke("mag_zoom_show", {
            size: effectiveSize,
            zoomLevel: settings.zoomLevel,
            shape: settings.zoomShape,
          });
        } else {
          await invoke("mag_zoom_hide");
        }
      } else {
        await invoke("set_zoom_visible", { visible });
      }
      zoomVisible.value = visible;
    } catch (err) {
      console.error("[useZoomWindow] magnifier error:", err);
    } finally {
      isUpdating.value = false;
    }
  }

  async function toggleZoomVisible() {
    await setZoomVisible(!zoomVisible.value);
  }

  return {
    zoomVisible,
    setZoomVisible,
    toggleZoomVisible,
  };
}
