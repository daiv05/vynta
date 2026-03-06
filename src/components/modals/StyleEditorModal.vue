<script setup lang="ts">
import { X } from "lucide-vue-next";
import { ref, watch } from "vue";
import type {
  GradientStop,
  QuickColorSlot,
} from "../../composables/useToolState";

import { useToolsStore } from "../../stores/tools";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (event: "close"): void;
  (event: "save"): void;
}>();

const toolsStore = useToolsStore();
const draftSlots = ref<QuickColorSlot[]>([]);
const hexDrafts = ref<Record<string, string>>({});
const hexPattern = /^#([0-9a-f]{6})$/i;

function normalizeStops(colors: [string, string]): GradientStop[] {
  return [
    { color: colors[0], position: 0 },
    { color: colors[1], position: 1 },
  ];
}

function addStop(slot: QuickColorSlot) {
  if (!slot.gradient || slot.gradient.stops.length >= 4) return;
  const lastStop = slot.gradient.stops[slot.gradient.stops.length - 1];
  slot.gradient.stops.push({
    color: lastStop.color,
    position: 1,
  });
  const count = slot.gradient.stops.length;
  slot.gradient.stops.forEach((stop, index) => {
    stop.position = index / (count - 1);
  });
}

function removeStop(slot: QuickColorSlot, index: number) {
  if (!slot.gradient || slot.gradient.stops.length <= 2) return;
  slot.gradient.stops.splice(index, 1);
  const count = slot.gradient.stops.length;
  slot.gradient.stops.forEach((stop, idx) => {
    stop.position = idx / (count - 1);
  });
}

function initializeDrafts() {
  draftSlots.value = toolsStore.quickColorSlots.map((slot) => ({
    ...slot,
    gradient: slot.gradient
      ? {
          ...slot.gradient,
          stops: slot.gradient.stops.map((stop) => ({ ...stop })),
        }
      : undefined,
  }));
  hexDrafts.value = {};
  draftSlots.value.forEach((slot, index) => {
    const base = slot.color ?? "#5dd2ff";
    hexDrafts.value[`color-${index}`] = base;
    slot.gradient?.stops?.forEach((stop, stopIndex) => {
      hexDrafts.value[`stop-${index}-${stopIndex}`] = stop.color;
    });
  });
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

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#")
    ? trimmed.toUpperCase()
    : `#${trimmed.toUpperCase()}`;
}

function isValidHex(value: string) {
  return hexPattern.test(normalizeHex(value));
}

function getHexDraft(key: string, fallback: string) {
  return hexDrafts.value[key] ?? fallback;
}

function setHexDraft(key: string, value: string) {
  hexDrafts.value = { ...hexDrafts.value, [key]: value };
}

function setSlotColor(slot: QuickColorSlot, value: string) {
  const normalized = normalizeHex(value);
  if (!isValidHex(normalized)) return;
  slot.color = normalized;
}

function updateStopColor(
  slot: QuickColorSlot,
  stopIndex: number,
  value: string,
) {
  const normalized = normalizeHex(value);
  if (!isValidHex(normalized) || !slot.gradient) return;
  if (slot.gradient.stops[stopIndex]) {
    slot.gradient.stops[stopIndex].color = normalized;
  }
}

function handleClose() {
  emit("close");
}

