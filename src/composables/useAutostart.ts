import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import type { Ref } from "vue";
import { onMounted, watch } from "vue";

enum AutostartState {
  Disabled,
  Enabled,
}

async function applyState(state: AutostartState) {
  if (state === AutostartState.Enabled) {
    await enable();
  } else {
    await disable();
  }
}

export function useAutostart(startWithWindows: Ref<boolean>) {
  let isHydrating = false;

  async function syncInitialState() {
    isHydrating = true;
    try {
      const enabled = await isEnabled();
      startWithWindows.value = enabled;
    } finally {
      isHydrating = false;
    }
  }

  onMounted(() => {
    syncInitialState();
  });

  watch(startWithWindows, (value: boolean) => {
    if (isHydrating) return;
    applyState(value ? AutostartState.Enabled : AutostartState.Disabled);
  });
}
