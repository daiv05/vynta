<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMonitorContext } from "../../composables/useMonitorContext";
import { useSettingsStore } from "../../stores/settings";
import type { AppSettings } from "../../types/settings";

const settingsStore = useSettingsStore();
const { zoomLevel, zoomSize, zoomShape, zoomMode } = storeToRefs(settingsStore);
const { toLocalCoordinates, toGlobalCoordinates, monitorContext, isReady: isMonitorReady } =
  useMonitorContext();

const position = ref({ x: 0, y: 0 });
const displayPosition = ref({ x: 0, y: 0 });
const isReady = ref(false);
let lastRenderTime = performance.now();

const canvas = ref<HTMLCanvasElement | null>(null);
const containerEl = ref<HTMLDivElement | null>(null);
const lastCanvas = ref({ width: 0, height: 0, dpr: 0 });
const screenshot = ref<CanvasImageSource | null>(null);
const freezeImageUrl = ref("");
let unlistenZoomFrame: (() => void) | null = null;
let rafId: number | null = null;
let unlistenSettings: (() => void) | null = null;
let unlistenZoomVisibility: (() => void) | null = null;
let streamRequested = false;
let configDebounce: number | null = null;
let lastCursorSample = { x: 0, y: 0, t: 0 };
const cursorVelocity = ref({ x: 0, y: 0 });
let sourceCanvas: HTMLCanvasElement | null = null;
let sourceCtx: CanvasRenderingContext2D | null = null;
let sourceImageData: ImageData | null = null;
let sourceSize = { width: 0, height: 0 };
let sourceBuffer: Uint8ClampedArray | null = null;

function decodeBase64(base64: string): Uint8ClampedArray {
  const bin = atob(base64);
  const len = bin.length;
  const out = new Uint8ClampedArray(len);
  for (let i = 0; i < len; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function updateCursorVelocity(x: number, y: number) {
  const now = performance.now();
  if (lastCursorSample.t > 0) {
    const dt = now - lastCursorSample.t;
    if (dt > 0) {
      cursorVelocity.value = {
        x: (x - lastCursorSample.x) / dt,
        y: (y - lastCursorSample.y) / dt,
      };
    }
  }
  lastCursorSample = { x, y, t: now };
}

function getCursorSpeed() {
  const vx = cursorVelocity.value.x;
  const vy = cursorVelocity.value.y;
  return Math.hypot(vx, vy);
}

function updateContainerStatic() {
  const el = containerEl.value;
  if (!el) return;
  const size = zoomSize.value;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = zoomShape.value === "circle" ? "50%" : "12px";
}

function updateContainerTransform() {
  const el = containerEl.value;
  if (!el) return;
  const size = zoomSize.value;
  const halfSize = size / 2;
  el.style.transform = `translate3d(${displayPosition.value.x - halfSize}px, ${displayPosition.value.y - halfSize}px, 0)`;
}

function updateCanvasSize() {
  if (!canvas.value) return;
  const size = zoomSize.value;
  const dpr = window.devicePixelRatio || 1;
  const targetWidth = Math.round(size * dpr);
  const targetHeight = Math.round(size * dpr);
  if (
    lastCanvas.value.width !== targetWidth ||
    lastCanvas.value.height !== targetHeight ||
    lastCanvas.value.dpr !== dpr
  ) {
    canvas.value.width = targetWidth;
    canvas.value.height = targetHeight;
    lastCanvas.value = { width: targetWidth, height: targetHeight, dpr };
  }
}

function renderZoom() {
  if (!canvas.value) return;
  const ctx = canvas.value.getContext("2d");
  if (!ctx) return;
  const img = screenshot.value;
  if (!img) return;
  if (sourceSize.width === 0 || sourceSize.height === 0) return;

  const size = zoomSize.value;
  const now = performance.now();
  const dt = Math.max(0.001, (now - lastRenderTime) / 1000);
  lastRenderTime = now;

  const speed = getCursorSpeed();
  const smoothRate = speed < 0.2 ? 28 : speed < 0.5 ? 20 : 14;
  const smoothing = 1 - Math.exp(-dt * smoothRate);
  
  const targetLocal = toLocalCoordinates(position.value.x, position.value.y);
    
  const dx = targetLocal.x - displayPosition.value.x;
  const dy = targetLocal.y - displayPosition.value.y;
  const deadband = speed < 0.2 ? 0.2 : 0;
  if (zoomMode.value === "live") {
    displayPosition.value = {
      x: targetLocal.x,
      y: targetLocal.y,
    };
  } else {
    displayPosition.value = {
      x: displayPosition.value.x + (Math.abs(dx) < deadband ? 0 : dx * smoothing),
      y: displayPosition.value.y + (Math.abs(dy) < deadband ? 0 : dy * smoothing),
    };
  }
  updateContainerTransform();

  if (zoomMode.value === "freeze") {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (zoomShape.value === "circle") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  ctx.drawImage(
    img,
    0,
    0,
    sourceSize.width,
    sourceSize.height,
    0,
    0,
    size,
    size,
  );

  if (zoomShape.value === "circle") {
    ctx.restore();
  }
}

function renderLoop() {
  renderZoom();
  rafId = requestAnimationFrame(renderLoop);
}

function handleFreezeMouseMove(e: MouseEvent) {
  const globalPos = toGlobalCoordinates(e.clientX, e.clientY);
  position.value = { x: globalPos.x, y: globalPos.y };
  updateCursorVelocity(globalPos.x, globalPos.y);
}

function handleFreezeWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.2 : 0.2;
  const newLevel = Math.max(1.0, Math.min(10.0, zoomLevel.value + delta));
  settingsStore.setZoomLevel(newLevel);
}

function handleFreezeKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    invoke('set_zoom_visible', { visible: false }).catch(console.error);
  }
}

