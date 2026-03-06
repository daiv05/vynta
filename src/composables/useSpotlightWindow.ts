import { invoke } from "@tauri-apps/api/core";
import { ref } from "vue";

export function useSpotlightWindow() {
  const spotlightVisible = ref(false);
  const isUpdating = ref(false);

  async function setSpotlightVisible(visible: boolean) {
    if (isUpdating.value) return;
    isUpdating.value = true;
    try {
      await invoke("set_spotlight_visible", { visible });
    } finally {
      isUpdating.value = false;
    }
  }

  async function toggleSpotlightVisible() {
    await setSpotlightVisible(!spotlightVisible.value);
  }

  return {
    spotlightVisible,
    setSpotlightVisible,
    toggleSpotlightVisible,
  };
}
