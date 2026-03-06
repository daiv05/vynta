<script setup lang="ts">
import {
  Blend,
  ChevronDown,
  CircleDot,
  Focus,
  Monitor,
  PenTool,
  ZoomIn,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useSettingsStore } from "../../../stores/settings";

const settingsStore = useSettingsStore();
const {
  cursorHighlightColor,
  cursorHighlightSize,
  cursorHighlightShape,
  spotlightBackdrop,
  spotlightRadius,
  spotlightOpacity,
  whiteboardGridEnabled,
  zoomLevel,
  zoomSize,
  zoomShape,
  zoomMode,
  zoomMotor,
  modeShortcutsEnabled,
  shortcutMap,
} = storeToRefs(settingsStore);

const displayTokenMap: Record<string, string> = {
  commandorcontrol: "Ctrl",
  ctrl: "Ctrl",
  control: "Ctrl",
  shift: "Shift",
  alt: "Alt",
  option: "Alt",
  super: "Win",
  meta: "Win",
  win: "Win",
  windows: "Win",
};

function formatAccelerator(accelerator: string) {
  if (!accelerator) return "Sin asignar";
  return accelerator
    .split("+")
    .map((token) => {
      const key = token.trim().toLowerCase();
      return displayTokenMap[key] ?? token;
    })
    .join(" + ");
}

import { ALL_SHORTCUTS } from "../../../constants/shortcuts";

const shortcuts = computed(() => {
  return ALL_SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    accelerator: shortcutMap.value[shortcut.id] ?? shortcut.accelerator,
  }));
});

function getAccelerator(id: string) {
  const sh = shortcuts.value.find((s) => s.id === id);
  return sh?.accelerator ?? "Sin asignar";
}

function getDisplayAccelerator(id: string) {
  return formatAccelerator(getAccelerator(id));
}

const drawShortcutEnabled = computed({
  get: () => modeShortcutsEnabled.value["draw"],
  set: (val) => settingsStore.setModeShortcutEnabled("draw", val),
});

const cursorShortcutEnabled = computed({
  get: () => modeShortcutsEnabled.value["cursor-highlight"],
  set: (val) => settingsStore.setModeShortcutEnabled("cursor-highlight", val),
});

const spotlightShortcutEnabled = computed({
  get: () => modeShortcutsEnabled.value["spotlight"],
  set: (val) => settingsStore.setModeShortcutEnabled("spotlight", val),
});

const whiteboardShortcutEnabled = computed({
  get: () => modeShortcutsEnabled.value["whiteboard"],
  set: (val) => settingsStore.setModeShortcutEnabled("whiteboard", val),
});

const zoomShortcutEnabled = computed({
  get: () => modeShortcutsEnabled.value["zoom"],
  set: (val) => settingsStore.setModeShortcutEnabled("zoom", val),
});

const cursorPreviewStyle = computed(() => {
  const color = cursorHighlightColor.value;
  const realSize = cursorHighlightSize.value;
  const scaledSize = 24 + ((realSize - 24) / (140 - 24)) * (70 - 24);
  const size = `${Math.round(scaledSize)}px`;

  return {
    width: size,
    height: size,
    borderColor: color,
    boxShadow: `0 0 30px ${color}66`,
    background:
      "radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent 70%)",
    borderRadius:
      cursorHighlightShape.value === "circle"
        ? "999px"
        : cursorHighlightShape.value === "diamond"
          ? "12px"
          : "10px",
    transform:
      cursorHighlightShape.value === "diamond" ? "rotate(45deg)" : "none",
  };
});

const spotlightRingStyle = computed(() => {
  const realDiameter = spotlightRadius.value * 2;
  const scaledDiameter = 40 + ((realDiameter - 160) / (640 - 160)) * (70 - 40);
  const size = `${Math.round(scaledDiameter)}px`;

  return {
    width: size,
    height: size,
  };
});

const spotlightPreviewStyle = computed(() => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    spotlightBackdrop.value,
  );
  const r = result ? Number.parseInt(result[1], 16) : 0;
  const g = result ? Number.parseInt(result[2], 16) : 0;
  const b = result ? Number.parseInt(result[3], 16) : 0;

  const backdrop = `rgba(${r}, ${g}, ${b}, ${spotlightOpacity.value})`;

  const realDiameter = spotlightRadius.value * 2;
  const scaledDiameter = 40 + ((realDiameter - 160) / (640 - 160)) * (70 - 40);
  const radius = Math.round(scaledDiameter / 2);

  return {
    background: `radial-gradient(circle ${radius}px at center, transparent 0%, transparent 60%, ${backdrop} 72%)`,
    backdropFilter: "none",
  };
});

