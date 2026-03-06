<script setup lang="ts">
import { emit, listen } from "@tauri-apps/api/event";
import { Download, LogOut, Minus, Plus, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useLocalShortcuts } from "../../composables/useLocalShortcuts";
import { useMainWindow } from "../../composables/useMainWindow";
import { useToolState } from "../../composables/useToolState";
import { ALL_SHORTCUTS } from "../../constants/shortcuts";
import { useOverlayStore } from "../../stores/overlay";
import { useSettingsStore } from "../../stores/settings";
import { useToastStore } from "../../stores/toast";
import { useToolsStore } from "../../stores/tools";
import type { GradientStop } from "../../types/drawing";
import type { OverlayAction, OverlayPayload } from "../../types/overlay";
import type { ToolId } from "../../types/tools";
import type { QuickColorSlot } from "../../types/ui";
import CanvasStage from "../shared/CanvasStage.vue";
import FloatingDock from "../shared/FloatingDock.vue";

const settingsStore = useSettingsStore();
const overlayStore = useOverlayStore();
const toolsStore = useToolsStore();

const {
  strokeColor,
  strokeWidth,
  textFont,
  textSize,
  smoothingEnabled,
  autoEraseDelay,
  gradientEnabled,
  gradientType,
  gradientAngle,
  gradientStops,
  fillOpacity,
  autoEraseEnabled,
  whiteboardGridEnabled,
  shortcutMap,
  whiteboardDockPosition,
} = storeToRefs(settingsStore);

const { enabledTools, selectedTool, overlayDockOrientation } =
  storeToRefs(overlayStore);

const { quickColorSlots } = storeToRefs(toolsStore);
const { t } = useI18n();
const { addToast } = useToastStore();

const { canvasNonce, clearCanvas } = useToolState();

const shortcuts = computed(() => {
  return ALL_SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    accelerator: shortcutMap.value[shortcut.id] ?? shortcut.accelerator,
  }));
});

let localShortcutListener: ((event: KeyboardEvent) => void) | null = null;

const { handleLocalShortcut } = useLocalShortcuts({
  shortcuts,
  enabledTools,
  setTool: overlayStore.setTool,
  toggleAutoErase: () =>
    settingsStore.setAutoEraseEnabled(!autoEraseEnabled.value),
  toggleSmoothing: () =>
    settingsStore.setSmoothingEnabled(!smoothingEnabled.value),
  undo: handleUndo,
  redo: handleRedo,
  clear: handleClear,
  toggleDock: handleToggleDock,
});

const canvasStageRef = ref<InstanceType<typeof CanvasStage> | null>(null);
const dockRef = ref<HTMLDivElement | null>(null);
const isApplyingRemote = ref(false);
const { showConfiguration } = useMainWindow();
const zoomLevelDisplay = ref(100);

function zoomStep(delta: number) {
  const current = zoomLevelDisplay.value;
  const next = Math.min(200, Math.max(50, current + delta));
  applyZoom(next);
}

function onZoomInput() {
  applyZoom(Number(zoomLevelDisplay.value));
}

function applyZoom(level: number) {
  zoomLevelDisplay.value = level;
  canvasStageRef.value?.setZoom?.(level);
}

watch(
  () => canvasStageRef.value?.visualScale,
  (scale) => {
    if (scale) {
      zoomLevelDisplay.value = Math.round(scale * 100);
    }
  },
);
const dockPosition = ref({ ...whiteboardDockPosition.value });
const dockHidden = ref(false);
const dragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

function startDockDrag(event: PointerEvent) {
  if (event.button !== 0) return;
  const dock = dockRef.value;
  if (!dock) return;
  dragging.value = true;
  dragOffset.value = {
    x: event.clientX - dockPosition.value.x,
    y: event.clientY - dockPosition.value.y,
  };
  globalThis.addEventListener("pointermove", handleDockDrag);
  globalThis.addEventListener("pointerup", stopDockDrag);
}

function handleDockDrag(event: PointerEvent) {
  if (!dragging.value) return;
  const dock = dockRef.value;
  const width = dock?.offsetWidth ?? 320;
  const height = dock?.offsetHeight ?? 520;
  const nextX = event.clientX - dragOffset.value.x;
  const nextY = event.clientY - dragOffset.value.y;
  const maxX = Math.max(0, globalThis.innerWidth - width - 12);
  const maxY = Math.max(0, globalThis.innerHeight - height - 12);
  dockPosition.value = {
    x: Math.min(Math.max(0, nextX), maxX),
    y: Math.min(Math.max(0, nextY), maxY),
  };
}

function stopDockDrag() {
  if (!dragging.value) return;
  settingsStore.setWhiteboardDockPosition(dockPosition.value);
  globalThis.removeEventListener("pointermove", handleDockDrag);
  globalThis.removeEventListener("pointerup", stopDockDrag);
}

