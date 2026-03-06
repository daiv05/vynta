<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { ToolId } from "../../types/tools";
import ConfirmModal from "../modals/ConfirmModal.vue";
import HomePanel from "./panels/HomePanel.vue";
import HotkeysPanel from "./panels/HotkeysPanel.vue";
import SettingsPanel from "./panels/SettingsPanel.vue";

const props = defineProps<{
  activeTab: "Inicio" | "Hotkeys" | "Configuración";
  selectedTool: ToolId;
  shortcutErrors: Record<string, string>;
  startWithWindows: boolean;
  restorePreferencesOnLaunch: boolean;
}>();

const emit = defineEmits<{
  (event: "select-tool", tool: ToolId): void;
  (event: "toggle-start-with-windows", enabled: boolean): void;
  (event: "toggle-restore-preferences", enabled: boolean): void;
  (
    event: "update-whiteboard-dock-placement",
    placement: "top" | "bottom" | "left" | "right",
  ): void;
  (event: "open-draw"): void;
  (event: "open-whiteboard"): void;
  (event: "reset-preferences"): void;
  (event: "reset-shortcuts"): void;
  (event: "open-config"): void;
}>();

const isConfirmModalOpen = ref(false);
const confirmModalConfig = ref({
  title: "",
  message: "",
  confirmText: "Confirmar",
  cancelText: "Cancelar",
  variant: "info" as "danger" | "warning" | "info",
  onConfirm: () => {},
});

function showConfirmModal(
  title: string,
  message: string,
  onConfirm: () => void,
  options?: {
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
  },
) {
  confirmModalConfig.value = {
    title,
    message,
    confirmText: options?.confirmText ?? "Confirmar",
    cancelText: options?.cancelText ?? "Cancelar",
    variant: options?.variant ?? "info",
    onConfirm,
  };
  isConfirmModalOpen.value = true;
}

function handleConfirmModalConfirm() {
  confirmModalConfig.value.onConfirm();
  isConfirmModalOpen.value = false;
}

function handleConfirmModalCancel() {
  isConfirmModalOpen.value = false;
}

const { t } = useI18n();

function handleResetPreferences() {
  showConfirmModal(
    t("settings.modals.resetPreferences.title"),
    t("settings.modals.resetPreferences.message"),
    () => emit("reset-preferences"),
    {
      confirmText: t("settings.modals.resetPreferences.confirm"),
      cancelText: t("modals.cancel"),
      variant: "danger",
    },
  );
}

function handleResetShortcuts() {
  showConfirmModal(
    t("settings.modals.resetShortcuts.title"),
    t("settings.modals.resetShortcuts.message"),
    () => emit("reset-shortcuts"),
    {
      confirmText: t("settings.modals.resetShortcuts.confirm"),
      cancelText: t("modals.cancel"),
      variant: "danger",
    },
  );
}
</script>

<template>
  <div class="panel">
    <div class="panel-content">
      <HomePanel v-if="props.activeTab === 'Inicio'" />

      <HotkeysPanel
        v-else-if="props.activeTab === 'Hotkeys'"
        :shortcut-errors="props.shortcutErrors"
        @request-reset-shortcuts="handleResetShortcuts"
      />

      <SettingsPanel
        v-else
        :start-with-windows="props.startWithWindows"
        @toggle-start-with-windows="emit('toggle-start-with-windows', $event)"
        @request-reset-preferences="handleResetPreferences"
      />
    </div>

    <ConfirmModal
      :is-open="isConfirmModalOpen"
      :title="confirmModalConfig.title"
      :message="confirmModalConfig.message"
      :confirm-text="confirmModalConfig.confirmText"
      :cancel-text="confirmModalConfig.cancelText"
      :variant="confirmModalConfig.variant"
      @confirm="handleConfirmModalConfirm"
      @cancel="handleConfirmModalCancel"
    />
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 6px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

@media (max-width: 900px) {
  .panel-content {
    padding-right: 0;
  }
}
</style>
