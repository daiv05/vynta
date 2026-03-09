import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { textFontOptions } from "../composables/useToolState";
import type { GradientStop } from "../types/drawing";
import type { ModeShortcutId } from "../types/modes";
import type { ToolDefaults, ToolId } from "../types/tools";

type Settings = {
  strokeColor: string;
  strokeWidth: number;
  defaultStrokeColor: string;
  textFont: string;
  textSize: number;
  fillOpacity: number;
  smoothingEnabled: boolean;
  autoEraseEnabled: boolean;
  autoEraseDelay: number;
  gradientEnabled: boolean;
  gradientType: "linear" | "radial";
  gradientAngle: number;
  gradientStops: GradientStop[];
  toolDefaults: Record<ToolId, ToolDefaults>;
  cursorHighlightColor: string;
  cursorHighlightSize: number;
  cursorHighlightShape: "circle" | "square" | "diamond";
  shortcutMap: Record<string, string>;
  modeShortcutsEnabled: Record<ModeShortcutId, boolean>;
  spotlightBackdrop: string;
  spotlightRadius: number;
  spotlightOpacity: number;
  zoomLevel: number;
  zoomSize: number;
  zoomShape: "circle" | "square";
  zoomMode: "live" | "freeze";
  zoomMotor: "dxgi" | "magnifier";
  startWithWindows: boolean;
  restorePreferencesOnLaunch: boolean;
  previewEnabled: boolean;
  overlayDockPosition: { x: number; y: number };
  overlayDockScreenSize: { width: number; height: number };
  whiteboardDockPosition: { x: number; y: number };
  whiteboardGridEnabled: boolean;
};

