<script setup lang="ts">
import { Settings } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import UiCard from "../../ui/UiCard.vue";

const props = defineProps<{
  startWithWindows: boolean;
}>();

const emit = defineEmits<{
  (event: "toggle-start-with-windows", enabled: boolean): void;
  (event: "request-reset-preferences"): void;
}>();

const { locale } = useI18n();

function setLocale(newLocale: string) {
  locale.value = newLocale;
  localStorage.setItem("user-locale", newLocale);
}
</script>

<template>
  <div class="content-section">
    <div class="section-title">
      <span class="section-icon" aria-hidden="true">
        <Settings class="section-icon-glyph" />
      </span>
      <div>
        <h2>{{ $t("settings.title") }}</h2>
      </div>
    </div>

    <div class="settings-grid">
      <UiCard class="settings-card">
        <h3>{{ $t("settings.language") }}</h3>
        <select
          :value="locale"
          class="settings-select"
          @change="setLocale(($event.target as HTMLSelectElement).value)"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </UiCard>

      <UiCard class="settings-card">
        <h3>{{ $t("settings.startWithWindows") }}</h3>
        <label class="checkbox-row">
          <input
            type="checkbox"
            :checked="props.startWithWindows"
            @change="
              emit(
                'toggle-start-with-windows',
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
          <span>{{ $t("settings.startWithWindows") }}</span>
        </label>
      </UiCard>

      <UiCard class="settings-card">
        <h3>{{ $t("settings.restorePreferences") }}</h3>
        <p>{{ $t("settings.resetPreferences") }}</p>
        <button
          type="button"
          class="danger"
          @click="emit('request-reset-preferences')"
        >
          {{ $t("settings.resetPreferences") }}
        </button>
      </UiCard>
    </div>
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

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.settings-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 12px;
  color: #9aa3bb;
}

.settings-card h3 {
  margin: 0;
  font-size: 14px;
  color: #e6e9f2;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
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

@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

.settings-select {
  background: rgba(23, 27, 39, 0.9);
  border: 1px solid rgba(93, 210, 255, 0.1);
  border-radius: 10px;
  padding: 8px 10px;
  color: #e6e9f2;
  width: 100%;
}
</style>
