import { invoke } from "@tauri-apps/api/core";
import { ref } from "vue";

export function useOverlayWindow() {
  const overlayVisible = ref(false);
  const isUpdating = ref(false);

  async function setOverlayVisible(visible: boolean) {
    if (isUpdating.value) return;
    isUpdating.value = true;
    try {
      await invoke("set_overlay_visible", { visible });
    } finally {
      isUpdating.value = false;
    }
  }

  async function toggleOverlay() {
    await setOverlayVisible(!overlayVisible.value);
  }

  return {
    overlayVisible,
    setOverlayVisible,
    toggleOverlay,
  };
}
