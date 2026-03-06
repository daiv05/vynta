<script setup lang="ts">
import { X } from "lucide-vue-next";

const props = defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}>();

const emit = defineEmits<{
  (event: "confirm"): void;
  (event: "cancel"): void;
}>();

function handleConfirm() {
  emit("confirm");
}

function handleCancel() {
  emit("cancel");
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleCancel();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="props.isOpen"
        class="modal-backdrop"
        @click="handleBackdropClick"
      >
        <div
          class="confirm-modal"
          :class="`variant-${props.variant ?? 'info'}`"
        >
          <div class="modal-header">
            <h3>{{ props.title }}</h3>
            <button
              type="button"
              class="close-button"
              @click="handleCancel"
              aria-label="Cerrar"
            >
              <X class="close-icon" />
            </button>
          </div>
          <div class="modal-body">
            <p>{{ props.message }}</p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="button button-secondary"
              @click="handleCancel"
            >
              {{ props.cancelText ?? $t("modals.cancel") }}
            </button>
            <button
              type="button"
              class="button button-primary"
              @click="handleConfirm"
            >
              {{ props.confirmText ?? $t("modals.confirm") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.confirm-modal {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 12px;
  width: min(90vw, 480px);
  max-width: 100%;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.close-button {
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

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.close-icon {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #ccc;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #333;
  background: rgba(0, 0, 0, 0.2);
}

.button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 100px;
}

.button-secondary {
  background: #2a2a2a;
  color: #ccc;
  border: 1px solid #444;
}

.button-primary {
  background: #5dd2ff;
  color: #000;
  font-weight: 600;
}

.variant-danger .button-primary {
  background: #ef4444;
  color: #fff;
}

.variant-warning .button-primary {
  background: #fbbf24;
  color: #000;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .confirm-modal,
.modal-fade-leave-active .confirm-modal {
  transition: all 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .confirm-modal,
.modal-fade-leave-to .confirm-modal {
  transform: scale(0.95);
  opacity: 0;
}

@media (max-width: 640px) {
  .modal-header,
  .modal-footer {
    padding: 16px 20px;
  }

  .modal-body {
    padding: 20px;
  }

  .button {
    min-width: 80px;
    padding: 8px 16px;
  }
}
</style>
