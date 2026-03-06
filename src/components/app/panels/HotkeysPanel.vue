<script setup lang="ts">
import { Keyboard, LayoutGrid, PenTool } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import type { ComponentPublicInstance } from "vue";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ALL_SHORTCUTS } from "../../../constants/shortcuts";
import { useSettingsStore } from "../../../stores/settings";
import UiCard from "../../ui/UiCard.vue";

const { t } = useI18n();

const props = defineProps<{
  shortcutErrors: Record<string, string>;
}>();

const emit = defineEmits<{
  (event: "request-reset-shortcuts"): void;
}>();

const settingsStore = useSettingsStore();
const { shortcutMap } = storeToRefs(settingsStore);

const shortcuts = computed(() => {
  return ALL_SHORTCUTS.map((s) => ({
    ...s,
    accelerator: shortcutMap.value[s.id] ?? s.accelerator,
  }));
});

const editingShortcutId = ref<string | null>(null);
const isCapturingShortcut = ref(false);
const shortcutInput = ref<HTMLInputElement | null>(null);
const shortcutListener = ref<((event: KeyboardEvent) => void) | null>(null);

function startEditShortcut(id: string) {
  editingShortcutId.value = id;
  nextTick(() => shortcutInput.value?.focus());
}

function stopEditShortcut() {
  editingShortcutId.value = null;
  isCapturingShortcut.value = false;
}

function setShortcutInputRef(el: Element | ComponentPublicInstance | null) {
  shortcutInput.value = el as HTMLInputElement | null;
}

function formatKey(event: KeyboardEvent) {
  if (event.code === "Space") return "Space";
  if (event.code.startsWith("Key")) return event.code.replace("Key", "");
  if (event.code.startsWith("Digit")) return event.code.replace("Digit", "");
  if (event.code.startsWith("Numpad"))
    return event.code.replace("Numpad", "Num");
  if (event.code.startsWith("Arrow")) return event.code;
  if (event.code.startsWith("F")) return event.code;
  return event.key.length === 1 ? event.key.toUpperCase() : event.code;
}

function isModifierKey(event: KeyboardEvent) {
  const modifierKeys = ["Shift", "Control", "Alt", "Meta"];
  if (modifierKeys.includes(event.key)) return true;
  return (
    event.code.includes("Shift") ||
    event.code.includes("Control") ||
    event.code.includes("Alt") ||
    event.code.includes("Meta")
  );
}

function handleShortcutKey(event: KeyboardEvent) {
  if (!editingShortcutId.value) return;
  event.preventDefault();
  event.stopPropagation();

  if (
    event.key === "Escape" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  ) {
    settingsStore.updateShortcut(editingShortcutId.value, "Escape");
    stopEditShortcut();
    return;
  }

  if (isModifierKey(event)) return;
  const key = formatKey(event);

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("CommandOrControl");
  if (event.metaKey) parts.push("Super");
  if (event.shiftKey) parts.push("Shift");
  if (event.altKey) parts.push("Alt");
  parts.push(key);
  const accelerator = parts.join("+");
  settingsStore.updateShortcut(editingShortcutId.value, accelerator);
  stopEditShortcut();
}

function getLocalizedError(error: string) {
  if (error.includes("already registered")) {
    return t("hotkeys.shortcuts.errors.alreadyRegistered");
  }
  return t("hotkeys.shortcuts.errors.couldNotRegister");
}

watch(editingShortcutId, (value) => {
  if (!value) {
    if (shortcutListener.value) {
      globalThis.removeEventListener("keydown", shortcutListener.value);
      shortcutListener.value = null;
    }
    return;
  }

  const listener = (event: KeyboardEvent) => handleShortcutKey(event);
  shortcutListener.value = listener;
  globalThis.addEventListener("keydown", listener);
  isCapturingShortcut.value = true;
});

onBeforeUnmount(() => {
  if (shortcutListener.value) {
    globalThis.removeEventListener("keydown", shortcutListener.value);
  }
});

