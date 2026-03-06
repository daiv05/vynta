import { invoke } from "@tauri-apps/api/core";

async function showConfiguration() {
  await invoke("show_configuration_window");
}

export function useMainWindow() {
  return {
    showConfiguration,
  };
}