watch(overlayDockOrientation, () => {
  nextTick(() => {
    const dock = dockRef.value;
    if (!dock) return;

    const dockWidth = dock.offsetWidth || 320;
    const dockHeight = dock.offsetHeight || 520;
    const screenWidth = globalThis.innerWidth;
    const screenHeight = globalThis.innerHeight;

    if (overlayDockOrientation.value === "horizontal") {
      dockPosition.value = {
        x: Math.max(0, (screenWidth - dockWidth) / 2),
        y: Math.max(0, screenHeight - dockHeight - 24),
      };
    } else {
      dockPosition.value = {
        x: 24,
        y: Math.max(0, (screenHeight - dockHeight) / 2),
      };
    }

    settingsStore.setWhiteboardDockPosition(dockPosition.value);
  });
});

watch(whiteboardDockPosition, (value) => {
  if (!dragging.value) {
    dockPosition.value = { ...value };
  }
});

const overlayPayload = computed<OverlayPayload>(() => ({
  selectedTool: selectedTool.value,
  enabledTools: { ...enabledTools.value } as Record<ToolId, boolean>,
  strokeColor: strokeColor.value,
  strokeWidth: strokeWidth.value,
  textFont: textFont.value,
  textSize: textSize.value,
  smoothingEnabled: smoothingEnabled.value,
  autoEraseEnabled: autoEraseEnabled.value,
  autoEraseDelay: autoEraseDelay.value,
  gradientEnabled: gradientEnabled.value,
  gradientType: gradientType.value,
  gradientAngle: gradientAngle.value,
  gradientStops: gradientStops.value.map((stop: GradientStop) => ({ ...stop })),
  clearNonce: canvasNonce.value,
  quickColorSlots: quickColorSlots.value.map((slot: QuickColorSlot) => ({
    ...slot,
  })),
  overlayDockOrientation: overlayDockOrientation.value,
  whiteboardGridEnabled: whiteboardGridEnabled.value,
  fillOpacity: fillOpacity.value,
}));

watch(
  overlayPayload,
  (payload) => {
    if (isApplyingRemote.value) return;
    emit("overlay-toolbar-update", payload);
  },
  { deep: true },
);

function applyPayload(payload: OverlayPayload) {
  isApplyingRemote.value = true;
  overlayStore.setTool(payload.selectedTool);
  overlayStore.enabledTools = { ...payload.enabledTools };
  settingsStore.setStrokeColor(payload.strokeColor);
  settingsStore.setStrokeWidth(payload.strokeWidth);
  settingsStore.setTextFont(payload.textFont);
  settingsStore.setTextSize(payload.textSize);
  settingsStore.setSmoothingEnabled(payload.smoothingEnabled);

  settingsStore.setAutoEraseEnabled(payload.autoEraseEnabled);

  settingsStore.setAutoEraseDelay(payload.autoEraseDelay);
  settingsStore.setGradientEnabled(payload.gradientEnabled);
  settingsStore.setGradientType(payload.gradientType);
  settingsStore.setGradientAngle(payload.gradientAngle);
  settingsStore.setGradientStops(
    payload.gradientStops.map((stop) => ({ ...stop })),
  );
  canvasNonce.value = payload.clearNonce;
  toolsStore.setQuickColorSlots(
    payload.quickColorSlots.map((slot) => ({ ...slot })),
  );
  overlayStore.setOverlayDockOrientation(payload.overlayDockOrientation);
  settingsStore.setWhiteboardGridEnabled(payload.whiteboardGridEnabled);
  settingsStore.setFillOpacity(payload.fillOpacity);
  requestAnimationFrame(() => {
    isApplyingRemote.value = false;
  });
}

function handleUndo() {
  canvasStageRef.value?.undo();
}

function handleRedo() {
  canvasStageRef.value?.redo();
}

function handleClear() {
  clearCanvas();
}

function handleExport() {
  canvasStageRef.value?.downloadSnapshot?.();
  addToast(t("home.modes.whiteboard.toolbar.exportSuccess"), "success");
}

function handleExit() {
  showConfiguration();
}

function handleHideDock() {
  dockHidden.value = true;
}

function handleToggleDock() {
  dockHidden.value = !dockHidden.value;
}

let unlisten: (() => void) | null = null;
let unlistenAction: (() => void) | null = null;
let keydownListener: ((event: KeyboardEvent) => void) | null = null;

onMounted(async () => {
  await settingsStore.hydrate();

  unlisten = await listen<OverlayPayload>("overlay-sync", (event) => {
    applyPayload(event.payload);
  });
  unlistenAction = await listen<OverlayAction>("overlay-action", (event) => {
    if (event.payload.type === "undo") {
      canvasStageRef.value?.undo();
    }
    if (event.payload.type === "redo") {
      canvasStageRef.value?.redo();
    }
  });

  keydownListener = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    handleClear();
  };
  localShortcutListener = (event) => handleLocalShortcut(event);
  globalThis.addEventListener("keydown", keydownListener);
  globalThis.addEventListener("keydown", localShortcutListener);
});

