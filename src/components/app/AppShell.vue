<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { Home, Keyboard, Settings } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAutostart } from "../../composables/useAutostart";
import { useCursorHighlightWindow } from "../../composables/useCursorHighlightWindow";
import { useGlobalShortcuts } from "../../composables/useGlobalShortcuts";
import { useOverlayWindow } from "../../composables/useOverlayWindow";
import { useSpotlightWindow } from "../../composables/useSpotlightWindow";
import { useToolState } from "../../composables/useToolState";
import { useWhiteboardWindow } from "../../composables/useWhiteboardWindow";
import { useZoomWindow } from "../../composables/useZoomWindow";
import { ALL_SHORTCUTS } from "../../constants/shortcuts";
import { useOverlayStore } from "../../stores/overlay";
import { useSettingsStore } from "../../stores/settings";
import { useToastStore } from "../../stores/toast";
import { useToolsStore } from "../../stores/tools";
import type { OverlayPayload } from "../../types/overlay";
import AppPanel from "./AppPanel.vue";

const toolsStore = useToolsStore();
const settingsStore = useSettingsStore();
const overlayStore = useOverlayStore();

const { quickColorSlots } = storeToRefs(toolsStore);
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
  cursorHighlightColor,
  cursorHighlightSize,
  cursorHighlightShape,
  shortcutMap,
  modeShortcutsEnabled,
  spotlightBackdrop,
  spotlightRadius,
  spotlightOpacity,
  zoomLevel,
  zoomSize,
  zoomShape,
  zoomMode,
  zoomMotor,
  startWithWindows,
  restorePreferencesOnLaunch,
  whiteboardGridEnabled,
  autoEraseEnabled,
} = storeToRefs(settingsStore);

const { enabledTools, overlayDockOrientation, selectedTool } =
  storeToRefs(overlayStore);

const { addToast } = useToastStore();

function resetShortcuts() {
  settingsStore.setShortcutMap({});
  addToast(t("settings.modals.resetShortcuts.successMessage"), "success");
}

const shortcuts = computed(() => {
  return ALL_SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    accelerator: shortcutMap.value[shortcut.id] ?? shortcut.accelerator,
  }));
});

const { canvasNonce, clearCanvas } = useToolState();

const whiteboardVisible = ref(false);
const cursorHighlightVisible = ref(false);
const spotlightVisible = ref(false);
const zoomVisible = ref(false);

async function closeOtherModes(
  except?: "draw" | "cursor" | "spotlight" | "whiteboard" | "zoom",
) {
  if (except !== "draw" && overlayVisible.value) {
    await setOverlayVisible(false);
  }
  if (except !== "cursor" && cursorHighlightVisible.value) {
    await setCursorHighlightVisible(false);
  }
  if (except !== "spotlight" && spotlightVisible.value) {
    await setSpotlightVisible(false);
  }
  if (except !== "whiteboard" && whiteboardVisible.value) {
    await setWhiteboardVisible(false);
  }
  if (except !== "zoom" && zoomVisible.value) {
    await setZoomVisible(false);
  }
}

async function toggleDraw() {
  if (overlayVisible.value) {
    await setOverlayVisible(false);
    return;
  }
  await closeOtherModes("draw");
  await setOverlayVisible(true);
}

async function toggleWhiteboard() {
  if (whiteboardVisible.value) {
    await setWhiteboardVisible(false);
    return;
  }
  await closeOtherModes("whiteboard");
  await setWhiteboardVisible(true);
}

const { shortcutErrors } = useGlobalShortcuts({
  openDraw: () => {
    if (!modeShortcutsEnabled.value.draw) return;
    toggleDraw();
  },
  openCursorHighlight: () => {
    if (!modeShortcutsEnabled.value["cursor-highlight"]) return;
    if (cursorHighlightVisible.value) {
      setCursorHighlightVisible(false);
      return;
    }
    closeOtherModes("cursor").then(() => setCursorHighlightVisible(true));
  },
  openSpotlight: () => {
    if (!modeShortcutsEnabled.value.spotlight) return;
    if (spotlightVisible.value) {
      setSpotlightVisible(false);
      return;
    }
    closeOtherModes("spotlight").then(() => setSpotlightVisible(true));
  },
  openWhiteboard: () => {
    if (!modeShortcutsEnabled.value.whiteboard) return;
    toggleWhiteboard();
  },
  openZoom: () => {
    if (!modeShortcutsEnabled.value.zoom) return;
    if (zoomVisible.value) {
      setZoomVisible(false);
      return;
    }
    closeOtherModes("zoom").then(() => setZoomVisible(true));
  },
  shortcuts: () => shortcuts.value,
});