function scheduleStreamConfig(delayMs = 60) {
  if (!streamRequested) return;
  if (configDebounce) {
    window.clearTimeout(configDebounce);
  }
  configDebounce = window.setTimeout(() => {
    const scaleFactor = monitorContext.value?.scaleFactor || 1;
    const effectiveSize = Math.round(zoomSize.value * scaleFactor);

    invoke("set_zoom_stream_config", {
      size: effectiveSize,
      zoomLevel: zoomLevel.value,
    });
    configDebounce = null;
  }, delayMs);
}

async function startStream() {
  const scaleFactor = monitorContext.value?.scaleFactor || 1;
  const effectiveSize = Math.round(zoomSize.value * scaleFactor);

  streamRequested = true;

  if (zoomMode.value === "freeze") {
    document.addEventListener("mousemove", handleFreezeMouseMove);
    document.addEventListener("keydown", handleFreezeKeydown);
    document.addEventListener("wheel", handleFreezeWheel, { passive: false });
    
    try {
      const pos: any = await invoke("get_cursor_position_global");
      position.value = { x: pos.x, y: pos.y };
      const localPos = toLocalCoordinates(pos.x, pos.y);
      displayPosition.value = { x: localPos.x, y: localPos.y };
      const dataUrl: string = await invoke("capture_monitor_frame", { cursorX: pos.x, cursorY: pos.y });
      
      const img = new Image();
      img.onload = () => {
        sourceSize = { width: img.naturalWidth, height: img.naturalHeight };
        screenshot.value = img;
        freezeImageUrl.value = dataUrl;
        isReady.value = true;
        
        setTimeout(() => {
          invoke("reveal_mode_window", { 
            modeStr: "zoom",
            width: Math.round(monitorContext.value?.width || 0),
            height: Math.round(monitorContext.value?.height || 0)
          }).catch(console.error);
        }, 50);
      };
      img.src = dataUrl;
      
      await invoke("set_zoom_capture_excluded", { excluded: false });
      await invoke("set_zoom_ignore_cursor_events", { ignore: false });
    } catch (e) {
      console.error("[ZoomShell] Failed to start freeze mode:", e);
      stopStream();
      invoke("set_zoom_visible", { visible: false }).catch(console.error);
    }
  } else {
    invoke("set_zoom_capture_excluded", { excluded: true }).catch(console.error);
    invoke("set_zoom_ignore_cursor_events", { ignore: true }).catch(console.error);
    invoke("unfreeze_zoom").catch(console.error);
    invoke("start_zoom_stream", {
      size: effectiveSize,
      zoomLevel: zoomLevel.value,
    }).then(() => {
      invoke("reveal_mode_window", { 
        modeStr: "zoom",
        width: Math.round(monitorContext.value?.width || 0),
        height: Math.round(monitorContext.value?.height || 0)
      }).catch(console.error);
    }).catch((err: unknown) => {
      console.error('[ZoomShell] Failed to start zoom stream:', err);
    });
  }
}

