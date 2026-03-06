import { invoke } from "@tauri-apps/api/core";

async function openWhiteboard() {
  await invoke("open_whiteboard_mode");
}

async function setWhiteboardVisible(visible: boolean) {
  await invoke("set_whiteboard_visible", { visible });
}

async function toggleWhiteboardVisible(current: boolean) {
  await setWhiteboardVisible(!current);
}

export function useWhiteboardWindow() {
  return {
    openWhiteboard,
    setWhiteboardVisible,
    toggleWhiteboardVisible,
  };
}