const zoomPreviewStyle = computed(() => {
  const realSize = zoomSize.value;
  const scaledSize = 30 + ((realSize - 100) / (400 - 100)) * (60 - 30);
  const size = `${Math.round(scaledSize)}px`;

  return {
    width: size,
    height: size,
    borderRadius: zoomShape.value === "circle" ? "50%" : "12px",
  };
});
</script>

<template>
  <div class="content-section">
    <div class="section-title">
      <span class="section-icon" aria-hidden="true">
        <Blend class="section-icon-glyph" />
      </span>
      <div>
        <h2>{{ $t("home.title") }}</h2>
      </div>
    </div>

    <div class="tool-accordion">
      <details class="tool-card" open>
        <summary class="tool-summary">
          <div class="tool-summary-main">
            <span class="tool-badge tool-badge-red">
              <PenTool class="tool-badge-icon" />
            </span>
            <div>
              <h3>{{ $t("home.modes.draw.title") }}</h3>
              <p>
                {{ $t("home.modes.draw.description") }}
              </p>
            </div>
          </div>
          <div class="tool-summary-meta">
            <span class="shortcut-pill">{{
              getDisplayAccelerator("open-draw")
            }}</span>
            <label class="switch" @click.stop>
              <input
                class="switch-input"
                type="checkbox"
                v-model="drawShortcutEnabled"
                @click.stop
              />
              <span class="switch-track">
                <span class="switch-thumb" />
              </span>
              <span class="switch-label"></span>
            </label>
            <ChevronDown class="chevron" />
          </div>
        </summary>
      </details>

      <details class="tool-card">
        <summary class="tool-summary">
          <div class="tool-summary-main">
            <span class="tool-badge tool-badge-yellow">
              <CircleDot class="tool-badge-icon" />
            </span>
            <div>
              <h3>{{ $t("home.modes.cursor.title") }}</h3>
              <p>
                {{ $t("home.modes.cursor.description") }}
              </p>
            </div>
          </div>
          <div class="tool-summary-meta">
            <span class="shortcut-pill">{{
              getDisplayAccelerator("open-cursor-highlight")
            }}</span>
            <label class="switch" @click.stop>
              <input
                class="switch-input"
                type="checkbox"
                v-model="cursorShortcutEnabled"
                @click.stop
              />
              <span class="switch-track">
                <span class="switch-thumb" />
              </span>
              <span class="switch-label"></span>
            </label>
            <ChevronDown class="chevron" />
          </div>
        </summary>
        <div class="tool-body">
          <div class="tool-subgrid">
            <div class="sub-section">
              <h4>{{ $t("home.modes.cursor.colors") }}</h4>
              <div class="field">
                <span class="field-label">{{
                  $t("home.modes.cursor.preview")
                }}</span>
              </div>
              <div class="preview-box desktop-bg">
                <div class="cursor-halo-preview" :style="cursorPreviewStyle" />
                <svg
                  class="cursor-icon"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.5 3.21422C5.5 2.19087 6.67108 1.61163 7.48152 2.23393L19.4623 11.432C20.5284 12.2505 20.0722 13.9113 18.7369 14.102L13.8824 14.7955C13.5651 14.8408 13.2753 15.0118 13.0766 15.2707L10.3752 18.7915C9.55403 19.8618 7.89291 19.2625 7.89291 17.9135V3.21422Z"
                    fill="white"
                    stroke="black"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>

              <div class="field">
                <label for="cursor-shape">{{
                  $t("home.modes.cursor.colorShape")
                }}</label>
                <input
                  id="cursor-shape"
                  type="color"
                  v-model="cursorHighlightColor"
                />
              </div>
              <div class="field">
                <input
                  id="cursor-hex"
                  class="shortcut-input"
                  type="text"
                  v-model.lazy="cursorHighlightColor"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div class="sub-section">
              <h4>{{ $t("home.modes.cursor.shape") }}</h4>
              <div class="field">
                <label for="cursor-size">{{
                  $t("home.modes.cursor.size")
                }}</label>
                <input
                  id="cursor-size"
                  class="range"
                  type="range"
                  min="24"
                  max="140"
                  step="1"
                  v-model.number="cursorHighlightSize"
                />
                <span class="range-value">{{ cursorHighlightSize }}px</span>
              </div>
              <div class="toggle-row">
                <button
                  type="button"
                  class="chip"
                  :class="{ active: cursorHighlightShape === 'circle' }"
                  @click="cursorHighlightShape = 'circle'"
                >
                  {{ $t("home.modes.cursor.shapes.circle") }}
                </button>
                <button
                  type="button"
                  class="chip"
                  :class="{ active: cursorHighlightShape === 'square' }"
                  @click="cursorHighlightShape = 'square'"
                >
                  {{ $t("home.modes.cursor.shapes.square") }}
                </button>
                <button
                  type="button"
                  class="chip"
                  :class="{ active: cursorHighlightShape === 'diamond' }"
                  @click="cursorHighlightShape = 'diamond'"
                >
                  {{ $t("home.modes.cursor.shapes.diamond") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </details>

      <details class="tool-card">
        <summary class="tool-summary">
          <div class="tool-summary-main">
            <span class="tool-badge tool-badge-purple">
              <Focus class="tool-badge-icon" />
            </span>
            <div>
              <h3>{{ $t("home.modes.spotlight.title") }}</h3>
              <p>
                {{ $t("home.modes.spotlight.description") }}
              </p>
            </div>
          </div>
          <div class="tool-summary-meta">
            <span class="shortcut-pill">{{
              getDisplayAccelerator("open-spotlight")
            }}</span>
            <label class="switch" @click.stop>
              <input
                class="switch-input"
                type="checkbox"
                v-model="spotlightShortcutEnabled"
                @click.stop
              />
              <span class="switch-track">
                <span class="switch-thumb" />
              </span>
              <span class="switch-label"></span>
            </label>
            <ChevronDown class="chevron" />
          </div>
        </summary>
        <div class="tool-body">
          <div class="tool-subgrid">
            <div class="sub-section">
              <h4>{{ $t("home.modes.spotlight.visualization") }}</h4>
              <div class="field">
                <span class="field-label">{{ $t("home.modes.spotlight.preview") }}</span>
              </div>
              <div class="preview-box desktop-bg">
                <div
                  class="spotlight-preview"
                  :style="spotlightPreviewStyle"
                ></div>
                <div
                  class="spotlight-ring-preview"
                  :style="spotlightRingStyle"
                ></div>
                <svg
                  class="cursor-icon"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.5 3.21422C5.5 2.19087 6.67108 1.61163 7.48152 2.23393L19.4623 11.432C20.5284 12.2505 20.0722 13.9113 18.7369 14.102L13.8824 14.7955C13.5651 14.8408 13.2753 15.0118 13.0766 15.2707L10.3752 18.7915C9.55403 19.8618 7.89291 19.2625 7.89291 17.9135V3.21422Z"
                    fill="white"
                    stroke="black"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div class="sub-section">
              <h4>{{ $t("home.modes.spotlight.background") }}</h4>

              <div class="color-row">
                <input v-model="spotlightBackdrop" type="color" />
              </div>
              <input
                id="spotlight-hex"
                class="shortcut-input"
                type="text"
                v-model.lazy="spotlightBackdrop"
                placeholder="#000000"
              />
              <div class="field">
                <label for="spotlight-opacity">{{
                  $t("home.modes.spotlight.opacity")
                }}</label>
                <input
                  id="spotlight-opacity"
                  class="range"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  :value="spotlightOpacity"
                  @input="
                    spotlightOpacity = Number(
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
                <span class="range-value"
                  >{{ Math.round(spotlightOpacity * 100) }}%</span
                >
              </div>
            </div>
            <div class="sub-section">
              <h4>{{ $t("home.modes.spotlight.radius") }}</h4>
              <div class="field">
                <label for="spotlight-radius">{{
                  $t("home.modes.spotlight.spotlightSize")
                }}</label>
                <input
                  id="spotlight-radius"
                  class="range"
                  type="range"
                  min="80"
                  max="320"
                  step="4"
                  :value="spotlightRadius"
                  @input="
                    spotlightRadius = Number(
                      ($event.target as HTMLInputElement).value,
                    )
                  "
                />
                <span class="range-value">{{ spotlightRadius }}px</span>
              </div>
            </div>
          </div>
        </div>
      </details>

      <details class="tool-card">
        <summary class="tool-summary">
          <div class="tool-summary-main">
            <span class="tool-badge tool-badge-teal">
              <Monitor class="tool-badge-icon" />
            </span>
            <div>
              <h3>{{ $t("home.modes.whiteboard.title") }}</h3>
              <p>
                {{ $t("home.modes.whiteboard.description") }}
              </p>
            </div>
          </div>
          <div class="tool-summary-meta">
            <span class="shortcut-pill">{{
              getDisplayAccelerator("open-whiteboard")
            }}</span>
            <label class="switch" @click.stop>
              <input
                class="switch-input"
                type="checkbox"
                v-model="whiteboardShortcutEnabled"
                @click.stop
              />
              <span class="switch-track">
                <span class="switch-thumb" />
              </span>
              <span class="switch-label"></span>
            </label>
            <ChevronDown class="chevron" />
          </div>
        </summary>
        <div class="tool-body">
          <div class="tool-subgrid">
            <div class="sub-section">
              <h4>{{ $t("home.modes.whiteboard.visualization") }}</h4>
              <label class="checkbox-row">
                <input type="checkbox" v-model="whiteboardGridEnabled" />
                <span>{{ $t("home.modes.whiteboard.showGrid") }}</span>
              </label>
            </div>
          </div>
        </div>
      </details>

      <details class="tool-card">
        <summary class="tool-summary">
          <div class="tool-summary-main">
            <span class="tool-badge tool-badge-blue">
              <ZoomIn class="tool-badge-icon" />
            </span>
            <div>
              <h3>{{ $t("home.modes.zoom.title") }}</h3>
              <p>
                {{ $t("home.modes.zoom.description") }}
              </p>
            </div>
          </div>
          <div class="tool-summary-meta">
            <span class="shortcut-pill">{{
              getDisplayAccelerator("open-zoom")
            }}</span>
            <label class="switch" @click.stop>
              <input
                class="switch-input"
                type="checkbox"
                v-model="zoomShortcutEnabled"
                @click.stop
              />
              <span class="switch-track">
                <span class="switch-thumb" />
              </span>
              <span class="switch-label"></span>
            </label>
            <ChevronDown class="chevron" />
          </div>
        </summary>
        <div class="tool-body">
          <div class="tool-subgrid">
            <div class="sub-section">
              <h4>{{ $t("home.modes.zoom.visualization") }}</h4>
              <div class="field">
                <span class="field-label">{{ $t("home.modes.zoom.preview") }}</span>
              </div>
              <div class="preview-box desktop-bg">
                <div class="zoom-preview" :style="zoomPreviewStyle">
                  <div class="zoom-preview-inner" />
                </div>
                <svg
                  class="cursor-icon"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.5 3.21422C5.5 2.19087 6.67108 1.61163 7.48152 2.23393L19.4623 11.432C20.5284 12.2505 20.0722 13.9113 18.7369 14.102L13.8824 14.7955C13.5651 14.8408 13.2753 15.0118 13.0766 15.2707L10.3752 18.7915C9.55403 19.8618 7.89291 19.2625 7.89291 17.9135V3.21422Z"
                    fill="white"
                    stroke="black"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <p class="hint" v-if="zoomMotor === 'dxgi' && zoomMode === 'live'">
                {{ $t("home.modes.zoom.modes.live.description") }}
              </p>
              <p class="hint" v-else-if="zoomMotor === 'dxgi' && zoomMode === 'freeze'">
                {{ $t("home.modes.zoom.modes.freeze.description") }}
              </p>
              <p class="hint" v-else-if="zoomMotor === 'magnifier'">
                {{ $t("home.modes.zoom.magnifierDescription") }}
              </p>
            </div>
            <div class="sub-section">
              <h4>{{ $t("home.modes.zoom.zoomLevel") }}</h4>
              <div class="field">
                <label for="zoom-level">{{
                  $t("home.modes.zoom.amplification")
                }}</label>
                <input
                  id="zoom-level"
                  class="range"
                  type="range"
                  min="1.5"
                  max="5"
                  step="0.5"
                  v-model.number="zoomLevel"
                />
                <span class="range-value">{{ zoomLevel }}x</span>
              </div>
              <h4 style="margin-top: 16px;">{{ $t("home.modes.zoom.motor") }}</h4>
              <div class="toggle-row">
                <button
                  type="button"
                  class="chip"
                  :class="{ active: zoomMotor === 'dxgi' }"
                  @click="zoomMotor = 'dxgi'"
                >
                  {{ $t("home.modes.zoom.motors.dxgi") }}
                </button>
                <button
                  type="button"
                  class="chip"
                  :class="{ active: zoomMotor === 'magnifier' }"
                  @click="zoomMotor = 'magnifier'"
                >
                  {{ $t("home.modes.zoom.motors.magnifier") }}
                </button>
              </div>
              <p v-if="zoomMotor === 'dxgi' && zoomMode === 'freeze'" class="hint">
                {{ $t("home.modes.zoom.modes.freeze.wheel") }}
              </p>
            </div>
            <div class="sub-section">
              <h4>{{ $t("home.modes.zoom.lensSize") }}</h4>
              <div class="field">
                <label for="zoom-size">{{
                  $t("home.modes.zoom.dimensions")
                }}</label>
                <input
                  id="zoom-size"
                  class="range"
                  type="range"
                  min="100"
                  max="400"
                  step="10"
                  v-model.number="zoomSize"
                />
                <span class="range-value">{{ zoomSize }}px</span>
              </div>
              <div class="toggle-row">
                <button
                  type="button"
                  class="chip"
                  :class="{ active: zoomShape === 'circle' }"
                  @click="zoomShape = 'circle'"
                >
                  {{ $t("home.modes.zoom.shapes.circle") }}
                </button>
                <button
                  type="button"
                  class="chip"
                  :class="{ active: zoomShape === 'square' }"
                  @click="zoomShape = 'square'"
                >
                  {{ $t("home.modes.zoom.shapes.square") }}
                </button>
              </div>

              <template v-if="zoomMotor === 'dxgi'">
                <h4 style="margin-top: 16px;">{{ $t("home.modes.zoom.mode") }}</h4>
                <div class="toggle-row">
                  <div class="mode-chip-container">
                    <button
                      type="button"
                      class="chip"
                      :class="{ active: zoomMode === 'live' }"
                      @click="zoomMode = 'live'"
                    >
                      {{ $t("home.modes.zoom.modes.live.title") }}
                    </button>
                  </div>
                  <div class="mode-chip-container">
                    <button
                      type="button"
                      class="chip"
                      :class="{ active: zoomMode === 'freeze' }"
                      @click="zoomMode = 'freeze'"
                    >
                      {{ $t("home.modes.zoom.modes.freeze.title") }}
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.content-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 30px;
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

.hint {
  font-size: 11px;
  color: #9aa3bb;
  margin-top: 6px;
  line-height: 1.4;
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

.tool-badge-red {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.tool-badge-yellow {
  background: rgba(234, 179, 8, 0.2);
  color: #fde047;
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.tool-badge-purple {
  background: rgba(147, 51, 234, 0.2);
  color: #d8b4fe;
  border: 1px solid rgba(147, 51, 234, 0.3);
}

.tool-badge-teal {
  background: rgba(20, 184, 166, 0.2);
  color: #5eead4;
  border: 1px solid rgba(20, 184, 166, 0.3);
}

.tool-badge-blue {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.3);
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

.shortcut-pill {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  color: #cfe9ff;
  background: rgba(12, 16, 24, 0.95);
  border: 1px solid rgba(93, 210, 255, 0.4);
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #e6e9f2;
  position: relative;
}

.switch-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  opacity: 0;
}

.switch-track {
  width: 42px;
  height: 22px;
  border-radius: 999px;
  background: rgba(27, 32, 46, 0.9);
  border: 1px solid rgba(93, 210, 255, 0.2);
  display: inline-flex;
  align-items: center;
  padding: 2px;
  transition: all 0.2s ease;
}

.switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #9aa3bb;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.switch-input:checked + .switch-track {
  background: rgba(93, 210, 255, 0.2);
  border-color: rgba(93, 210, 255, 0.6);
}

.switch-input:checked + .switch-track .switch-thumb {
  transform: translateX(20px);
  background: #5dd2ff;
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
}

.desktop-bg {
  background-image: url("/desktop-capture.webp");
  background-size: cover;
  background-position: center;
}

.cursor-preview {
  transition: all 0.2s ease;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
}

.cursor-halo-preview {
  position: absolute;
  border: 2px solid;
  transition: all 0.2s ease;
  z-index: 10;
}

.cursor-icon {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-3px, -2px);
  z-index: 20;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.spotlight-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.spotlight-ring-preview {
  position: absolute;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 20px rgba(93, 210, 255, 0.3);
  pointer-events: none;
  z-index: 6;
}

.select,
.shortcut-input {
  background: rgba(23, 27, 39, 0.9);
  border: 1px solid rgba(93, 210, 255, 0.1);
  border-radius: 10px;
  padding: 8px 10px;
  color: #e6e9f2;
}

.range {
  width: 100%;
}

.range-value {
  font-size: 11px;
  color: #9aa3bb;
}

.toggle-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.chip.active {
  border-color: rgba(93, 210, 255, 0.7);
  background: rgba(93, 210, 255, 0.16);
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #9aa3bb;
}

.zoom-preview {
  position: relative;
  overflow: hidden;
  box-shadow:
    0 0 0 3px rgba(93, 210, 255, 0.6),
    0 4px 16px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.zoom-preview-inner {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(93, 210, 255, 0.1),
    rgba(79, 124, 255, 0.1)
  );
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: inherit;
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
  .shortcut-pill {
    display: none;
  }

  .tool-subgrid {
    grid-template-columns: 1fr;
  }
}
</style>
