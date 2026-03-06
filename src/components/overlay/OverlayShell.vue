<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useLocalShortcuts } from "../../composables/useLocalShortcuts";
import { textFontOptions, useToolState } from "../../composables/useToolState";
import { ALL_SHORTCUTS } from "../../constants/shortcuts";
import { useOverlayStore } from "../../stores/overlay";
import { useSettingsStore } from "../../stores/settings";
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
  defaultStrokeColor,
  textFont,
  textSize,
  smoothingEnabled,
  autoEraseDelay,
  gradientEnabled,
  gradientType,
  gradientAngle,
  gradientStops,
  fillOpacity,
  shortcutMap,
  whiteboardGridEnabled,
  autoEraseEnabled,
  overlayDockPosition,
  overlayDockScreenSize,
} = storeToRefs(settingsStore);

const { enabledTools, selectedTool, overlayDockOrientation } =
  storeToRefs(overlayStore);

const { quickColorSlots } = storeToRefs(toolsStore);

const {
  spotlightEnabled,
  zoomEnabled,
  canvasNonce,
  toggleSpotlight,
  toggleZoom,
  clearCanvas,
} = useToolState();

const shortcuts = computed(() => {
  return ALL_SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    accelerator: shortcutMap.value[shortcut.id] ?? shortcut.accelerator,
  }));
});

const canvasStageRef = ref<InstanceType<typeof CanvasStage> | null>(null);
const dockRef = ref<HTMLDivElement | null>(null);
const dockPosition = ref({ ...overlayDockPosition.value });
const dockHidden = ref(false);
const dragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const hasInitializedPosition = ref(false);
let localShortcutListener: ((event: KeyboardEvent) => void) | null = null;
let resizeTimer: number | null = null;
const onResize = () => {
  isRecalculating.value = true;
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    resetAndRecalculate();
  }, 100);
};

const isApplyingRemote = ref(false);
const isRecalculating = ref(true);

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
  settingsStore.setFillOpacity(payload.fillOpacity);
  nextTick(() => {
    isApplyingRemote.value = false;
  });
}

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

let unlisten: (() => void) | null = null;
let unlistenAction: (() => void) | null = null;
let unlistenOverlay: (() => void) | null = null;
let keydownListener: ((event: KeyboardEvent) => void) | null = null;

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

watch(overlayDockPosition, (value) => {
  dockPosition.value = { ...value };
});

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
    settingsStore.setOverlayDockPosition(dockPosition.value);
  });
});

function handleUndo() {
  canvasStageRef.value?.undo();
  emit<OverlayAction>("overlay-action", { type: "undo" });
}

function handleRedo() {
  canvasStageRef.value?.redo();
  emit<OverlayAction>("overlay-action", { type: "redo" });
}

function handleClear() {
  clearCanvas();
  emit("overlay-clear");
}

function handleHideDock() {
  dockHidden.value = true;
}

function handleToggleDock() {
  dockHidden.value = !dockHidden.value;
}

function handleOpenConfig() {
  invoke("show_configuration_window");
}

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
  dragging.value = false;
  settingsStore.setOverlayDockPosition(dockPosition.value);
  settingsStore.setOverlayDockScreenSize({
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
  });
  globalThis.removeEventListener("pointermove", handleDockDrag);
  globalThis.removeEventListener("pointerup", stopDockDrag);
}

function calculateInitialPosition() {
  if (
    overlayDockPosition.value.x !== 24 ||
    overlayDockPosition.value.y !== 24
  ) {
    hasInitializedPosition.value = true;
    return;
  }

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
      x: Math.max(0, screenWidth - dockWidth - 24),
      y: Math.max(0, (screenHeight - dockHeight) / 2),
    };
  }

  hasInitializedPosition.value = true;
}

function recalculateDockPosition(sourcePos?: { x: number; y: number }) {
  const dock = dockRef.value;
  if (!dock) return;

  const width = dock.offsetWidth || 320;
  const height = dock.offsetHeight || 520;
  const screenWidth = globalThis.innerWidth;
  const screenHeight = globalThis.innerHeight;

  const maxX = Math.max(0, screenWidth - width - 12);
  const maxY = Math.max(0, screenHeight - height - 12);

  let targetX = sourcePos?.x ?? dockPosition.value.x;
  let targetY = sourcePos?.y ?? dockPosition.value.y;

  const lastSize = overlayDockScreenSize.value;
  if (
    lastSize.width > 0 &&
    lastSize.height > 0 &&
    (lastSize.width !== screenWidth || lastSize.height !== screenHeight)
  ) {
    const dockRight = targetX + width;
    const distRight = lastSize.width - dockRight;
    const dockBottom = targetY + height;
    const distBottom = lastSize.height - dockBottom;

    if (distRight < 100) {
      targetX = screenWidth - width - distRight;
    } else {
      targetX = (targetX / lastSize.width) * screenWidth;
    }

    if (distBottom < 100) {
      targetY = screenHeight - height - distBottom;
    } else {
      targetY = (targetY / lastSize.height) * screenHeight;
    }
  }

  const nextX = Math.min(Math.max(0, targetX), maxX);
  const nextY = Math.min(Math.max(0, targetY), maxY);

  if (
    nextX !== dockPosition.value.x ||
    nextY !== dockPosition.value.y ||
    lastSize.width !== screenWidth ||
    lastSize.height !== screenHeight
  ) {
    dockPosition.value = { x: nextX, y: nextY };
    settingsStore.setOverlayDockPosition(dockPosition.value);
    settingsStore.setOverlayDockScreenSize({
      width: screenWidth,
      height: screenHeight,
    });
  }
}

