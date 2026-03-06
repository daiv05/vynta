<script setup lang="ts">
import { X } from "lucide-vue-next";
import { onMounted, ref } from "vue";
import type { Toast } from "../../stores/toast";

const props = defineProps<{
  toast: Toast;
  onClose: (id: number) => void;
}>();

const visible = ref(false);

onMounted(() => {
  requestAnimationFrame(() => {
    visible.value = true;
  });
});

function close() {
  visible.value = false;
  setTimeout(() => {
    props.onClose(props.toast.id);
  }, 300);
}
</script>

<template>
  <div
    class="toast-item"
    :class="[toast.type, { show: visible }]"
    role="alert"
    @click="close"
  >
    <div class="toast-content">
      <span>{{ toast.message }}</span>
    </div>
    <button class="toast-close" @click.stop="close">
      <X :size="14" />
    </button>
  </div>
</template>

<style scoped>
.toast-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 280px;
  max-width: 400px;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-family: var(--font-family, sans-serif);
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  pointer-events: auto;
  cursor: pointer;

  opacity: 0;
  transform: translateY(20px) scale(0.95);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-item.show {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.toast-item.success {
  border-left: 3px solid #10b981;
}

.toast-item.error {
  border-left: 3px solid #ef4444;
}

.toast-item.warning {
  border-left: 3px solid #f59e0b;
}

.toast-item.info {
  border-left: 3px solid #3b82f6;
}

.toast-content {
  flex: 1;
  line-height: 1.4;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
</style>