onBeforeUnmount(() => {
  if (unlisten) unlisten();
  if (unlistenAction) unlistenAction();
  if (keydownListener) {
    globalThis.removeEventListener("keydown", keydownListener);
  }
  if (localShortcutListener) {
    globalThis.removeEventListener("keydown", localShortcutListener);
  }
});
</script>

<template>
  <div class="whiteboard-shell">
    <CanvasStage
      ref="canvasStageRef"
      :selected-tool="selectedTool"
      :stroke-color="strokeColor"
      :stroke-width="strokeWidth"
      :text-font="textFont"
      :text-size="textSize"
      :smoothing-enabled="smoothingEnabled"
      :auto-erase-enabled="autoEraseEnabled"
      :auto-erase-delay="autoEraseDelay"
      :gradient-enabled="gradientEnabled"
      :gradient-type="gradientType"
      :gradient-angle="gradientAngle"
      :gradient-stops="gradientStops"
      :clear-nonce="canvasNonce"
      :grid-enabled="whiteboardGridEnabled"
      :fill-opacity="fillOpacity"
      whiteboard-mode
      infinite-canvas
    />
    <div
      v-if="!dockHidden"
      ref="dockRef"
      class="floating-toolbar"
      :class="{ vertical: overlayDockOrientation === 'vertical' }"
      :style="{ left: `${dockPosition.x}px`, top: `${dockPosition.y}px` }"
    >
      <FloatingDock
        :layout="overlayDockOrientation"
        :show-drag-handle="true"
        :show-dock-actions="true"
        @drag-handle="startDockDrag"
        @undo="handleUndo"
        @redo="handleRedo"
        @clear-canvas="handleClear"
        @open-config="handleExit"
        @close-dock="handleHideDock"
      />
    </div>
    <div class="whiteboard-actions">
      <button type="button" class="action-btn" @click="handleExport">
        <Download class="action-icon" />
        <span>{{ $t("home.modes.whiteboard.toolbar.export") }}</span>
      </button>
      <button type="button" class="action-btn" @click="handleClear">
        <X class="action-icon" />
        <span>{{ $t("hotkeys.tools.clear") }}</span>
      </button>
      <button type="button" class="action-btn" @click="handleExit">
        <LogOut class="action-icon" />
        <span>{{ $t("home.modes.whiteboard.toolbar.exit") }}</span>
      </button>
    </div>
    <div class="whiteboard-zoom">
      <button type="button" class="zoom-btn" @click="zoomStep(-10)">
        <Minus class="zoom-icon" />
      </button>
      <input
        type="range"
        min="50"
        max="200"
        step="10"
        v-model="zoomLevelDisplay"
        @input="onZoomInput"
      />
      <button type="button" class="zoom-btn" @click="zoomStep(10)">
        <Plus class="zoom-icon" />
      </button>
      <span>{{ zoomLevelDisplay }}%</span>
    </div>
  </div>
</template>

<style scoped>
.whiteboard-shell {
  width: 100vw;
  height: 100dvh;
  background: #0e0f13;
  color: #f7f8fc;
  position: relative;
  overflow: hidden;
}

.floating-toolbar {
  position: fixed;
  padding: 0;
  border-radius: 999px;
  background: transparent;
  border: none;
  backdrop-filter: none;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: none;
  z-index: 100;
}

.floating-toolbar.vertical {
  flex-direction: column;
}

.whiteboard-actions {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.action-btn {
  background: rgba(16, 20, 30, 0.65);
  border: 1px solid rgba(93, 210, 255, 0.15);
  color: #e6e9f2;
  border-radius: 12px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.01em;
}

.action-btn:hover {
  background: rgba(93, 210, 255, 0.15);
  border-color: rgba(93, 210, 255, 0.4);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  color: #fff;
}

.action-btn:active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background: rgba(93, 210, 255, 0.2);
}

.action-icon :deep(svg) {
  width: 16px;
  height: 16px;
  opacity: 0.9;
}

.whiteboard-zoom {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(16, 20, 30, 0.65);
  border: 1px solid rgba(93, 210, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 13px;
  font-weight: 600;
  z-index: 10;
  color: #e6e9f2;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.whiteboard-zoom:hover {
  border-color: rgba(93, 210, 255, 0.3);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}

.whiteboard-zoom input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 120px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  outline: none;
  margin: 0 4px;
  cursor: pointer;
}

.whiteboard-zoom input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #5dd2ff;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(93, 210, 255, 0.5);
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.whiteboard-zoom input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: #fff;
}

.zoom-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #aeb5c4;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
}

.zoom-btn:hover {
  background: rgba(93, 210, 255, 0.1);
  color: #fff;
  transform: scale(1.1);
}

.zoom-btn:active {
  transform: scale(0.95);
  background: rgba(93, 210, 255, 0.2);
}

.zoom-icon :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