async function resetAndRecalculate() {
  const currentPos = { ...settingsStore.overlayDockPosition };

  isRecalculating.value = true;
  dockPosition.value = { x: 24, y: 24 };
  await nextTick();

  recalculateDockPosition(currentPos);
  setTimeout(() => {
    isRecalculating.value = false;
  }, 100);
}

onMounted(async () => {
  await Promise.all([
    toolsStore.hydrate(),
    overlayStore.hydrate(),
    settingsStore.hydrate(),
  ]);

  emit("overlay-sync-request");

  await nextTick();
  calculateInitialPosition();
  resetAndRecalculate();

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

  unlistenOverlay = await listen<{ visible: boolean }>(
    "overlay-visibility",
    (event) => {
      if (!event.payload.visible) {
        handleClear();
        isRecalculating.value = true;
      } else {
        nextTick(() => {
          resetAndRecalculate();
        });
      }
    },
  );

  globalThis.addEventListener("resize", onResize);
});

onBeforeUnmount(() => {
  if (unlisten) unlisten();
  if (unlistenAction) unlistenAction();
  if (unlistenOverlay) unlistenOverlay();
  if (keydownListener) {
    globalThis.removeEventListener("keydown", keydownListener);
  }
  if (localShortcutListener) {
    globalThis.removeEventListener("keydown", localShortcutListener);
  }
  globalThis.removeEventListener("pointermove", handleDockDrag);
  globalThis.removeEventListener("pointerup", stopDockDrag);
  globalThis.removeEventListener("resize", onResize);
});
</script>

<template>
  <div class="overlay-shell">
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
      :fill-opacity="fillOpacity"
      overlay-mode
    />
    <div
      v-if="!dockHidden"
      ref="dockRef"
      class="overlay-toolbar"
      :class="{ horizontal: overlayDockOrientation === 'horizontal' }"
      :style="{
        left: `${dockPosition.x}px`,
        top: `${dockPosition.y}px`,
        opacity: isRecalculating ? 0 : 1,
        transition: isRecalculating ? 'none' : 'opacity 0.2s ease-out',
      }"
    >
      <FloatingDock
        :layout="overlayDockOrientation"
        :show-drag-handle="true"
        :selected-tool="selectedTool"
        :stroke-color="strokeColor"
        :stroke-width="strokeWidth"
        :default-stroke-color="defaultStrokeColor"
        :quick-color-slots="quickColorSlots"
        :text-font="textFont"
        :text-fonts="textFontOptions"
        :text-size="textSize"
        :smoothing-enabled="smoothingEnabled"
        :auto-erase-enabled="autoEraseEnabled"
        :gradient-enabled="gradientEnabled"
        :gradient-type="gradientType"
        :gradient-angle="gradientAngle"
        :gradient-stops="gradientStops"
        :spotlight-enabled="spotlightEnabled"
        :zoom-enabled="zoomEnabled"
        :enabled-tools="enabledTools"
        :show-dock-actions="true"
        @select-tool="overlayStore.setTool"
        @update-color="settingsStore.setStrokeColor"
        @update-width="settingsStore.setStrokeWidth"
        @update-font="settingsStore.setTextFont"
        @update-text-size="settingsStore.setTextSize"
        @toggle-smoothing="settingsStore.setSmoothingEnabled(!smoothingEnabled)"
        @toggle-auto-erase="
          settingsStore.setAutoEraseEnabled(!autoEraseEnabled)
        "
        @toggle-gradient="settingsStore.setGradientEnabled(!gradientEnabled)"
        @update-gradient-type="settingsStore.setGradientType"
        @update-gradient-angle="settingsStore.setGradientAngle"
        @update-gradient-stop="settingsStore.updateGradientStop"
        @add-gradient-stop="settingsStore.addGradientStop"
        @remove-gradient-stop="settingsStore.removeGradientStop"
        @toggle-spotlight="toggleSpotlight"
        @toggle-zoom="toggleZoom"
        @clear-canvas="handleClear"
        @undo="handleUndo"
        @redo="handleRedo"
        @drag-handle="startDockDrag"
        @open-config="handleOpenConfig"
        @close-dock="handleHideDock"
      />
    </div>
  </div>
</template>

<style scoped>
.overlay-shell {
  position: fixed;
  inset: 0;
  background: transparent;
  overflow: hidden;
}

.overlay-toolbar {
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
  max-width: 80vw;
  max-height: 80vh;
}

.toolbar-grip {
  border: none;
  background: transparent;
  color: #8fd7ff;
  cursor: grab;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
}

.toolbar-grip-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

:global(html),
:global(body),
:global(#app) {
  background: transparent !important;
}
</style>
