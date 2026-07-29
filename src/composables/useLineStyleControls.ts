import { computed } from "vue";
import type { Ref } from "vue";

const dashPresetOrder = ["solid", "dashed", "dotted"] as const;

const dashPresets = [
  { key: "solid", pattern: [] as number[] },
  { key: "dashed", pattern: [14, 10] as number[] },
  { key: "dotted", pattern: [2, 10] as number[] },
] as const;

function normalizeDashPattern(pattern: number[]) {
  return pattern
    .filter((value) => Number.isFinite(value) && value >= 0)
    .map((value) => Math.round(value));
}

export function useLineStyleControls(options: {
  dashPattern: Ref<number[]>;
  strokeWidth: Ref<number>;
  setDashPattern: (pattern: number[]) => void;
}) {
  function patternForWidth(pattern: number[]) {
    if (pattern.length === 0) return [];
    const width = Math.max(1, Math.round(options.strokeWidth.value));
    const on = pattern[0] ?? 0;
    const off = pattern[1] ?? on;

    if (on <= 3) {
      return [
        Math.max(1, Math.round(width * 0.2)),
        Math.max(6, Math.round(width * 1.6)),
      ];
    }

    return [
      Math.max(on, Math.round(width * 1.2)),
      Math.max(off, Math.round(width * 0.9)),
    ];
  }

  function inferDashPresetKey(pattern: number[]) {
    if (pattern.length === 0) return "solid" as const;
    const first = Math.max(0, pattern[0] ?? 0);
    const width = Math.max(1, Math.round(options.strokeWidth.value));
    const dottedThreshold = Math.max(3, Math.round(width * 0.45));
    if (first <= dottedThreshold) return "dotted" as const;
    return "dashed" as const;
  }

  const dashPresetKey = computed(() =>
    inferDashPresetKey(normalizeDashPattern(options.dashPattern.value)),
  );

  function nextDashPattern() {
    const currentIndex = dashPresetOrder.findIndex(
      (key) => key === dashPresetKey.value,
    );
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % dashPresetOrder.length : 0;
    const nextKey = dashPresetOrder[nextIndex];
    const preset =
      dashPresets.find((entry) => entry.key === nextKey) ?? dashPresets[0];
    options.setDashPattern(patternForWidth([...preset.pattern]));
  }

  return {
    dashPresetKey,
    nextDashPattern,
  };
}
