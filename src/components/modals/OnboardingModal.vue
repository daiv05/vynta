<script setup lang="ts">
import {
  CircleDot,
  Focus,
  Keyboard,
  Monitor,
  PenTool,
  X,
  ZoomIn,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, watch, type Component } from "vue";
import { ALL_SHORTCUTS } from "../../constants/shortcuts";
import { useSettingsStore } from "../../stores/settings";
import { formatAccelerator } from "../../utils/format-accelerator";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (event: "close"): void;
}>();

const settingsStore = useSettingsStore();
const { shortcutMap } = storeToRefs(settingsStore);

type ModeStep = {
  kind: "mode";
  modeId: string;
  icon: Component;
  badgeClass: string;
  shortcutId: string;
  titleKey: string;
  descKey: string;
};

type OnboardingStep =
  | { kind: "welcome" }
  | ModeStep
  | { kind: "hotkeys" };

const modeSteps: ModeStep[] = [
  {
    kind: "mode",
    modeId: "draw",
    icon: PenTool,
    badgeClass: "tool-badge-red",
    shortcutId: "open-draw",
    titleKey: "home.modes.draw.title",
    descKey: "home.modes.draw.description",
  },
  {
    kind: "mode",
    modeId: "cursor",
    icon: CircleDot,
    badgeClass: "tool-badge-yellow",
    shortcutId: "open-cursor-highlight",
    titleKey: "home.modes.cursor.title",
    descKey: "home.modes.cursor.description",
  },
  {
    kind: "mode",
    modeId: "spotlight",
    icon: Focus,
    badgeClass: "tool-badge-purple",
    shortcutId: "open-spotlight",
    titleKey: "home.modes.spotlight.title",
    descKey: "home.modes.spotlight.description",
  },
  {
    kind: "mode",
    modeId: "whiteboard",
    icon: Monitor,
    badgeClass: "tool-badge-teal",
    shortcutId: "open-whiteboard",
    titleKey: "home.modes.whiteboard.title",
    descKey: "home.modes.whiteboard.description",
  },
  {
    kind: "mode",
    modeId: "zoom",
    icon: ZoomIn,
    badgeClass: "tool-badge-blue",
    shortcutId: "open-zoom",
    titleKey: "home.modes.zoom.title",
    descKey: "home.modes.zoom.description",
  },
];

const steps: OnboardingStep[] = [
  { kind: "welcome" },
  ...modeSteps,
  { kind: "hotkeys" },
];

const currentStep = ref(0);
const totalSteps = steps.length;

const step = computed<OnboardingStep>(() => steps[currentStep.value]!);
const isFirst = computed(() => currentStep.value === 0);
const isLast = computed(() => currentStep.value === totalSteps - 1);

function acceleratorFor(shortcutId: string): string {
  const def = ALL_SHORTCUTS.find((s) => s.id === shortcutId);
  const accelerator = shortcutMap.value[shortcutId] ?? def?.accelerator ?? "";
  return formatAccelerator(accelerator);
}

function next() {
  if (isLast.value) {
    finish();
    return;
  }
  currentStep.value += 1;
}

function prev() {
  if (isFirst.value) return;
  currentStep.value -= 1;
}

function goTo(index: number) {
  currentStep.value = index;
}

