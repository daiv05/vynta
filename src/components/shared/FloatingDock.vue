<script setup lang="ts">
import {
  ArrowUpRight,
  Circle,
  Eraser,
  GripVertical,
  Highlighter,
  Move,
  PenTool,
  Redo2,
  Settings,
  Square,
  Timer,
  Trash2,
  Type,
  Undo2,
  Waves,
  X,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import type { Component } from "vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useOverlayStore } from "../../stores/overlay";
import { useSettingsStore } from "../../stores/settings";
import { useToolsStore } from "../../stores/tools";
import type { ToolId } from "../../types/tools";
import type { QuickColorSlot } from "../../types/ui";

const props = defineProps<{
  layout?: "horizontal" | "vertical";
  showDockActions?: boolean;
  showDragHandle?: boolean;
}>();

const emit = defineEmits<{
  (event: "clear-canvas"): void;
  (event: "undo"): void;
  (event: "redo"): void;
  (event: "open-config"): void;
  (event: "close-dock"): void;
  (event: "drag-handle", payload: PointerEvent): void;
}>();

const settingsStore = useSettingsStore();
const overlayStore = useOverlayStore();
const toolsStore = useToolsStore();

const {
  strokeColor,
  smoothingEnabled,
  autoEraseEnabled,
  gradientEnabled,
  gradientType,
  gradientAngle,
  gradientStops,
} = storeToRefs(settingsStore);

const { quickColorSlots } = storeToRefs(toolsStore);
const { selectedTool, enabledTools } = storeToRefs(overlayStore);

type IconEntry = Component;

const { t } = useI18n();

const tools = computed<Array<{ id: ToolId; label: string; icon: IconEntry }>>(
  () => [
    { id: "select", label: t("hotkeys.tools.select"), icon: Move },
    { id: "pen", label: t("hotkeys.tools.pen"), icon: PenTool },
    { id: "marker", label: t("hotkeys.tools.marker"), icon: Highlighter },
    { id: "rect", label: t("hotkeys.tools.rect"), icon: Square },
    { id: "ellipse", label: t("hotkeys.tools.ellipse"), icon: Circle },
    { id: "arrow", label: t("hotkeys.tools.arrow"), icon: ArrowUpRight },
    { id: "text", label: t("hotkeys.tools.text"), icon: Type },
    { id: "eraser", label: t("hotkeys.tools.eraser"), icon: Eraser },
  ],
);

const visibleTools = computed(() => {
  if (!enabledTools.value) return tools.value;
  return tools.value.filter((tool) => enabledTools.value?.[tool.id]);
});

function slotPreview(slot: QuickColorSlot) {
  if (slot.type === "gradient" && slot.gradient) {
    const stops = slot.gradient.stops
      .map((stop) => `${stop.color} ${stop.position * 100}%`)
      .join(", ");
    return `linear-gradient(${slot.gradient.angle}deg, ${stops})`;
  }
  return slot.color ?? "#5dd2ff";
}

function applyQuickSlot(slot: QuickColorSlot) {
  const color =
    slot.type === "gradient" && slot.gradient?.stops?.length
      ? (slot.gradient.stops[0]?.color ?? "#5dd2ff")
      : (slot.color ?? "#5dd2ff");
  settingsStore.setDefaultStrokeColor(color);

  if (slot.type === "gradient" && slot.gradient) {
    settingsStore.setGradientEnabled(true);
    settingsStore.setGradientType(slot.gradient.type);
    settingsStore.setGradientAngle(slot.gradient.angle);
    settingsStore.setGradientStops([...slot.gradient.stops]);
    if (slot.gradient.stops[0]?.color) {
      settingsStore.setStrokeColor(slot.gradient.stops[0].color);
    }
  } else if (slot.color) {
    settingsStore.setGradientEnabled(false);
    settingsStore.setStrokeColor(slot.color);
  }
}

function slotActive(slot: QuickColorSlot) {
  if (slot.type === "color" && slot.color) {
    return slot.color === strokeColor.value && !gradientEnabled.value;
  }
  if (slot.type === "gradient" && slot.gradient) {
    if (!gradientEnabled.value) return false;
    if (slot.gradient.type !== gradientType.value) return false;
    if (Math.round(slot.gradient.angle) !== Math.round(gradientAngle.value))
      return false;
    const stopsA = slot.gradient.stops ?? [];
    const stopsB = gradientStops.value ?? [];
    if (stopsA.length !== stopsB.length) return false;
    for (let i = 0; i < stopsA.length; i++) {
      if (stopsA[i].color !== stopsB[i].color) return false;
    }
    return true;
  }
  return false;
}
</script>

<template>
  <aside class="dock" :class="`dock-${props.layout ?? 'horizontal'}`">
    <button
      v-if="props.showDragHandle"
      type="button"
      class="dock-move"
      @pointerdown="$emit('drag-handle', $event)"
    >
      <GripVertical class="dock-icon" />
    </button>
    <div class="dock-group tools">
      <button
        v-for="tool in visibleTools"
        :key="tool.id"
        type="button"
        class="dock-btn tooltip"
        :class="{ active: selectedTool === tool.id }"
        @click="overlayStore.setTool(tool.id)"
      >
        <component :is="tool.icon" class="dock-icon" />
        <span class="tooltip-text">{{ tool.label }}</span>
      </button>
    </div>

    <div v-if="quickColorSlots.length" class="dock-group colors">
      <button
        v-for="(slot, index) in quickColorSlots"
        :key="slot.id"
        type="button"
        class="color-dot tooltip"
        :class="{ active: slotActive(slot) }"
        :style="{ '--preview': slotPreview(slot) }"
        @click="applyQuickSlot(slot)"
      >
        <span class="tooltip-text"
          >{{ $t("home.dock.color") }} {{ index + 1 }}</span
        >
      </button>
    </div>

    <div class="dock-group actions">
      <button type="button" class="dock-btn tooltip" @click="emit('undo')">
        <Undo2 class="dock-icon" />
        <span class="tooltip-text">{{ $t("hotkeys.tools.undo") }}</span>
      </button>
      <button type="button" class="dock-btn tooltip" @click="emit('redo')">
        <Redo2 class="dock-icon" />
        <span class="tooltip-text">{{ $t("hotkeys.tools.redo") }}</span>
      </button>
      <button
        type="button"
        class="dock-btn tooltip"
        @click="emit('clear-canvas')"
      >
        <Trash2 class="dock-icon" />
        <span class="tooltip-text">{{ $t("hotkeys.tools.clear") }}</span>
      </button>
      <button
        type="button"
        class="dock-btn tooltip"
        :class="{ active: smoothingEnabled }"
        @click="settingsStore.setSmoothingEnabled(!smoothingEnabled)"
      >
        <Waves class="dock-icon" />
        <span class="tooltip-text">{{ $t("hotkeys.tools.smoothing") }}</span>
      </button>
      <button
        type="button"
        class="dock-btn tooltip"
        :class="{ active: autoEraseEnabled }"
        @click="settingsStore.setAutoEraseEnabled(!autoEraseEnabled)"
      >
        <Timer class="dock-icon" />
        <span class="tooltip-text">{{ $t("hotkeys.tools.autoErase") }}</span>
      </button>
    </div>

    <div v-if="props.showDockActions" class="dock-group dock-actions">
      <button
        type="button"
        class="dock-btn tooltip"
        @click="emit('open-config')"
      >
        <Settings class="dock-icon" />
        <span class="tooltip-text">{{ $t("tray.config") }}</span>
      </button>
      <button
        type="button"
        class="dock-btn tooltip"
        @click="emit('close-dock')"
      >
        <X class="dock-icon" />
        <span class="tooltip-text">{{ $t("home.dock.close") }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.dock {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 20px;
  background: rgba(16, 20, 30, 0.82);
  border: 1px solid rgba(93, 210, 255, 0.35);
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 30px rgba(4, 6, 12, 0.35);
  flex-wrap: wrap;
  max-width: 80vw;
  max-height: 80vh;
}

.dock-vertical {
  flex-direction: column;
  align-items: center;
  border-radius: 18px;
  padding: 14px;
  max-width: none;
  width: auto;
}

.dock-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dock-vertical .dock-group {
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.dock-grip {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(93, 210, 255, 0.22);
  background: rgba(10, 14, 20, 0.65);
  color: #8fd7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.dock-move {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: #8fd7ff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.dock-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(93, 210, 255, 0.12);
  background: rgba(16, 20, 30, 0.65);
  color: #e6e9f2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dock-btn.active {
  border-color: rgba(93, 210, 255, 0.7);
  background: rgba(93, 210, 255, 0.18);
}

.dock-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.dock-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.colors {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(10, 14, 20, 0.5);
  border: 1px solid rgba(93, 210, 255, 0.12);
  flex: 0 0 auto;
}

.dock-vertical .colors {
  flex-direction: column;
  border-radius: 12px;
  padding: 8px 6px;
}

.color-dot {
  width: 20px;
  height: 20px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  overflow: hidden;
  background: transparent;
  position: relative;
  flex: 0 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  min-width: 20px;
  min-height: 20px;
}

.tooltip {
  position: relative;
}

.tooltip-text {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 14, 20, 0.95);
  color: #e6e9f2;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
  border: 1px solid rgba(93, 210, 255, 0.25);
}

.tooltip:hover .tooltip-text {
  opacity: 1;
  transform: translateX(-50%) translateY(-2px);
}

.color-dot.active {
  border-color: #ffffff;
}

.color-dot::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--preview, #5dd2ff);
}

@media (max-width: 900px) {
  .dock {
    border-radius: 18px;
    padding: 8px 10px;
    gap: 8px;
  }

  .dock-btn {
    width: 40px;
    height: 40px;
  }

  .dock-icon :deep(svg) {
    width: 20px;
    height: 20px;
  }

  .dock-grip {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 600px) {
  .tooltip-text {
    display: none;
  }

  .colors {
    padding: 4px 6px;
  }

  .color-dot {
    width: 18px;
    height: 18px;
    min-width: 18px;
    min-height: 18px;
    flex: 0 0 18px;
  }
}
</style>
