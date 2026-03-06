import { invoke } from "@tauri-apps/api/core";
import { ref } from "vue";

export function useCursorHighlightWindow() {
  const cursorHighlightVisible = ref(false);
  const isUpdating = ref(false);

  async function setCursorHighlightVisible(visible: boolean) {
    if (isUpdating.value) return;
    isUpdating.value = true;
    try {
      await invoke("set_cursor_highlight_visible", { visible });
    } finally {
      isUpdating.value = false;
    }
  }

  async function toggleCursorHighlight() {
    await setCursorHighlightVisible(!cursorHighlightVisible.value);
  }

  return {
    cursorHighlightVisible,
    setCursorHighlightVisible,
    toggleCursorHighlight,
  };
}
