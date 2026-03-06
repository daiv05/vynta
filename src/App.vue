<script setup lang="ts">
import { computed, onMounted } from "vue";
import AppShell from "./components/app/AppShell.vue";
import CursorHighlightShell from "./components/overlay/CursorHighlightShell.vue";
import OverlayShell from "./components/overlay/OverlayShell.vue";
import SpotlightShell from "./components/overlay/SpotlightShell.vue";
import ZoomShell from "./components/overlay/ZoomShell.vue";
import ToastManager from "./components/ui/ToastManager.vue";
import WhiteboardShell from "./components/whiteboard/WhiteboardShell.vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "./stores/settings";

const settingsStore = useSettingsStore();
const { zoomMotor } = storeToRefs(settingsStore);
const isOverlay = computed(() => {
  if (globalThis.window === undefined) return false;
  const params = new URLSearchParams(globalThis.window.location.search);
  return params.get("overlay") === "true";
});

const isWhiteboard = computed(() => {
  if (globalThis.window === undefined) return false;
  const params = new URLSearchParams(globalThis.window.location.search);
  return params.get("whiteboard") === "true";
});

const isCursorHighlight = computed(() => {
  if (globalThis.window === undefined) return false;
  const params = new URLSearchParams(globalThis.window.location.search);
  return params.get("cursorHighlight") === "true";
});

const isSpotlight = computed(() => {
  if (globalThis.window === undefined) return false;
  const params = new URLSearchParams(globalThis.window.location.search);
  return params.get("spotlight") === "true";
});

const isZoom = computed(() => {
  if (globalThis.window === undefined) return false;
  const params = new URLSearchParams(globalThis.window.location.search);
  return params.get("zoom") === "true";
});

onMounted(() => {
  if (
    isOverlay.value ||
    isCursorHighlight.value ||
    isSpotlight.value ||
    isZoom.value
  ) {
    globalThis.document.body.classList.add("overlay-mode");
  }
});
</script>

<template>
  <OverlayShell v-if="isOverlay" />
  <CursorHighlightShell v-else-if="isCursorHighlight" />
  <SpotlightShell v-else-if="isSpotlight" />
  <ZoomShell v-else-if="isZoom && zoomMotor === 'dxgi'" />
  <WhiteboardShell v-else-if="isWhiteboard" />
  <AppShell v-else />
  <ToastManager />
</template>

<style>
:root {
  font-family: "Inter", "Segoe UI", system-ui, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #f7f8fc;
  background-color: #0e0f13;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body.overlay-mode,
body.overlay-mode #app {
  background: transparent;
}

* {
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: #5dd2ff #0b0d12;
  user-select: none;
  -webkit-user-select: none;
}

body {
  margin: 0;
  min-height: 100vh;
  width: 100vw;
  min-width: 100vw;
  background: #0e0f13;
  overflow: hidden;
}

#app {
  min-height: 100vh;
  width: 100vw;
  min-width: 100vw;
}

*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

*::-webkit-scrollbar-track {
  background: rgba(11, 13, 18, 0.9);
  border-radius: 999px;
}

*::-webkit-scrollbar-thumb {
  background: #5dd2ff;
  border-radius: 999px;
  border: 2px solid rgba(11, 13, 18, 0.9);
}

button,
input {
  font-family: inherit;
}

button {
  background: rgba(24, 28, 40, 0.95);
  color: #f7f8fc;
  border: 1px solid rgba(93, 210, 255, 0.18);
  border-radius: 12px;
  padding: 8px 12px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

button:hover {
  background: rgba(32, 38, 54, 0.95);
}

input,
select,
textarea,
[contenteditable] {
  background: rgba(18, 22, 34, 0.95);
  color: #f7f8fc;
  border: 1px solid rgba(93, 210, 255, 0.2);
  border-radius: 10px;
  padding: 8px 10px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  user-select: text;
  -webkit-user-select: text;
}

input:focus,
select:focus,
textarea:focus {
  border-color: rgba(93, 210, 255, 0.6);
  box-shadow: 0 0 0 2px rgba(93, 210, 255, 0.15);
}

select {
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, #8fd7ff 50%),
    linear-gradient(135deg, #8fd7ff 50%, transparent 50%);
  background-position:
    calc(100% - 16px) 50%,
    calc(100% - 10px) 50%;
  background-size:
    6px 6px,
    6px 6px;
  background-repeat: no-repeat;
  padding-right: 28px;
}

input[type="range"] {
  appearance: none;
  height: 6px;
  padding: 0;
  background: rgba(93, 210, 255, 0.15);
  border-radius: 999px;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #5dd2ff;
  border: 2px solid rgba(12, 16, 24, 0.9);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #5dd2ff;
  border: 2px solid rgba(12, 16, 24, 0.9);
}

input[type="color"] {
  -webkit-appearance: none;
  appearance: none;
  width: 44px;
  height: 28px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid rgba(93, 210, 255, 0.3);
  background: transparent;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}

input[type="color"]::-moz-color-swatch {
  border: none;
  border-radius: 6px;
}

input[type="checkbox"] {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid rgba(93, 210, 255, 0.4);
  background: rgba(12, 16, 24, 0.95);
  display: grid;
  place-items: center;
}

input[type="checkbox"]:checked {
  background: rgba(93, 210, 255, 0.9);
  border-color: rgba(93, 210, 255, 0.9);
}

input[type="checkbox"]:checked::after {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: #0b0d12;
}
</style>