const { resetSettings } = settingsStore;

function handleResetPreferences() {
  resetSettings();
  addToast(t("settings.modals.resetPreferences.successMessage"), "success");
}

useAutostart(startWithWindows);
const { overlayVisible, setOverlayVisible } = useOverlayWindow();
const {
  cursorHighlightVisible: cursorHighlightWindowVisible,
  setCursorHighlightVisible,
} = useCursorHighlightWindow();
const { spotlightVisible: spotlightWindowVisible, setSpotlightVisible } =
  useSpotlightWindow();
const { setWhiteboardVisible } = useWhiteboardWindow();
const { zoomVisible: zoomWindowVisible, setZoomVisible } = useZoomWindow();

watch(cursorHighlightWindowVisible, (visible) => {
  cursorHighlightVisible.value = visible;
});

watch(spotlightWindowVisible, (visible) => {
  spotlightVisible.value = visible;
});
watch(zoomWindowVisible, (visible) => {
  zoomVisible.value = visible;
});
const tabs = ["Inicio", "Hotkeys", "Configuración"] as const;
const activeTab = ref<(typeof tabs)[number]>("Inicio");
const { t, locale } = useI18n();

async function updateTrayMenu() {
  try {
    const translations = {
      draw: t("tray.draw"),
      spotlight: t("tray.spotlight"),
      highlight: t("tray.highlight"),
      whiteboard: t("tray.whiteboard"),
      zoom: t("tray.zoom"),
      config: t("tray.config"),
      exit: t("tray.exit"),
    };
    await invoke("update_tray_lang", { translations });
  } catch (error) {
    console.error("Failed to update tray menu:", error);
  }
}

watch(locale, () => {
  updateTrayMenu();
});

onMounted(() => {
  updateTrayMenu();
});

const activeTitle = computed(() => {
  if (activeTab.value === "Inicio") return t("ui.header.controlCenter");
  if (activeTab.value === "Hotkeys") return t("ui.header.shortcuts");
  return t("ui.header.settings");
});
let unlistenOverlay: (() => void) | null = null;
let unlistenOverlayClear: (() => void) | null = null;
let unlistenOverlayToolbar: (() => void) | null = null;
let unlistenWhiteboard: (() => void) | null = null;
let unlistenCursorHighlight: (() => void) | null = null;
let unlistenSpotlight: (() => void) | null = null;
let unlistenZoom: (() => void) | null = null;
let unlistenOverlaySyncRequest: (() => void) | null = null;
let unlistenCursorHighlightRequest: (() => void) | null = null;
let unlistenSpotlightRequest: (() => void) | null = null;

const overlayPayload = computed<OverlayPayload>(() => ({
  selectedTool: selectedTool.value,
  enabledTools: { ...enabledTools.value },
  strokeColor: strokeColor.value,
  strokeWidth: strokeWidth.value,
  textFont: textFont.value,
  textSize: textSize.value,
  smoothingEnabled: smoothingEnabled.value,
  cursorHighlightColor: cursorHighlightColor.value,
  cursorHighlightSize: cursorHighlightSize.value,
  autoEraseEnabled: autoEraseEnabled.value,
  autoEraseDelay: autoEraseDelay.value,
  gradientEnabled: gradientEnabled.value,
  gradientType: gradientType.value,
  gradientAngle: gradientAngle.value,
  gradientStops: gradientStops.value.map((stop) => ({ ...stop })),
  clearNonce: canvasNonce.value,
  quickColorSlots: quickColorSlots.value.map((slot) => ({ ...slot })),
  overlayDockOrientation: overlayDockOrientation.value,
  whiteboardGridEnabled: whiteboardGridEnabled.value,
  fillOpacity: fillOpacity.value,
}));

watch(
  overlayPayload,
  (payload) => {
    emit("overlay-sync", payload);
  },
  { deep: true, immediate: true },
);

watch(
  [cursorHighlightColor, cursorHighlightSize, cursorHighlightShape],
  () => {
    emit("cursor-highlight-settings", {
      cursorHighlightColor: cursorHighlightColor.value,
      cursorHighlightSize: cursorHighlightSize.value,
      cursorHighlightShape: cursorHighlightShape.value,
    });
  },
  { immediate: true },
);

watch(
  [spotlightBackdrop, spotlightRadius, spotlightOpacity],
  () => {
    emit("spotlight-settings", {
      spotlightBackdrop: spotlightBackdrop.value,
      spotlightRadius: spotlightRadius.value,
      spotlightOpacity: spotlightOpacity.value,
    });
  },
  { immediate: true },
);