const conflictMap = computed(() => {
  const map = new Map<string, string[]>();
  shortcuts.value.forEach((shortcut) => {
    if (!shortcut.accelerator) return;
    const list = map.get(shortcut.accelerator) ?? [];
    list.push(shortcut.id);
    map.set(shortcut.accelerator, list);
  });
  return map;
});

const hasConflicts = computed(() =>
  [...conflictMap.value.values()].some((ids) => ids.length > 1),
);

const hasShortcutErrors = computed(
  () => Object.keys(props.shortcutErrors).length > 0,
);

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

const shortcutLookup = computed(
  () => new Map(shortcuts.value.map((shortcut) => [shortcut.id, shortcut])),
);

function getAccelerator(id?: string) {
  if (!id) return "Sin asignar";
  return shortcutLookup.value.get(id)?.accelerator ?? "Sin asignar";
}

function getDisplayAccelerator(id?: string) {
  return formatAccelerator(getAccelerator(id));
}

function isConflict(id?: string) {
  if (!id) return false;
  const accelerator = shortcutLookup.value.get(id)?.accelerator ?? "";
  return (conflictMap.value.get(accelerator) ?? []).length > 1;
}

type ShortcutItem = {
  id?: string;
  label: string;
  accelerator?: string;
  editable: boolean;
};

function shortcutItem(id: string, fallbackLabel?: string): ShortcutItem {
  const shortcut = shortcutLookup.value.get(id);
  return {
    id,
    label: fallbackLabel ?? shortcut?.label ?? id,
    accelerator: shortcut?.accelerator,
    editable: true,
  };
}

const shortcutSections = computed(() => [
  {
    title: t("hotkeys.sections.general"),
    icon: LayoutGrid,
    items: [
      shortcutItem("open-draw", t("hotkeys.actions.openDraw")),
      shortcutItem("open-cursor-highlight", t("hotkeys.actions.openCursor")),
      shortcutItem("open-spotlight", t("hotkeys.actions.openSpotlight")),
      shortcutItem("open-whiteboard", t("hotkeys.actions.openWhiteboard")),
      shortcutItem("open-zoom", t("hotkeys.actions.openZoom")),
    ],
  },
  {
    title: t("hotkeys.sections.tools"),
    icon: PenTool,
    items: [
      shortcutItem("tool-select", t("hotkeys.tools.select")),
      shortcutItem("tool-pen", t("hotkeys.tools.pen")),
      shortcutItem("tool-marker", t("hotkeys.tools.marker")),
      shortcutItem("tool-rect", t("hotkeys.tools.rect")),
      shortcutItem("tool-ellipse", t("hotkeys.tools.ellipse")),
      shortcutItem("tool-arrow", t("hotkeys.tools.arrow")),
      shortcutItem("tool-text", t("hotkeys.tools.text")),
      shortcutItem("tool-eraser", t("hotkeys.tools.eraser")),
      shortcutItem("toggle-auto-erase", t("hotkeys.tools.autoErase")),
      shortcutItem("toggle-smoothing", t("hotkeys.tools.smoothing")),
      shortcutItem("toggle-dock", t("hotkeys.tools.toggleDock")),
      shortcutItem("undo", t("hotkeys.tools.undo")),
      shortcutItem("redo", t("hotkeys.tools.redo")),
      shortcutItem("clear", t("hotkeys.tools.clear")),
    ],
  },
]);
</script>