function stopStream(forceMode?: string) {
  const modeToStop = forceMode || zoomMode.value;
  if (modeToStop === "freeze") {
    freezeImageUrl.value = "";
    document.removeEventListener("mousemove", handleFreezeMouseMove);
    document.removeEventListener("keydown", handleFreezeKeydown);
    document.removeEventListener("wheel", handleFreezeWheel);
    invoke("set_zoom_capture_excluded", { excluded: true }).catch(console.error);
    invoke("set_zoom_ignore_cursor_events", { ignore: true }).catch(console.error);
  } else {
    invoke("stop_zoom_stream").catch((err: unknown) => {
      console.error('[ZoomShell] Failed to stop zoom stream:', err);
    });
  }
  streamRequested = false;
  isReady.value = false;
}

onMounted(async () => {
  await settingsStore.hydrate();

  unlistenSettings = await listen<Partial<AppSettings>>(
    "zoom-settings",
    (event) => {
      if (typeof event.payload.zoomLevel === "number") {
        settingsStore.setZoomLevel(event.payload.zoomLevel);
      }
      if (typeof event.payload.zoomSize === "number") {
        settingsStore.setZoomSize(event.payload.zoomSize);
      }
      if (event.payload.zoomShape) {
        settingsStore.setZoomShape(event.payload.zoomShape);
      }
      if (event.payload.zoomMode) {
        settingsStore.setZoomMode(event.payload.zoomMode);
      }
    },
  );

  unlistenZoomVisibility = await listen<{ visible: boolean }>(
    "zoom-visibility",
    (event) => {
      if (event.payload.visible) {
        screenshot.value = null;
        sourceCanvas = null;
        sourceCtx = null;
        sourceImageData = null;
        sourceBuffer = null;
        sourceSize = { width: 0, height: 0 };

        startStream();
      } else {
        stopStream();
        setTimeout(() => {
          invoke("execute_hide_mode", { modeStr: "zoom" }).catch(console.error);
        }, 220);
      }
    },
  );

  unlistenZoomFrame = await listen<{
    data: string;
    width: number;
    height: number;
    cursor_x: number;
    cursor_y: number;
  }>("zoom-frame", async (event) => {
    try {
      if (!sourceCanvas) {
        sourceCanvas = document.createElement("canvas");
        sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
      }
      if (!sourceCanvas || !sourceCtx) return;
      if (
        sourceSize.width !== event.payload.width ||
        sourceSize.height !== event.payload.height
      ) {
        sourceSize = {
          width: event.payload.width,
          height: event.payload.height,
        };
        sourceCanvas.width = event.payload.width;
        sourceCanvas.height = event.payload.height;
        sourceImageData = new ImageData(
          event.payload.width,
          event.payload.height,
        );
        sourceBuffer = sourceImageData.data;
      }
      if (sourceImageData) {
        const decoded = decodeBase64(event.payload.data);
        sourceBuffer?.set(decoded);
        sourceCtx.putImageData(sourceImageData, 0, 0);
        screenshot.value = sourceCanvas;
      }
      position.value = { x: event.payload.cursor_x, y: event.payload.cursor_y };
      updateCursorVelocity(event.payload.cursor_x, event.payload.cursor_y);
    } finally {
      if (streamRequested && zoomMode.value === "live") {
        isReady.value = true;
      }
      invoke("zoom_frame_consumed");
    }
  });

  updateCanvasSize();
  renderZoom();
  updateContainerStatic();
  updateContainerTransform();
  updateCanvasSize();

  if (isMonitorReady.value) {
    startStream();
  }

  rafId = requestAnimationFrame(renderLoop);
});

