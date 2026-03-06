<script setup lang="ts">
const props = defineProps<{
  interactive?: boolean;
}>();
</script>

<template>
  <div class="ui-card" :class="{ interactive: props.interactive }">
    <slot />
  </div>
</template>

<style scoped>
.ui-card {
  background: rgba(16, 19, 28, 0.88);
  border: 1px solid rgba(93, 210, 255, 0.08);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 16px 30px rgba(6, 8, 14, 0.45);
}

.ui-card.interactive {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.ui-card.interactive:hover {
  transform: translateY(-2px);
  border-color: rgba(93, 210, 255, 0.22);
  box-shadow: 0 20px 40px rgba(6, 8, 14, 0.55);
}
</style>