<template>
  <div class="content-section">
    <div class="section-title">
      <span class="section-icon" aria-hidden="true">
        <Keyboard class="section-icon-glyph" />
      </span>
      <div>
        <h2>{{ $t("hotkeys.title") }}</h2>
      </div>
    </div>

    <p v-if="hasConflicts" class="warning">
      {{ $t("hotkeys.warnings.conflicts") }}
    </p>
    <p v-if="hasShortcutErrors" class="warning error">
      {{ $t("hotkeys.warnings.registrationError") }}
    </p>

    <div class="hotkey-grid">
      <UiCard
        v-for="section in shortcutSections"
        :key="section.title"
        class="hotkey-card"
      >
        <div class="hotkey-title">
          <span class="hotkey-icon" aria-hidden="true">
            <component :is="section.icon" class="hotkey-icon-glyph" />
          </span>
          <h3>{{ section.title }}</h3>
        </div>
        <div class="hotkey-list">
          <div
            v-for="item in section.items"
            :key="item.label"
            class="hotkey-row"
          >
            <span class="hotkey-label">{{ item.label }}</span>
            <div class="hotkey-action">
              <template v-if="item.editable && item.id">
                <input
                  v-if="editingShortcutId === item.id"
                  :ref="setShortcutInputRef"
                  class="shortcut-input"
                  type="text"
                  :value="getDisplayAccelerator(item.id)"
                  :placeholder="$t('hotkeys.placeholder')"
                  readonly
                  @keydown="handleShortcutKey"
                  @blur="stopEditShortcut"
                />
                <button
                  v-else
                  type="button"
                  class="shortcut-key"
                  :class="{ conflict: isConflict(item.id) }"
                  @click="startEditShortcut(item.id)"
                >
                  {{ getDisplayAccelerator(item.id) }}
                </button>
              </template>
              <span v-else class="shortcut-static">{{ item.accelerator }}</span>
            </div>
            <span
              v-if="item.id && props.shortcutErrors[item.id]"
              class="shortcut-error"
            >
              {{ getLocalizedError(props.shortcutErrors[item.id]) }}
            </span>
          </div>
        </div>
      </UiCard>
    </div>
    <div class="footer-actions">
      <button
        type="button"
        class="danger"
        @click="emit('request-reset-shortcuts')"
      >
        {{ $t("settings.resetShortcuts") }}
      </button>
    </div>
    <p v-if="isCapturingShortcut" class="hint">
      {{ $t("hotkeys.shortcuts.capturing") }}
    </p>
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

.warning {
  margin: 0;
  font-size: 12px;
  color: #ffb363;
}

.warning.error {
  color: #ff8a8a;
}

.hotkey-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.hotkey-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hotkey-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hotkey-title h3 {
  margin: 0;
  font-size: 14px;
}

.hotkey-icon {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(93, 210, 255, 0.12);
}

.hotkey-icon-glyph :deep(svg) {
  width: 16px;
  height: 16px;
}

.hotkey-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hotkey-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #c7cfe2;
}

.hotkey-action {
  display: flex;
  align-items: center;
  gap: 6px;
}

.shortcut-input {
  background: rgba(23, 27, 39, 0.9);
  border: 1px solid rgba(93, 210, 255, 0.1);
  border-radius: 10px;
  padding: 8px 10px;
  color: #e6e9f2;
}

.shortcut-key {
  border-radius: 999px;
  padding: 8px 12px;
  border: 1px solid rgba(93, 210, 255, 0.12);
  background: rgba(27, 32, 46, 0.9);
  color: #e6e9f2;
  font-size: 11px;
  cursor: pointer;
}

.shortcut-key.conflict {
  border-color: rgba(255, 140, 0, 0.7);
  color: #ffb363;
}

.shortcut-static {
  font-size: 11px;
  color: #9aa3bb;
}

.shortcut-error {
  grid-column: 1 / -1;
  font-size: 11px;
  color: #ff8a8a;
}

.footer-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.danger {
  border-radius: 999px;
  padding: 8px 12px;
  border: 1px solid rgba(92, 18, 18, 0.9);
  background: rgba(92, 18, 18, 0.9);
  border-color: rgba(255, 107, 107, 0.7);
  color: #fff2f2;
  font-size: 12px;
  cursor: pointer;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #8c94aa;
}

@media (max-width: 900px) {
  .hotkey-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hotkey-row {
    grid-template-columns: 1fr;
  }

  .hotkey-action {
    justify-content: flex-start;
  }
}
</style>
