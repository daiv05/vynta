import type { Ref } from "vue";

type ArrowStyle = "simple" | "filled" | "double" | "thick" | "stealth";

const radiusPresets = [0, 8, 16, 24, 32] as const;
const arrowStyleOrder: readonly ArrowStyle[] = [
  "simple",
  "filled",
  "double",
  "thick",
  "stealth",
];

export function useShapeStyleControls(options: {
  borderRadius: Ref<number>;
  arrowStyle: Ref<ArrowStyle>;
  setBorderRadius: (value: number) => void;
  setArrowStyle: (value: ArrowStyle) => void;
}) {
  function nextBorderRadius() {
    const currentIndex = radiusPresets.findIndex(
      (value) => value === options.borderRadius.value,
    );
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % radiusPresets.length : 0;
    options.setBorderRadius(radiusPresets[nextIndex]);
  }

  function nextArrowStyle() {
    const currentIndex = arrowStyleOrder.findIndex(
      (value) => value === options.arrowStyle.value,
    );
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + 1) % arrowStyleOrder.length : 0;
    options.setArrowStyle(arrowStyleOrder[nextIndex]);
  }

  return {
    nextBorderRadius,
    nextArrowStyle,
  };
}