watch(
  () => isMonitorReady.value,
  (ready) => {
    if (ready && !streamRequested) {
      startStream();
    }
  },
);

watch(
  () => zoomSize.value,
  () => {
    updateCanvasSize();
    updateContainerStatic();
    updateContainerTransform();
    scheduleStreamConfig();
  },
);

watch(
  () => zoomLevel.value,
  () => {
    scheduleStreamConfig();
  },
);

watch(
  () => zoomMode.value,
  async (newVal, oldVal) => {
    if (newVal !== oldVal && streamRequested) {
      stopStream(oldVal);
      await startStream();
    }
  },
);

watch(
  () => monitorContext.value,
  () => {
    updateCanvasSize();
    scheduleStreamConfig();
  },
  { deep: true },
);

watch(
  () => zoomShape.value,
  () => {
    updateContainerStatic();
  },
);

onBeforeUnmount(() => {
  if (unlistenSettings) unlistenSettings();
  if (unlistenZoomVisibility) unlistenZoomVisibility();
  if (unlistenZoomFrame) unlistenZoomFrame();
  stopStream();
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (configDebounce) {
    clearTimeout(configDebounce);
    configDebounce = null;
  }
});
</script>

<template>
  <div class="zoom-shell" :style="{ pointerEvents: zoomMode === 'freeze' ? 'auto' : 'none' }">
    <div 
      v-if="zoomMode === 'freeze' && freezeImageUrl" 
      class="freeze-base"
      :style="{ 
        backgroundImage: `url(${freezeImageUrl})`,
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.2s ease-out'
      }"
    ></div>
    <div 
      v-if="zoomMode === 'freeze' && freezeImageUrl" 
      class="freeze-background" 
      :style="{ 
        backgroundImage: `url(${freezeImageUrl})`,
        transform: `scale(${isReady ? Math.max(1, zoomLevel) : 1})`,
        transformOrigin: `${displayPosition.x}px ${displayPosition.y}px`,
        clipPath: zoomShape === 'circle' 
          ? `circle(${(zoomSize / 2) / Math.max(1, zoomLevel)}px at ${displayPosition.x}px ${displayPosition.y}px)` 
          : `inset(${displayPosition.y - (zoomSize / 2) / Math.max(1, zoomLevel)}px calc(100% - ${displayPosition.x + (zoomSize / 2) / Math.max(1, zoomLevel)}px) calc(100% - ${displayPosition.y + (zoomSize / 2) / Math.max(1, zoomLevel)}px) ${displayPosition.x - (zoomSize / 2) / Math.max(1, zoomLevel)}px round ${12 / Math.max(1, zoomLevel)}px)`,
        filter: 'drop-shadow(0 8px 32px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))',
        transition: 'opacity 0.2s ease-out',
        opacity: isReady ? 1 : 0
      }"
    ></div>
    <div
      v-show="zoomMode !== 'freeze'"
      ref="containerEl"
      class="zoom-container"
      :style="{ opacity: isReady ? 1 : 0, transition: 'opacity 0.2s ease-out', pointerEvents: 'none' }"
    >
      <canvas ref="canvas" class="zoom-canvas" />
    </div>
  </div>
</template>

<style scoped>
.zoom-shell {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.freeze-base,
.freeze-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.freeze-base {
  z-index: 5;
}

.freeze-background {
  z-index: 10;
  will-change: transform, clip-path;
}

.zoom-container {
  position: absolute;
  overflow: hidden;
  will-change: transform;
  transform: translate3d(var(--x), var(--y), 0);
  background: transparent;
  z-index: 20;
  box-shadow: 0 12px 42px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.zoom-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