function handleSave() {
  draftSlots.value.forEach((slot, index) => {
    toolsStore.setQuickColorSlot(index, slot);
  });
  emit("save");
  emit("close");
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      initializeDrafts();
    }
  },
);
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="handleClose">
    <div class="modal">
      <header class="modal-header">
        <h3>{{ $t("modals.styleEditor.title") }}</h3>
        <button type="button" class="icon-button" @click="handleClose">
          <X class="close-icon" />
        </button>
      </header>
      <div class="modal-body">
        <div
          v-for="(slot, index) in draftSlots"
          :key="slot.id"
          class="slot-row"
        >
          <div
            class="slot-preview"
            :style="{ background: slotPreview(slot) }"
          />
          <div class="slot-controls">
            <label class="field">
              <span>{{ $t("modals.styleEditor.type") }}</span>
              <select
                class="select"
                :value="slot.type"
                @change="
                  slot.type = ($event.target as HTMLSelectElement).value as
                    | 'color'
                    | 'gradient'
                "
              >
                <option value="color">
                  {{ $t("modals.styleEditor.types.color") }}
                </option>
                <option value="gradient">
                  {{ $t("modals.styleEditor.types.gradient") }}
                </option>
              </select>
            </label>
            <div v-if="slot.type === 'color'" class="field">
              <label :for="`slot-color-${index}`">{{
                $t("modals.styleEditor.color")
              }}</label>
              <input
                :id="`slot-color-${index}`"
                type="color"
                :value="slot.color ?? '#5dd2ff'"
                @input="
                  setSlotColor(slot, ($event.target as HTMLInputElement).value);
                  setHexDraft(
                    `color-${index}`,
                    ($event.target as HTMLInputElement).value,
                  );
                "
              />
              <input
                :id="`slot-color-hex-${index}`"
                class="input-hex"
                type="text"
                :value="getHexDraft(`color-${index}`, slot.color ?? '#5dd2ff')"
                placeholder="#RRGGBB"
                :class="{
                  invalid: !isValidHex(
                    getHexDraft(`color-${index}`, slot.color ?? '#5dd2ff'),
                  ),
                }"
                @input="
                  setHexDraft(
                    `color-${index}`,
                    ($event.target as HTMLInputElement).value,
                  );
                  setSlotColor(slot, ($event.target as HTMLInputElement).value);
                "
              />
            </div>
            <div v-else class="gradient-editor">
              <label class="field">
                <span>{{ $t("modals.styleEditor.angle") }}</span>
                <input
                  :id="`slot-angle-${index}`"
                  class="range"
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  :value="slot.gradient?.angle ?? 45"
                  @input="
                    slot.gradient = {
                      type: 'linear',
                      angle: Number(($event.target as HTMLInputElement).value),
                      stops:
                        slot.gradient?.stops ??
                        normalizeStops(['#5dd2ff', '#4f7cff']),
                    }
                  "
                />
              </label>
              <div class="gradient-stops">
                <div
                  v-for="(stop, stopIndex) in slot.gradient?.stops"
                  :key="stopIndex"
                  class="stop-item"
                >
                  <div class="stop-color-row">
                    <input
                      :id="`slot-${index}-stop-${stopIndex}`"
                      type="color"
                      :value="stop.color"
                      @input="
                        updateStopColor(
                          slot,
                          stopIndex,
                          ($event.target as HTMLInputElement).value,
                        );
                        setHexDraft(
                          `stop-${index}-${stopIndex}`,
                          ($event.target as HTMLInputElement).value,
                        );
                      "
                    />
                    <input
                      class="input-hex"
                      type="text"
                      :value="
                        getHexDraft(`stop-${index}-${stopIndex}`, stop.color)
                      "
                      placeholder="#RRGGBB"
                      :class="{
                        invalid: !isValidHex(
                          getHexDraft(`stop-${index}-${stopIndex}`, stop.color),
                        ),
                      }"
                      @input="
                        setHexDraft(
                          `stop-${index}-${stopIndex}`,
                          ($event.target as HTMLInputElement).value,
                        );
                        updateStopColor(
                          slot,
                          stopIndex,
                          ($event.target as HTMLInputElement).value,
                        );
                      "
                    />
                    <button
                      v-if="(slot.gradient?.stops.length ?? 0) > 2"
                      type="button"
                      class="icon-button small"
                      @click="removeStop(slot, stopIndex)"
                      :title="$t('modals.styleEditor.removeStop')"
                    >
                      <X class="close-icon" />
                    </button>
                  </div>
                </div>
                <button
                  v-if="(slot.gradient?.stops.length ?? 0) < 4"
                  type="button"
                  class="chip small"
                  @click="addStop(slot)"
                >
                  + {{ $t("modals.styleEditor.addStop") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer class="modal-footer">
        <button type="button" class="chip" @click="handleClose">
          {{ $t("modals.styleEditor.cancel") }}
        </button>
        <button type="button" class="chip active" @click="handleSave">
          {{ $t("modals.styleEditor.save") }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 12, 0.6);
  display: grid;
  place-items: center;
  z-index: 20;
}

.modal {
  width: min(720px, 92vw);
  max-height: 80vh;
  overflow: hidden;
  background: #0f131c;
  border: 1px solid rgba(93, 210, 255, 0.12);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
}

.modal-header,
.modal-footer {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(93, 210, 255, 0.08);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.modal-footer {
  border-top: 1px solid rgba(93, 210, 255, 0.08);
  border-bottom: none;
  gap: 12px;
}

.modal-body {
  padding: 16px 20px;
  overflow: auto;
  display: grid;
  gap: 16px;
}

.slot-row {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 16px;
  align-items: start;
  padding: 12px;
  border-radius: 14px;
  background: rgba(16, 19, 28, 0.9);
  border: 1px solid rgba(93, 210, 255, 0.08);
}

.slot-preview {
  width: 54px;
  height: 54px;
  border-radius: 12px;
}

.slot-controls {
  display: grid;
  gap: 10px;
}

.gradient-editor {
  display: grid;
  gap: 10px;
}

.gradient-stops {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stop-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stop-color-row {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 8px;
  align-items: center;
}

.icon-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.icon-button:hover {
  background: rgba(30, 35, 48, 0.9);
  border-color: rgba(255, 255, 255, 0.15);
}

.close-icon {
  width: 20px;
  height: 20px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #c7cfe2;
}

.field label {
  font-size: 12px;
  color: #c7cfe2;
}

.field span {
  font-size: 12px;
  color: #9aa3bb;
}

.select {
  background: rgba(23, 27, 39, 0.9);
  border: 1px solid rgba(93, 210, 255, 0.1);
  border-radius: 10px;
  padding: 8px 10px;
  color: #e6e9f2;
  font-size: 13px;
  cursor: pointer;
}

.range {
  width: 100%;
}

.input-hex {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  text-transform: uppercase;
  background: rgba(23, 27, 39, 0.9);
  border: 1px solid rgba(93, 210, 255, 0.1);
  border-radius: 8px;
  padding: 6px 8px;
  color: #e6e9f2;
  font-size: 12px;
}

.input-hex.invalid {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.05);
}

.chip {
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid rgba(93, 210, 255, 0.2);
  background: rgba(12, 16, 24, 0.95);
  color: #c7cfe2;
  transition: all 0.2s ease;
}

.chip:hover {
  background: rgba(20, 24, 35, 0.95);
  border-color: rgba(93, 210, 255, 0.3);
}

.chip.active {
  background: #5dd2ff;
  color: #0a0c12;
  border-color: transparent;
  font-weight: 600;
}

.chip.active:hover {
  background: #4fc3f0;
}

@media (max-width: 640px) {
  .modal-header,
  .modal-footer {
    padding: 14px 16px;
  }

  .modal-body {
    padding: 14px 16px;
  }

  .slot-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .slot-preview {
    width: 100%;
    height: 60px;
  }

  .gradient-stops {
    gap: 8px;
  }

  .stop-color-row {
    grid-template-columns: 36px 1fr auto;
  }

  .icon-button.small {
    padding: 2px;
    width: 24px;
    height: 24px;
  }

  .icon-button.small :deep(svg) {
    width: 14px;
    height: 14px;
  }

  .chip.small {
    padding: 6px 12px;
    font-size: 12px;
    align-self: flex-start;
  }
}
</style>