watch(
  [zoomLevel, zoomSize, zoomShape, zoomMode],
  () => {
    emit("zoom-settings", {
      zoomLevel: zoomLevel.value,
      zoomSize: zoomSize.value,
      zoomShape: zoomShape.value,
      zoomMode: zoomMode.value,
    });

    if (zoomMotor.value === "magnifier") {
      const scaleFactor = window.devicePixelRatio || 1;
      const effectiveSize = Math.round(zoomSize.value * scaleFactor);
      invoke("mag_zoom_set_config", {
        size: effectiveSize,
        zoomLevel: zoomLevel.value,
        shape: zoomShape.value,
      }).catch(() => {});
    }
  },
  { immediate: true },
);

function applyOverlayPayload(payload: OverlayPayload) {
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
}

onMounted(async () => {
  await Promise.all([
    toolsStore.hydrate(),
    overlayStore.hydrate(),
    settingsStore.hydrate(),
  ]);
  unlistenOverlaySyncRequest = await listen("overlay-sync-request", () => {
    emit("overlay-sync", overlayPayload.value);
  });
  unlistenCursorHighlightRequest = await listen(
    "cursor-highlight-settings-request",
    () => {
      emit("cursor-highlight-settings", {
        cursorHighlightColor: cursorHighlightColor.value,
        cursorHighlightSize: cursorHighlightSize.value,
        cursorHighlightShape: cursorHighlightShape.value,
      });
    },
  );
  unlistenSpotlightRequest = await listen("spotlight-settings-request", () => {
    emit("spotlight-settings", {
      spotlightBackdrop: spotlightBackdrop.value,
      spotlightRadius: spotlightRadius.value,
      spotlightOpacity: spotlightOpacity.value,
    });
  });
  unlistenOverlay = await listen<{ visible: boolean }>(
    "overlay-visibility",
    (event) => {
      overlayVisible.value = event.payload.visible;
    },
  );
  unlistenOverlayClear = await listen("overlay-clear", () => {
    clearCanvas();
  });
  unlistenOverlayToolbar = await listen<OverlayPayload>(
    "overlay-toolbar-update",
    (event) => {
      applyOverlayPayload(event.payload);
    },
  );
  unlistenWhiteboard = await listen<{ visible: boolean }>(
    "whiteboard-visibility",
    (event) => {
      whiteboardVisible.value = event.payload.visible;
    },
  );
  unlistenCursorHighlight = await listen<{ visible: boolean }>(
    "cursor-highlight-visibility",
    (event) => {
      cursorHighlightVisible.value = event.payload.visible;
      cursorHighlightWindowVisible.value = event.payload.visible;
    },
  );
  unlistenSpotlight = await listen<{ visible: boolean }>(
    "spotlight-visibility",
    (event) => {
      spotlightVisible.value = event.payload.visible;
      spotlightWindowVisible.value = event.payload.visible;
    },
  );
  unlistenZoom = await listen<{ visible: boolean }>(
    "zoom-visibility",
    (event) => {
      zoomVisible.value = event.payload.visible;
      zoomWindowVisible.value = event.payload.visible;

      // Sync native magnifier
      if (zoomMotor.value === "magnifier") {
        if (event.payload.visible) {
          const scaleFactor = window.devicePixelRatio || 1;
          const effectiveSize = Math.round(zoomSize.value * scaleFactor);
          invoke("mag_zoom_show", {
            size: effectiveSize,
            zoomLevel: zoomLevel.value,
            shape: zoomShape.value,
          }).catch(() => {});
        } else {
          invoke("mag_zoom_hide").catch(() => {});
        }
      }
    },
  );
});

onBeforeUnmount(() => {
  if (unlistenOverlaySyncRequest) unlistenOverlaySyncRequest();
  if (unlistenCursorHighlightRequest) unlistenCursorHighlightRequest();
  if (unlistenSpotlightRequest) unlistenSpotlightRequest();
  if (unlistenOverlay) unlistenOverlay();
  if (unlistenOverlayClear) unlistenOverlayClear();
  if (unlistenOverlayToolbar) unlistenOverlayToolbar();
  if (unlistenWhiteboard) unlistenWhiteboard();
  if (unlistenCursorHighlight) unlistenCursorHighlight();
  if (unlistenSpotlight) unlistenSpotlight();
  if (unlistenZoom) unlistenZoom();
});
</script>

