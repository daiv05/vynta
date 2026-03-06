import { ref } from "vue";
import type { TextFontOption } from "../types/ui";

export type {
  GradientConfig,
  GradientPalette,
  GradientStop,
} from "../types/drawing";
export type { CursorHighlightShape, ModeShortcutId } from "../types/modes";
export type { ToolDefaults, ToolId } from "../types/tools";
export type {
  OverlayDockOrientation,
  QuickColorSlot,
  TextFontOption,
} from "../types/ui";

export const textFontOptions: TextFontOption[] = [
  { label: "Segoe UI", value: '"Segoe UI", system-ui, sans-serif' },
  { label: "Calibri", value: "Calibri, Arial, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Comic Sans MS", value: '"Comic Sans MS", "Segoe UI", sans-serif' },
  { label: "Segoe Print", value: '"Segoe Print", "Segoe UI", sans-serif' },
  { label: "Segoe Script", value: '"Segoe Script", "Segoe UI", sans-serif' },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Consolas", value: "Consolas, 'Courier New', monospace" },
];

export function useToolState() {
  const spotlightEnabled = ref<boolean>(false);
  const zoomEnabled = ref<boolean>(false);
  const canvasNonce = ref<number>(0);

  function toggleSpotlight() {
    spotlightEnabled.value = !spotlightEnabled.value;
  }

  function toggleZoom() {
    zoomEnabled.value = !zoomEnabled.value;
  }

  function clearCanvas() {
    canvasNonce.value += 1;
  }

  return {
    spotlightEnabled,
    zoomEnabled,
    canvasNonce,
    toggleSpotlight,
    toggleZoom,
    clearCanvas,
  };
}
