import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { onMounted, onUnmounted, ref } from "vue";

export interface MonitorContext {
  monitorId: string;
  virtualX: number;
  virtualY: number;
  width: number;
  height: number;
  scaleFactor: number;
}

export function useMonitorContext() {
  const monitorContext = ref<MonitorContext | null>(null);
  const isReady = ref(false);

  let unlisten: (() => void) | null = null;

  onMounted(async () => {
    unlisten = await listen<MonitorContext>("monitor-context", (event) => {
      console.log("[DEBUG] Received monitor-context event:", event.payload);
      monitorContext.value = event.payload;
      isReady.value = true;
    });

    const urlParams = new URLSearchParams(window.location.search);
    const monitorId = urlParams.get("monitorId");

    if (monitorId && !monitorContext.value) {
      try {
        const payload = await invoke<MonitorContext>("get_monitor_context", {
          monitor_id: monitorId,
        });
        monitorContext.value = payload;
        isReady.value = true;
      } catch {
        setTimeout(() => {
          if (!monitorContext.value) {
            console.warn(
              "Monitor context not received from backend, using defaults",
            );
            monitorContext.value = {
              monitorId,
              virtualX: 0,
              virtualY: 0,
              width: window.screen.width,
              height: window.screen.height,
              scaleFactor: window.devicePixelRatio || 1.0,
            };
            isReady.value = true;
          }
        }, 100);
      }
    } else if (!monitorId) {
      try {
        const payload = await invoke<MonitorContext>(
          "get_active_monitor_context",
        );
        monitorContext.value = payload;
        isReady.value = true;
      } catch {
        console.log(
          "[DEBUG] No monitorId in URL and active monitor fetch failed, defaulting to (0,0)",
        );
        monitorContext.value = {
          monitorId: "legacy",
          virtualX: 0,
          virtualY: 0,
          width: window.screen.width,
          height: window.screen.height,
          scaleFactor: window.devicePixelRatio || 1.0,
        };
        isReady.value = true;
      }
    }
  });

  onUnmounted(() => {
    if (unlisten) {
      unlisten();
    }
  });

  function toLocalCoordinates(globalX: number, globalY: number) {
    if (!monitorContext.value) {
      return { x: globalX, y: globalY };
    }

    const { virtualX, virtualY } = monitorContext.value;
    const scale = window.devicePixelRatio || 1.0;

    return {
      x: (globalX - virtualX) / scale,
      y: (globalY - virtualY) / scale,
    };
  }

  function toGlobalCoordinates(localX: number, localY: number) {
    if (!monitorContext.value) {
      return { x: localX, y: localY };
    }

    const { virtualX, virtualY } = monitorContext.value;
    const scale = window.devicePixelRatio || 1.0;

    return {
      x: localX * scale + virtualX,
      y: localY * scale + virtualY,
    };
  }

  function isInMonitor(globalX: number, globalY: number) {
    if (!monitorContext.value) {
      return true;
    }

    const { virtualX, virtualY, width, height } = monitorContext.value;
    return (
      globalX >= virtualX &&
      globalX < virtualX + width &&
      globalY >= virtualY &&
      globalY < virtualY + height
    );
  }

  return {
    monitorContext,
    isReady,
    toLocalCoordinates,
    toGlobalCoordinates,
    isInMonitor,
  };
}