<template>
  <div class="shell">
    <div class="workbench">
      <aside class="rail">
        <div class="brand">
          <img src="/app-icon.webp" class="brand-icon" alt="Vynta" />
          <div>
            <div class="brand-name">{{ $t("app.title") }}</div>
            <!-- <div class="brand-version">{{ $t("app.version") }}</div> -->
          </div>
        </div>
        <nav class="rail-tabs">
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            class="rail-item"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            <Home
              v-if="tab === 'Inicio'"
              class="rail-icon"
              aria-hidden="true"
            />
            <Keyboard
              v-else-if="tab === 'Hotkeys'"
              class="rail-icon"
              aria-hidden="true"
            />
            <Settings v-else class="rail-icon" aria-hidden="true" />
            <span>{{
              $t(
                `app.tabs.${tab === "Inicio" ? "home" : tab === "Hotkeys" ? "hotkeys" : "settings"}`,
              )
            }}</span>
          </button>
        </nav>
        <div class="rail-actions">
          <button type="button" class="rail-primary" @click="toggleDraw">
            {{ $t("home.actions.liveDraw") }}
          </button>
          <button
            type="button"
            class="rail-secondary"
            @click="toggleWhiteboard"
          >
            {{ $t("home.actions.whiteboard") }}
          </button>
        </div>
      </aside>

      <section class="content">
        <header class="content-header">
          <div>
            <h1>{{ activeTitle }}</h1>
          </div>
        </header>
        <AppPanel
          :active-tab="activeTab"
          :selected-tool="selectedTool"
          :shortcut-errors="shortcutErrors"
          :start-with-windows="startWithWindows"
          :restore-preferences-on-launch="restorePreferencesOnLaunch"
          @select-tool="overlayStore.setTool"
          @toggle-start-with-windows="settingsStore.setStartWithWindows"
          @toggle-restore-preferences="
            settingsStore.setRestorePreferencesOnLaunch
          "
          @toggle-auto-erase="settingsStore.setAutoEraseEnabled"
          @open-draw="toggleDraw"
          @open-whiteboard="toggleWhiteboard"
          @reset-preferences="handleResetPreferences"
          @reset-shortcuts="resetShortcuts"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.shell {
  height: 100vh;
  background: radial-gradient(circle at top left, #151a26, #0b0d12 55%);
  color: #edf1f9;
}

.workbench {
  height: 100%;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 0;
  min-height: 0;
}

.rail {
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  background: linear-gradient(
    180deg,
    rgba(9, 11, 16, 0.98),
    rgba(13, 16, 24, 0.96)
  );
  border-right: 1px solid rgba(93, 210, 255, 0.08);
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
}

.brand-name {
  font-size: 18px;
  font-weight: 600;
}

.brand-version {
  font-size: 12px;
  color: #9aa3bb;
}

.rail-tabs {
  display: grid;
  gap: 10px;
}

.rail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: rgba(21, 25, 36, 0.7);
  color: #c7cfe2;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rail-item:hover {
  background: rgba(30, 36, 52, 0.85);
}

.rail-item.active {
  border-color: rgba(93, 210, 255, 0.5);
  background: rgba(12, 16, 24, 0.95);
  color: #ffffff;
}

.rail-icon {
  width: 20px;
  height: 20px;
  color: #8fa6ff;
}

.rail-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.rail-actions {
  margin-top: auto;
  display: grid;
  gap: 10px;
}

.rail-primary,
.rail-secondary {
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid transparent;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rail-primary {
  background: #5dd2ff;
  color: #0b0d12;
}

.rail-secondary {
  background: rgba(24, 28, 40, 0.9);
  color: #e6ecff;
  border: 1px solid rgba(93, 210, 255, 0.2);
}

.content {
  padding: 28px 32px;
  display: flex;
  height: 100vh;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  min-height: 0;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-radius: 18px;
}

.content-header h1 {
  margin: 0;
  font-size: 24px;
}

@media (max-width: 1024px) {
  .workbench {
    grid-template-columns: 200px 1fr;
  }

  .content {
    padding: 22px 24px;
  }

  .content-header h1 {
    font-size: 22px;
  }
}

@media (max-width: 900px) {
  .workbench {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .rail {
    flex-direction: row;
    align-items: center;
    overflow-x: auto;
    gap: 12px;
    padding: 14px 16px;
  }

  .brand {
    min-width: 150px;
  }

  .rail-tabs {
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    align-items: center;
  }

  .rail-item {
    padding: 10px 12px;
    font-size: 13px;
    white-space: nowrap;
  }

  .rail-actions {
    margin-top: 0;
    display: inline-flex;
    gap: 8px;
  }

  .content {
    padding: 18px;
    height: auto;
  }

  .content-header {
    padding: 14px 16px;
  }
}

@media (max-width: 640px) {
  .brand-icon {
    width: 36px;
    height: 36px;
    border-radius: 12px;
  }

  .brand-name {
    font-size: 16px;
  }

  .brand-version {
    display: none;
  }

  .rail-actions {
    flex-wrap: wrap;
  }
}
</style>
