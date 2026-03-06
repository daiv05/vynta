<script setup lang="ts">
import { emit, listen } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useMonitorContext } from "../../composables/useMonitorContext";
import { useSettingsStore } from "../../stores/settings";
import type { AppSettings } from "../../types/settings";

const settingsStore = useSettingsStore();
const { spotlightBackdrop, spotlightRadius, spotlightOpacity } =
  storeToRefs(settingsStore);

const { toLocalCoordinates } = useMonitorContext();

const position = ref({
  x: globalThis.innerWidth / 2,
  y: globalThis.innerHeight / 2,
});
const isReady = ref(false);
const isVisible = ref(true);

let unlistenSettings: (() => void) | null = null;
let unlistenCursor: (() => void) | null = null;
let unlistenVisibility: (() => void) | null = null;

const overlayStyle = computed(() => {
  const radius = spotlightRadius.value;
  const x = position.value.x;
  const y = position.value.y;

  const backdropHex = spotlightBackdrop.value;
  const r = Number.parseInt(backdropHex.slice(1, 3), 16);
  const g = Number.parseInt(backdropHex.slice(3, 5), 16);
  const b = Number.parseInt(backdropHex.slice(5, 7), 16);
  const backdrop = `rgba(${r}, ${g}, ${b}, ${spotlightOpacity.value})`;

  return {
    background: `radial-gradient(circle ${radius}px at ${x}px ${y}px, transparent 0%, transparent 60%, ${backdrop} 72%)`,
    maskImage: "none",
    WebkitMaskImage: "none",
    filter: "none",
    opacity: isReady.value ? 1 : 0,
    transition: "background 0.05s linear, opacity 0.15s ease-out",
  } as const;
});

const ringStyle = computed(() => {
  const size = spotlightRadius.value * 2;
  return {
    width: `${size}px`,
    height: `${size}px`,
    transform: `translate(${position.value.x - spotlightRadius.value}px, ${position.value.y - spotlightRadius.value}px)`,
  } as const;
});

onMounted(async () => {
  await settingsStore.hydrate();

  emit("spotlight-settings-request");

  unlistenSettings = await listen<Partial<AppSettings>>(
    "spotlight-settings",
    (event) => {
      if (event.payload.spotlightBackdrop) {
        settingsStore.setSpotlightBackdrop(event.payload.spotlightBackdrop);
      }
      if (typeof event.payload.spotlightRadius === "number") {
        settingsStore.setSpotlightRadius(event.payload.spotlightRadius);
      }
      if (typeof event.payload.spotlightOpacity === "number") {
        settingsStore.setSpotlightOpacity(event.payload.spotlightOpacity);
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
    "spotlight-visibility",
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
  <div class="spotlight-shell" :style="overlayStyle">
    <div class="spotlight-ring" :style="ringStyle" />
  </div>
</template>

<style scoped>
.spotlight-shell {
  position: fixed;
  inset: 0;
  pointer-events: none;
  transition: background 0.05s linear;
}

.spotlight-ring {
  position: absolute;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 20px rgba(93, 210, 255, 0.3);
  transition: transform 0.02s linear;
}
</style>
