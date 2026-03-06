<script setup lang="ts">
import { emit, listen } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useMonitorContext } from "../../composables/useMonitorContext";
import { useSettingsStore } from "../../stores/settings";
import type { AppSettings } from "../../types/settings";

const settingsStore = useSettingsStore();
const { cursorHighlightColor, cursorHighlightSize, cursorHighlightShape } =
  storeToRefs(settingsStore);

const { toLocalCoordinates /* , monitorContext */ } = useMonitorContext();

const position = ref({
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
});
// const windowSize = ref({
//   width: window.innerWidth,
//   height: window.innerHeight,
// });
const isReady = ref(false);
const isVisible = ref(true);

let unlistenSettings: (() => void) | null = null;
let unlistenCursor: (() => void) | null = null;
let unlistenVisibility: (() => void) | null = null;

const haloStyle = computed(() => {
  const size = cursorHighlightSize.value;
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderColor: cursorHighlightColor.value,
    boxShadow: `0 0 30px ${cursorHighlightColor.value}66`,
    "--x": `${position.value.x - size / 2}px`,
    "--y": `${position.value.y - size / 2}px`,
  } as const;
});

onMounted(async () => {
  await settingsStore.hydrate();

  emit("cursor-highlight-settings-request");

  unlistenSettings = await listen<Partial<AppSettings>>(
    "cursor-highlight-settings",
    (event) => {
      if (event.payload.cursorHighlightColor) {
        cursorHighlightColor.value = event.payload.cursorHighlightColor;
      }
      if (typeof event.payload.cursorHighlightSize === "number") {
        cursorHighlightSize.value = event.payload.cursorHighlightSize;
      }
      if (event.payload.cursorHighlightShape) {
        cursorHighlightShape.value = event.payload.cursorHighlightShape;
      }
    },
  );

  unlistenCursor = await listen<{ x: number; y: number }>(
    "cursor-position",
    (event) => {
      const local = toLocalCoordinates(event.payload.x, event.payload.y);
      position.value = { x: local.x, y: local.y };
      if (isVisible.value) {
        isReady.value = true;
      }
    },
  );

  unlistenVisibility = await listen<{ visible: boolean }>(
    "cursor-highlight-visibility",
    (event) => {
      isVisible.value = event.payload.visible;
      if (!event.payload.visible) {
        isReady.value = false;
      }
    },
  );
});

onBeforeUnmount(() => {
  if (unlistenSettings) unlistenSettings();
  if (unlistenCursor) unlistenCursor();
  if (unlistenVisibility) unlistenVisibility();
});
</script>

<template>
  <div
    class="cursor-highlight-shell"
    :style="{
      opacity: isReady ? 1 : 0,
      transition: 'opacity 0.15s ease-out',
    }"
  >
    <div
      class="cursor-halo"
      :class="`shape-${cursorHighlightShape}`"
      :style="haloStyle"
    />
    <!-- DEBUG OVERLAY -->
    <!-- <div
      style="
        position: absolute;
        top: 10px;
        left: 10px;
        color: red;
        background: rgba(0, 0, 0, 0.8);
        padding: 10px;
        font-family: monospace;
        z-index: 9999;
      "
    >
      POS: {{ Math.round(position.x) }}, {{ Math.round(position.y) }}<br />
      MONITOR:
      {{
        monitorContext
          ? `${monitorContext.virtualX}, ${monitorContext.virtualY}`
          : "NULL"
      }}<br />
      SIZE:
      {{
        monitorContext
          ? `${monitorContext.width}x${monitorContext.height}`
          : "NULL"
      }}<br />
      WIN: {{ windowSize.width }}x{{ windowSize.height }}
    </div> -->
  </div>
</template>

<style scoped>
.cursor-highlight-shell {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.cursor-halo {
  position: absolute;
  border-radius: 999px;
  border: 2px solid;
  background: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.1) transparent 70%
  );
  transform: translate(var(--x), var(--y));
}

.cursor-halo.shape-square {
  border-radius: 10px;
}

.cursor-halo.shape-diamond {
  border-radius: 12px;
  transform: translate(var(--x), var(--y)) rotate(45deg);
}
</style>
