<script setup lang="ts">
import {
  ArrowUpRight,
  Brush,
  ChevronDown,
  Circle,
  Eraser,
  Highlighter,
  LayoutPanelLeft,
  Minus,
  Move,
  PenTool,
  Square,
  Type,
  Wrench,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import type { Component } from "vue";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { textFontOptions } from "../../../composables/useToolState";
import { useOverlayStore } from "../../../stores/overlay";
import { useSettingsStore } from "../../../stores/settings";
import { useToolsStore } from "../../../stores/tools";
import type { ToolId } from "../../../types/tools";
import type { QuickColorSlot } from "../../../types/ui";
import StyleEditorModal from "../../modals/StyleEditorModal.vue";

const toolsStore = useToolsStore();
const settingsStore = useSettingsStore();
const overlayStore = useOverlayStore();
const { t } = useI18n();

const {
  strokeColor,
  strokeWidth,
  textFont,
  textSize,
  fillOpacity,
  autoEraseDelay,
  gradientEnabled,
  gradientType,
  gradientAngle,
  gradientStops,
} = storeToRefs(settingsStore);

const { enabledTools, overlayDockOrientation } = storeToRefs(overlayStore);

const drawControls = computed<
  Array<{ id: ToolId; label: string; icon: Component }>
>(() => [
  { id: "select", label: t("hotkeys.tools.select"), icon: Move },
  { id: "pen", label: t("hotkeys.tools.pen"), icon: PenTool },
  { id: "marker", label: t("hotkeys.tools.marker"), icon: Highlighter },
  { id: "rect", label: t("hotkeys.tools.rect"), icon: Square },
  { id: "ellipse", label: t("hotkeys.tools.ellipse"), icon: Circle },
  { id: "line", label: t("hotkeys.tools.line"), icon: Minus },
  { id: "arrow", label: t("hotkeys.tools.arrow"), icon: ArrowUpRight },
  { id: "text", label: t("hotkeys.tools.text"), icon: Type },
  { id: "eraser", label: t("hotkeys.tools.eraser"), icon: Eraser },
]);

const preModalActiveIndex = ref(-1);
const isStyleModalOpen = ref(false);

function openStyleModal() {
  preModalActiveIndex.value = toolsStore.quickColorSlots.findIndex((slot) =>
    slotActive(slot),
  );
  isStyleModalOpen.value = true;
}

function closeStyleModal() {
  isStyleModalOpen.value = false;
}

function saveStyleModal() {
  if (preModalActiveIndex.value !== -1) {
    const slot = toolsStore.quickColorSlots[preModalActiveIndex.value];
    if (slot) {
      applyQuickSlot(slot);
    }
  }
  closeStyleModal();
}

function slotPreview(slot: QuickColorSlot) {
  if (slot.type === "gradient" && slot.gradient) {
    const stops = slot.gradient.stops
      .map((stop) => `${stop.color} ${stop.position * 100}%`)
      .join(", ");
    return `linear-gradient(${slot.gradient.angle}deg, ${stops})`;
  }
  return slot.color ?? "#5dd2ff";
}

function defaultColorFromSlot(slot: QuickColorSlot) {
  if (slot.type === "gradient" && slot.gradient?.stops?.length) {
    return slot.gradient.stops[0]?.color ?? "#5dd2ff";
  }
  return slot.color ?? "#5dd2ff";
}

function applyQuickSlot(slot: QuickColorSlot) {
  settingsStore.setDefaultStrokeColor(defaultColorFromSlot(slot));
  if (slot.type === "gradient" && slot.gradient) {
    settingsStore.setGradientEnabled(true);
    settingsStore.setGradientType(slot.gradient.type);
    settingsStore.setGradientAngle(slot.gradient.angle);
    settingsStore.setGradientStops(slot.gradient.stops);
  } else if (slot.color) {
    settingsStore.setGradientEnabled(false);
    settingsStore.setStrokeColor(slot.color);
  }
}

const drawingPreviewStyle = computed(() => {
  if (
    gradientEnabled.value &&
    gradientStops.value &&
    gradientStops.value.length > 0
  ) {
    const stops = gradientStops.value
      .map((stop) => `${stop.color} ${stop.position * 100}%`)
      .join(", ");

    if (!stops)
      return {
        background: strokeColor.value,
        borderImageSource: "none",
        borderColor: strokeColor.value,
      };

    const type =
      gradientType.value === "radial" ? "radial-gradient" : "linear-gradient";
    const direction =
      gradientType.value === "radial"
        ? "circle at center"
        : `${gradientAngle.value}deg`;

    const gradient = `${type}(${direction}, ${stops})`;
    return {
      background: gradient,
      borderImageSource: gradient,
    };
  }

  return {
    backgroundColor: strokeColor.value,
    borderImageSource: "none",
    borderColor: strokeColor.value,
  };
});

const drawingPreviewOpacity = computed(() => {
  return fillOpacity.value ?? 1;
});

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
  <div class="content-section">
    <div class="section-title">
      <span class="section-icon" aria-hidden="true">
        <Wrench class="section-icon-glyph" />
      </span>
      <div>
        <h2>{{ $t("home.tools.title") }}</h2>
      </div>
    </div>

    <div class="tool-accordion">
      <details class="tool-card" open>
        <summary class="tool-summary">
          <div class="tool-summary-main">
            <span class="tool-badge tool-badge-blue">
              <Brush class="tool-badge-icon" />
            </span>
            <div>
              <h3>{{ $t("home.tools.draw.title") }}</h3>
              <p>{{ $t("home.tools.draw.description") }}</p>
            </div>
          </div>
          <div class="tool-summary-meta">
            <ChevronDown class="chevron" />
          </div>
        </summary>
        <div class="tool-body">
          <div class="tool-subgrid">
            <div class="sub-section">
              <h4>{{ $t("home.tools.draw.styles") }}</h4>
              <div class="field">
                <span class="field-label">{{
                  $t("home.tools.draw.defaultColor")
                }}</span>
              </div>
              <div class="color-row">
                <button
                  v-for="(slot, index) in toolsStore.quickColorSlots"
                  :key="slot.id"
                  type="button"
                  class="color-dot"
                  :class="{
                    active: slotActive(slot),
                  }"
                  :style="{ '--preview': slotPreview(slot) }"
                  @click="applyQuickSlot(slot)"
                  :aria-label="`Slot ${index + 1}`"
                />
                <button type="button" class="chip" @click="openStyleModal">
                  {{ $t("home.tools.draw.editStyles") }}
                </button>
              </div>
              <div class="field">
                <label for="width">{{ $t("home.tools.draw.width") }}</label>
                <input
                  id="width"
                  class="range"
                  type="range"
                  min="2"
                  max="32"
                  step="1"
                  :value="strokeWidth"
                  @input="
                    settingsStore.setStrokeWidth(
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
                <span class="range-value">{{ strokeWidth }}px</span>
              </div>
              <div class="field" v-if="fillOpacity !== undefined">
                <label for="fill-opacity">{{
                  $t("home.tools.draw.fillOpacity")
                }}</label>
                <input
                  id="fill-opacity"
                  class="range"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="fillOpacity"
                  @input="
                    settingsStore.setFillOpacity(
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
                <span class="range-value"
                  >{{ Math.round((fillOpacity ?? 1) * 100) }}%</span
                >
              </div>
              <div class="field">
                <span class="field-label">{{
                  $t("home.tools.draw.preview")
                }}</span>
              </div>
              <div class="preview-box">
                <div
                  class="rect-preview"
                  :style="{
                    '--fill-background':
                      drawingPreviewStyle.background ||
                      drawingPreviewStyle.backgroundColor,
                    '--fill-opacity': drawingPreviewOpacity,
                    borderWidth: `${Math.max(strokeWidth / 4, 1)}px`,
                    borderImageSource: drawingPreviewStyle.borderImageSource,
                    borderColor: drawingPreviewStyle.borderColor,
                  }"
                />
              </div>
            </div>

            <div class="sub-section">
              <h4>{{ $t("home.tools.draw.text") }}</h4>
              <div class="field">
                <label for="font">{{ $t("home.tools.draw.font") }}</label>
                <select
                  id="font"
                  class="select"
                  :value="textFont"
                  @change="
                    settingsStore.setTextFont(
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option
                    v-for="font in textFontOptions"
                    :key="font.value"
                    :value="font.value"
                  >
                    {{ font.label }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label for="text-size">{{ $t("home.tools.draw.size") }}</label>
                <input
                  id="text-size"
                  class="range"
                  type="range"
                  min="12"
                  max="64"
                  step="1"
                  :value="textSize"
                  @input="
                    settingsStore.setTextSize(
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
                <span class="range-value">{{ textSize }}px</span>
              </div>
              <div
                class="text-preview"
                :style="{
                  fontFamily: textFont,
                  fontSize: `${textSize}px`,
                }"
              >
                {{ $t("home.tools.draw.sampleText") }}
              </div>
            </div>

            <div class="sub-section">
              <h4>{{ $t("home.tools.draw.autoErase") }}</h4>
              <div class="field">
                <label for="auto-erase-delay">{{
                  $t("home.tools.draw.time")
                }}</label>
                <input
                  id="auto-erase-delay"
                  class="range"
                  type="range"
                  min="1"
                  max="60"
                  step="1"
                  :value="autoEraseDelay"
                  @input="
                    settingsStore.setAutoEraseDelay(
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
                <span class="range-value">{{ autoEraseDelay }}s</span>
              </div>
            </div>
          </div>
        </div>
      </details>
      <details class="tool-card">
        <summary class="tool-summary">
          <div class="tool-summary-main">
            <span class="tool-badge tool-badge-orange">
              <LayoutPanelLeft class="tool-badge-icon" />
            </span>
            <div>
              <h3>{{ $t("home.tools.dock.title") }}</h3>
              <p>
                {{ $t("home.tools.dock.description") }}
              </p>
            </div>
          </div>
          <div class="tool-summary-meta">
            <ChevronDown class="chevron" />
          </div>
        </summary>
        <div class="tool-body">
          <div class="tool-subgrid">
            <div class="sub-section">
              <div class="field">
                <label for="dock-active-controls">{{
                  $t("home.tools.dock.activeTools")
                }}</label>
                <div id="dock-active-controls" class="tool-controls">
                  <button
                    v-for="control in drawControls"
                    :key="control.id"
                    type="button"
                    class="control-pill"
                    :class="{ active: enabledTools[control.id] }"
                    :title="control.label"
                    @click="
                      overlayStore.toggleToolEnabled(
                        control.id,
                        !enabledTools[control.id],
                      )
                    "
                  >
                    <component :is="control.icon" class="control-icon" />
                    <span>{{ control.label }}</span>
                  </button>
                </div>
              </div>
              <div class="separator-line"></div>
              <div class="field">
                <label for="overlay-dock-orientation">{{
                  $t("home.tools.dock.orientation")
                }}</label>
                <select
                  id="overlay-dock-orientation"
                  class="select"
                  :value="overlayDockOrientation"
                  @change="
                    overlayStore.setOverlayDockOrientation(
                      ($event.target as HTMLSelectElement).value as
                        | 'horizontal'
                        | 'vertical',
                    )
                  "
                >
                  <option value="horizontal">
                    {{ $t("home.tools.dock.orientations.horizontal") }}
                  </option>
                  <option value="vertical">
                    {{ $t("home.tools.dock.orientations.vertical") }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>

    <StyleEditorModal
      :is-open="isStyleModalOpen"
      @close="closeStyleModal"
      @save="saveStyleModal"
    />
  </div>
</template>

<style scoped>
.content-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.section-title h2 {
  margin: 0;
  font-size: 16px;
}

.section-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(12, 16, 24, 0.9);
  color: #d6f0ff;
  display: grid;
  place-items: center;
}

.section-icon-glyph :deep(svg) {
  width: 20px;
  height: 20px;
}

.tool-accordion {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tool-card {
  border-radius: 18px;
  border: 1px solid rgba(93, 210, 255, 0.08);
  background: rgba(16, 19, 28, 0.88);
  overflow: hidden;
}

.tool-summary {
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  cursor: pointer;
}

.tool-summary::-webkit-details-marker {
  display: none;
}

.tool-summary-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-summary-main h3 {
  margin: 0;
  font-size: 16px;
}

.tool-summary-main p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9aa3bb;
}

.tool-summary-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-badge {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.tool-badge-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.tool-badge-blue {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.tool-badge-orange {
  background: rgba(249, 115, 22, 0.2);
  color: #fdba74;
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.chevron {
  color: #8c94aa;
  width: 16px;
  height: 16px;
}

.chevron :deep(svg) {
  width: 100%;
  height: 100%;
}

.tool-body {
  padding: 0 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tool-subgrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.sub-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(19, 23, 34, 0.8);
  border: 1px solid rgba(93, 210, 255, 0.06);
  border-radius: 14px;
  padding: 14px;
}

.sub-section h4 {
  margin: 0;
  font-size: 13px;
  color: #c7cfe2;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  color: #9aa3bb;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.color-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  background: transparent;
  position: relative;
  overflow: hidden;
}

.color-dot::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--preview, #5dd2ff);
}

.color-dot.active {
  border-color: #ffffff;
}

.chip {
  border-radius: 999px;
  padding: 8px 12px;
  border: 1px solid rgba(93, 210, 255, 0.12);
  background: rgba(27, 32, 46, 0.9);
  color: #e6e9f2;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: rgba(27, 32, 46, 0.9);
  color: #e6e9f2;
  font-size: 12px;
  cursor: pointer;
}

.control-pill.active {
  border-color: rgba(93, 210, 255, 0.6);
  background: rgba(93, 210, 255, 0.12);
}

.control-icon {
  display: inline-flex;
}

.control-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.tool-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.separator-line {
  height: 1px;
  background: rgba(93, 210, 255, 0.1);
  margin: 16px 0;
  width: 100%;
}

.select,
.range {
  background: rgba(23, 27, 39, 0.9);
  border: 1px solid rgba(93, 210, 255, 0.1);
  border-radius: 10px;
  padding: 8px 10px;
  color: #e6e9f2;
}

.range {
  padding: 0;
  width: 100%;
}

.range-value {
  font-size: 11px;
  color: #9aa3bb;
}

.text-preview {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(12, 14, 20, 0.8);
  color: #d6deef;
}

.preview-box {
  width: 100%;
  height: 80px;
  background: #1e222b;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.rect-preview {
  width: 70%;
  height: 60%;
  border-style: solid;
  border-image-slice: 1;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.rect-preview::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--fill-background, #5dd2ff);
  opacity: var(--fill-opacity, 1);
}

@media (max-width: 900px) {
  .tool-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .tool-summary-meta {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .tool-subgrid {
    grid-template-columns: 1fr;
  }
}
</style>