function finish() {
  emit("close");
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    finish();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.isOpen) return;
  if (event.key === "Escape") finish();
  else if (event.key === "ArrowRight") next();
  else if (event.key === "ArrowLeft") prev();
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      currentStep.value = 0;
      window.addEventListener("keydown", handleKeydown);
    } else {
      window.removeEventListener("keydown", handleKeydown);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="props.isOpen"
        class="modal-backdrop"
        @click="handleBackdropClick"
      >
        <div class="onboarding-modal">
          <div class="modal-header">
            <div class="brand">
              <img src="/app-icon.webp" class="brand-icon" alt="Vynta" />
              <span class="brand-name">{{ $t("app.title") }}</span>
            </div>
            <button
              type="button"
              class="close-button"
              @click="finish"
              :aria-label="$t('onboarding.nav.skip')"
            >
              <X class="close-icon" />
            </button>
          </div>

          <div class="modal-body">
            <Transition name="step-fade" mode="out-in">
              <div :key="currentStep" class="step">
                <template v-if="step.kind === 'welcome'">
                  <img
                    src="/app-icon.webp"
                    class="welcome-icon"
                    alt="Vynta"
                  />
                  <h2 class="step-title">{{ $t("app.title") }}</h2>
                  <p class="step-desc">{{ $t("onboarding.welcome.subtitle") }}</p>
                </template>

                <template v-else-if="step.kind === 'mode'">
                  <span class="tool-badge step-badge" :class="step.badgeClass">
                    <component :is="step.icon" class="step-badge-icon" />
                  </span>
                  <h2 class="step-title">{{ $t(step.titleKey) }}</h2>
                  <p class="step-desc">{{ $t(step.descKey) }}</p>
                  <span class="shortcut-pill">{{
                    acceleratorFor(step.shortcutId)
                  }}</span>
                </template>

                <template v-else>
                  <span class="tool-badge step-badge tool-badge-blue">
                    <Keyboard class="step-badge-icon" />
                  </span>
                  <h2 class="step-title">{{ $t("onboarding.hotkeys.title") }}</h2>
                  <p class="step-desc">{{ $t("onboarding.hotkeys.description") }}</p>
                </template>
              </div>
            </Transition>
          </div>

          <div class="modal-footer">
            <div class="dots">
              <button
                v-for="(_, index) in steps"
                :key="index"
                type="button"
                class="dot"
                :class="{ active: index === currentStep }"
                :aria-label="
                  $t('onboarding.stepLabel', {
                    current: index + 1,
                    total: totalSteps,
                  })
                "
                @click="goTo(index)"
              />
            </div>
            <div class="footer-actions">
              <button
                v-if="!isLast"
                type="button"
                class="skip-link"
                @click="finish"
              >
                {{ $t("onboarding.nav.skip") }}
              </button>
              <button
                v-if="!isFirst"
                type="button"
                class="button button-secondary"
                @click="prev"
              >
                {{ $t("onboarding.nav.back") }}
              </button>
              <button
                type="button"
                class="button button-primary"
                @click="next"
              >
                {{ isLast ? $t("onboarding.nav.start") : $t("onboarding.nav.next") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.onboarding-modal {
  background: radial-gradient(circle at top left, #151a26, var(--color-bg) 60%);
  border: 1px solid rgba(var(--color-accent-soft), 0.18);
  border-radius: 18px;
  width: min(92vw, 460px);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(6, 8, 14, 0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(var(--color-accent-soft), 0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 28px;
  height: 28px;
  border-radius: 9px;
}

.brand-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.close-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #9aa3bb;
  display: flex;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.close-icon {
  width: 18px;
  height: 18px;
}

.modal-body {
  padding: 34px 28px;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
}

.welcome-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
}

.step-badge {
  width: 64px;
  height: 64px;
  border-radius: 20px;
}

.step-badge-icon :deep(svg) {
  width: 30px;
  height: 30px;
}

.step-title {
  margin: 0;
  font-size: 20px;
  color: var(--color-text);
}

.step-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #9aa3bb;
  max-width: 340px;
}

.shortcut-pill {
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: #cfe9ff;
  background: rgba(12, 16, 24, 0.95);
  border: 1px solid rgba(var(--color-accent-soft), 0.4);
}

.tool-badge {
  display: grid;
  place-items: center;
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

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(var(--color-accent-soft), 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 999px;
  border: none;
  background: rgba(var(--color-accent-soft), 0.25);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot.active {
  background: var(--color-accent);
  transform: scale(1.3);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.skip-link {
  background: none;
  border: none;
  color: #9aa3bb;
  font-size: 13px;
  cursor: pointer;
  padding: 8px;
}

.skip-link:hover {
  color: #e6e9f2;
}

.button {
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.button-secondary {
  background: rgba(24, 28, 40, 0.9);
  color: #e6ecff;
  border: 1px solid rgba(var(--color-accent-soft), 0.2);
}

.button-primary {
  background: var(--color-accent);
  color: var(--color-bg-deep);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .onboarding-modal,
.modal-fade-leave-active .onboarding-modal {
  transition: all 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .onboarding-modal,
.modal-fade-leave-to .onboarding-modal {
  transform: scale(0.95);
  opacity: 0;
}

.step-fade-enter-active,
.step-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.step-fade-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