export const useSettingsStore = defineStore("settings", () => {
  // Drawing Settings
  const defaultStrokeColor = ref("#5dd2ff");
  const strokeColor = ref(defaultStrokeColor.value);
  const strokeWidth = ref(12);
  const textFont = ref(textFontOptions[0]?.value ?? "inherit");
  const textSize = ref(20);
  const fillOpacity = ref(0.3);
  const smoothingEnabled = ref(true);

  // Auto Erase
  const autoEraseEnabled = ref(false);
  const autoEraseDelay = ref(3);

  // Gradient Settings
  const gradientEnabled = ref(false);
  const gradientType = ref<"linear" | "radial">("linear");
  const gradientAngle = ref(45);
  const gradientStops = ref<GradientStop[]>([
    { color: "#5dd2ff", position: 0 },
    { color: "#4f7cff", position: 0.5 },
    { color: "#6a5bff", position: 1 },
  ]);

  // Tool Defaults
  const toolDefaults = ref<Record<ToolId, ToolDefaults>>({} as any);

  // Cursor Highlight
  const cursorHighlightColor = ref("#a9fec3");
  const cursorHighlightSize = ref(75);
  const cursorHighlightShape = ref<"circle" | "square" | "diamond">("circle");

  // Shortcuts
  const shortcutMap = ref<Record<string, string>>({});
  const modeShortcutsEnabled = ref<Record<ModeShortcutId, boolean>>({
    draw: true,
    "cursor-highlight": true,
    spotlight: true,
    whiteboard: true,
    zoom: true,
  });

  // Spotlight
  const spotlightBackdrop = ref("#000000");
  const spotlightRadius = ref(100);
  const spotlightOpacity = ref(0.6);

  // Zoom
  const zoomLevel = ref(2);
  const zoomSize = ref(300);
  const zoomShape = ref<"circle" | "square">("circle");
  const zoomMode = ref<"live" | "freeze">("freeze");
  const zoomMotor = ref<"dxgi" | "magnifier">("dxgi");

  // System
  const startWithWindows = ref(false);
  const restorePreferencesOnLaunch = ref(true);
  const previewEnabled = ref(true);

  // Docks
  const overlayDockPosition = ref({ x: 0, y: 0 });
  const overlayDockScreenSize = ref({ width: 0, height: 0 });
  const whiteboardDockPosition = ref({ x: 0, y: 0 });

  // Whiteboard
  const whiteboardGridEnabled = ref(true);

  // Actions
  function setToolDefaults(defaults: Record<ToolId, ToolDefaults>) {
    toolDefaults.value = { ...defaults };
  }

  function setCursorHighlightColor(color: string) {
    cursorHighlightColor.value = color;
  }

  function setCursorHighlightSize(size: number) {
    cursorHighlightSize.value = size;
  }

  function setCursorHighlightShape(shape: "circle" | "square" | "diamond") {
    cursorHighlightShape.value = shape;
  }

  function updateShortcut(id: string, accelerator: string) {
    shortcutMap.value[id] = accelerator;
  }

  function setShortcutMap(map: Record<string, string>) {
    shortcutMap.value = { ...map };
  }

  function setModeShortcutEnabled(mode: ModeShortcutId, enabled: boolean) {
    modeShortcutsEnabled.value[mode] = enabled;
  }

  function setSpotlightBackdrop(color: string) {
    spotlightBackdrop.value = color;
  }

  function setSpotlightRadius(radius: number) {
    spotlightRadius.value = radius;
  }

  function setSpotlightOpacity(opacity: number) {
    spotlightOpacity.value = opacity;
  }

  function setZoomLevel(level: number) {
    zoomLevel.value = level;
  }

  function setZoomSize(size: number) {
    zoomSize.value = size;
  }

  function setZoomShape(shape: "circle" | "square") {
    zoomShape.value = shape;
  }

  function setZoomMode(mode: "live" | "freeze") {
    zoomMode.value = mode;
  }

  function setZoomMotor(motor: "dxgi" | "magnifier") {
    zoomMotor.value = motor;
  }

  function setStartWithWindows(enabled: boolean) {
    startWithWindows.value = enabled;
  }

  function setRestorePreferencesOnLaunch(enabled: boolean) {
    restorePreferencesOnLaunch.value = enabled;
  }

  function setPreviewEnabled(enabled: boolean) {
    previewEnabled.value = enabled;
  }

  function setOverlayDockPosition(pos: { x: number; y: number }) {
    overlayDockPosition.value = { ...pos };
  }

  function setOverlayDockScreenSize(size: { width: number; height: number }) {
    overlayDockScreenSize.value = { ...size };
  }

  function setWhiteboardDockPosition(pos: { x: number; y: number }) {
    whiteboardDockPosition.value = { ...pos };
  }

  function setWhiteboardGridEnabled(enabled: boolean) {
    whiteboardGridEnabled.value = enabled;
  }

  function setStrokeColor(color: string) {
    strokeColor.value = color;
  }

  function setDefaultStrokeColor(color: string) {
    defaultStrokeColor.value = color;
    strokeColor.value = color;
  }

  function setStrokeWidth(width: number) {
    strokeWidth.value = width;
  }

  function setTextFont(font: string) {
    textFont.value = font;
  }

  function setTextSize(size: number) {
    textSize.value = size;
  }

  function setFillOpacity(opacity: number) {
    fillOpacity.value = opacity;
  }

  function setSmoothingEnabled(enabled: boolean) {
    smoothingEnabled.value = enabled;
  }

  function setAutoEraseEnabled(enabled: boolean) {
    autoEraseEnabled.value = enabled;
  }

  function setAutoEraseDelay(seconds: number) {
    autoEraseDelay.value = seconds;
  }

  function setGradientEnabled(enabled: boolean) {
    gradientEnabled.value = enabled;
  }

  function setGradientType(type: "linear" | "radial") {
    gradientType.value = type;
  }

  function setGradientAngle(angle: number) {
    gradientAngle.value = angle;
  }

  function setGradientStops(stops: GradientStop[]) {
    gradientStops.value = stops.map((stop) => ({ ...stop }));
  }

  function updateGradientStop(index: number, patch: Partial<GradientStop>) {
    if (gradientStops.value[index]) {
      Object.assign(gradientStops.value[index], patch);
    }
  }

  function addGradientStop() {
    if (gradientStops.value.length >= 4) return;
    gradientStops.value.push({ color: strokeColor.value, position: 1 });
  }

  function removeGradientStop(index: number) {
    if (gradientStops.value.length <= 2) return;
    gradientStops.value.splice(index, 1);
  }

  // Persistence
  const ready = ref(false);
  const isHydrating = ref(false);
  let storeRef: Awaited<ReturnType<typeof load>> | null = null;
  let persistTimer: number | null = null;

  function snapshotSettings(): Settings {
    return {
      strokeColor: strokeColor.value,
      strokeWidth: strokeWidth.value,
      defaultStrokeColor: defaultStrokeColor.value,
      textFont: textFont.value,
      textSize: textSize.value,
      fillOpacity: fillOpacity.value,
      smoothingEnabled: smoothingEnabled.value,
      autoEraseEnabled: autoEraseEnabled.value,
      autoEraseDelay: autoEraseDelay.value,
      gradientEnabled: gradientEnabled.value,
      gradientType: gradientType.value,
      gradientAngle: gradientAngle.value,
      gradientStops: gradientStops.value,
      toolDefaults: toolDefaults.value,
      cursorHighlightColor: cursorHighlightColor.value,
      cursorHighlightSize: cursorHighlightSize.value,
      cursorHighlightShape: cursorHighlightShape.value,
      shortcutMap: shortcutMap.value,
      modeShortcutsEnabled: modeShortcutsEnabled.value,
      spotlightBackdrop: spotlightBackdrop.value,
      spotlightRadius: spotlightRadius.value,
      spotlightOpacity: spotlightOpacity.value,
      zoomLevel: zoomLevel.value,
      zoomSize: zoomSize.value,
      zoomShape: zoomShape.value,
      zoomMode: zoomMode.value,
      zoomMotor: zoomMotor.value,
      startWithWindows: startWithWindows.value,
      restorePreferencesOnLaunch: restorePreferencesOnLaunch.value,
      previewEnabled: previewEnabled.value,
      overlayDockPosition: overlayDockPosition.value,
      overlayDockScreenSize: overlayDockScreenSize.value,
      whiteboardDockPosition: whiteboardDockPosition.value,
      whiteboardGridEnabled: whiteboardGridEnabled.value,
    };
  }

  function applySettings(settings: Partial<Settings>) {
    if (typeof settings.strokeColor === "string")
      strokeColor.value = settings.strokeColor;
    if (typeof settings.strokeWidth === "number")
      strokeWidth.value = settings.strokeWidth;
    if (typeof settings.defaultStrokeColor === "string")
      defaultStrokeColor.value = settings.defaultStrokeColor;
    if (typeof settings.textFont === "string")
      textFont.value = settings.textFont;
    if (typeof settings.textSize === "number")
      textSize.value = settings.textSize;
    if (typeof settings.fillOpacity === "number")
      fillOpacity.value = settings.fillOpacity;
    if (typeof settings.smoothingEnabled === "boolean")
      smoothingEnabled.value = settings.smoothingEnabled;
    if (typeof settings.autoEraseEnabled === "boolean")
      autoEraseEnabled.value = settings.autoEraseEnabled;
    if (typeof settings.autoEraseDelay === "number")
      autoEraseDelay.value = settings.autoEraseDelay;
    if (typeof settings.gradientEnabled === "boolean")
      gradientEnabled.value = settings.gradientEnabled;
    if (settings.gradientType) gradientType.value = settings.gradientType;
    if (typeof settings.gradientAngle === "number")
      gradientAngle.value = settings.gradientAngle;
    if (settings.gradientStops) gradientStops.value = settings.gradientStops;
    if (settings.toolDefaults) toolDefaults.value = settings.toolDefaults;
    if (typeof settings.cursorHighlightColor === "string")
      cursorHighlightColor.value = settings.cursorHighlightColor;
    if (typeof settings.cursorHighlightSize === "number")
      cursorHighlightSize.value = settings.cursorHighlightSize;
    if (settings.cursorHighlightShape)
      cursorHighlightShape.value = settings.cursorHighlightShape;
    if (settings.shortcutMap) shortcutMap.value = settings.shortcutMap;
    if (settings.modeShortcutsEnabled)
      modeShortcutsEnabled.value = settings.modeShortcutsEnabled;
    if (typeof settings.spotlightBackdrop === "string")
      spotlightBackdrop.value = settings.spotlightBackdrop;
    if (typeof settings.spotlightRadius === "number")
      spotlightRadius.value = settings.spotlightRadius;
    if (typeof settings.spotlightOpacity === "number")
      spotlightOpacity.value = settings.spotlightOpacity;
    if (typeof settings.zoomLevel === "number")
      zoomLevel.value = settings.zoomLevel;
    if (typeof settings.zoomSize === "number")
      zoomSize.value = settings.zoomSize;
    if (settings.zoomShape) zoomShape.value = settings.zoomShape;
    if (settings.zoomMode) zoomMode.value = settings.zoomMode;
    if (settings.zoomMotor) zoomMotor.value = settings.zoomMotor;
    if (typeof settings.startWithWindows === "boolean")
      startWithWindows.value = settings.startWithWindows;
    if (typeof settings.restorePreferencesOnLaunch === "boolean")
      restorePreferencesOnLaunch.value = settings.restorePreferencesOnLaunch;
    if (typeof settings.previewEnabled === "boolean")
      previewEnabled.value = settings.previewEnabled;
    if (settings.overlayDockPosition)
      overlayDockPosition.value = settings.overlayDockPosition;
    if (settings.overlayDockScreenSize)
      overlayDockScreenSize.value = settings.overlayDockScreenSize;
    if (settings.whiteboardDockPosition)
      whiteboardDockPosition.value = settings.whiteboardDockPosition;
    if (typeof settings.whiteboardGridEnabled === "boolean")
      whiteboardGridEnabled.value = settings.whiteboardGridEnabled;
  }

  async function persist() {
    const store = storeRef;
    if (!store) return;
    await store.set("app-settings", snapshotSettings());
    await store.save();
  }

  function schedulePersist() {
    if (isHydrating.value) return;
    if (persistTimer) {
      window.clearTimeout(persistTimer);
    }
    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      persist();
    }, 500);
  }

  async function hydrate() {
    if (ready.value) return;
    isHydrating.value = true;
    try {
      storeRef = await load("settings.json", { autoSave: false, defaults: {} });
      const stored = await storeRef.get<any>("app-settings");
      if (stored) {
        if (stored.shortcutMap) shortcutMap.value = stored.shortcutMap;
        if (stored.modeShortcutsEnabled)
          modeShortcutsEnabled.value = stored.modeShortcutsEnabled;
        if (typeof stored.startWithWindows === "boolean")
          startWithWindows.value = stored.startWithWindows;
        if (stored.overlayDockPosition)
          overlayDockPosition.value = stored.overlayDockPosition;
        if (stored.overlayDockScreenSize)
          overlayDockScreenSize.value = stored.overlayDockScreenSize;
        if (stored.whiteboardDockPosition)
          whiteboardDockPosition.value = stored.whiteboardDockPosition;
        if (typeof stored.whiteboardGridEnabled === "boolean")
          whiteboardGridEnabled.value = stored.whiteboardGridEnabled;
        if (typeof stored.restorePreferencesOnLaunch === "boolean") {
          restorePreferencesOnLaunch.value = stored.restorePreferencesOnLaunch;
        }
        if (restorePreferencesOnLaunch.value) {
          applySettings(stored);
        }
      } else {
        await persist();
      }

      try {
        await invoke("set_zoom_backend_cmd", { backend: zoomMotor.value });
      } catch (e) {
        console.error("Failed to sync zoom backend motor to rust", e);
      }
    } catch (err) {
      console.error("Failed to hydrate settings:", err);
    } finally {
      isHydrating.value = false;
      ready.value = true;
    }
  }

  function resetRefsToDefaults() {
    strokeColor.value = defaultStrokeColor.value;
    strokeWidth.value = 12;
    textFont.value = textFontOptions[0]?.value ?? "inherit";
    textSize.value = 20;
    fillOpacity.value = 0.3;
    smoothingEnabled.value = true;
    autoEraseEnabled.value = false;
    autoEraseDelay.value = 3;
    gradientEnabled.value = false;
    gradientType.value = "linear";
    gradientAngle.value = 45;
    gradientStops.value = [
      { color: "#5dd2ff", position: 0 },
      { color: "#4f7cff", position: 0.5 },
      { color: "#6a5bff", position: 1 },
    ];
    toolDefaults.value = {} as any;
    cursorHighlightColor.value = "#a9fec3";
    cursorHighlightSize.value = 75;
    cursorHighlightShape.value = "circle";
    shortcutMap.value = {};
    modeShortcutsEnabled.value = {
      draw: true,
      "cursor-highlight": true,
      spotlight: true,
      whiteboard: true,
      zoom: true,
    };
    spotlightBackdrop.value = "#000000";
    spotlightRadius.value = 100;
    spotlightOpacity.value = 0.6;
    zoomLevel.value = 2;
    zoomSize.value = 300;
    zoomShape.value = "circle";
    zoomMode.value = "freeze";
    zoomMotor.value = "dxgi";
    startWithWindows.value = false;
    restorePreferencesOnLaunch.value = true;
    previewEnabled.value = true;
    overlayDockPosition.value = { x: 0, y: 0 };
    overlayDockScreenSize.value = { width: 0, height: 0 };
    whiteboardDockPosition.value = { x: 0, y: 0 };
    whiteboardGridEnabled.value = true;
  }

  async function resetSettings() {
    if (!storeRef) return;
    await storeRef.delete("app-settings");
    await storeRef.save();
    resetRefsToDefaults();
  }

  watch(
    () => snapshotSettings(),
    () => schedulePersist(),
    { deep: true },
  );

  watch(zoomMotor, async (newVal) => {
    try {
      await invoke("set_zoom_backend_cmd", { backend: newVal });
    } catch (e) {
      console.error("Failed to sync zoom backend motor to rust", e);
    }
  });

  return {
    ready,
    hydrate,
    resetSettings,

    defaultStrokeColor,
    strokeColor,
    strokeWidth,
    textFont,
    textSize,
    fillOpacity,
    smoothingEnabled,
    autoEraseEnabled,
    autoEraseDelay,
    gradientEnabled,
    gradientType,
    gradientAngle,
    gradientStops,

    toolDefaults,
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
    previewEnabled,
    overlayDockPosition,
    overlayDockScreenSize,
    whiteboardDockPosition,
    whiteboardGridEnabled,

    setStrokeColor,
    setDefaultStrokeColor,
    setStrokeWidth,
    setTextFont,
    setTextSize,
    setFillOpacity,
    setSmoothingEnabled,
    setAutoEraseEnabled,
    setAutoEraseDelay,
    setGradientEnabled,
    setGradientType,
    setGradientAngle,
    setGradientStops,
    updateGradientStop,
    addGradientStop,
    removeGradientStop,

    setToolDefaults,
    setCursorHighlightColor,
    setCursorHighlightSize,
    setCursorHighlightShape,
    updateShortcut,
    setShortcutMap,
    setModeShortcutEnabled,
    setSpotlightBackdrop,
    setSpotlightRadius,
    setSpotlightOpacity,
    setZoomLevel,
    setZoomSize,
    setZoomShape,
    setZoomMode,
    setZoomMotor,
    setStartWithWindows,
    setRestorePreferencesOnLaunch,
    setPreviewEnabled,
    setOverlayDockPosition,
    setOverlayDockScreenSize,
    setWhiteboardDockPosition,
    setWhiteboardGridEnabled,
  };
});
