<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useToastStore } from "../../stores/toast";
import ToastMessage from "./ToastMessage.vue";

const store = useToastStore();
const { toasts } = storeToRefs(store);
</script>

<template>
  <div class="toast-container">
    <ToastMessage
      v-for="toast in toasts"
      :key="toast.id"
      :toast="toast"
      :onClose="store.removeToast"
    />
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none; /* Let clicks pass through empty areas */
}
</style>
