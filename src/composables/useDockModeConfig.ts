import { computed } from "vue";
import type { Ref } from "vue";
import type { ToolId } from "../types/tools";

export type DockMode = "overlay" | "whiteboard";

export function useDockModeConfig(mode: Ref<DockMode>) {
  const toolsByMode = computed<Record<DockMode, ToolId[]>>(() => ({
    overlay: [
      "select",
      "pen",
      "marker",
      "rect",
      "ellipse",
      "line",
      "arrow",
      "text",
      "eraser",
    ],
    whiteboard: [
      "select",
      "pen",
      "marker",
      "rect",
      "ellipse",
      "line",
      "arrow",
      "text",
      "eraser",
    ],
  }));

  const controlsByMode = computed(() => ({
    overlay: {
      lineStyle: true,
      lockSelection: true,
      groupSelection: true,
      smoothing: true,
      autoErase: true,
      textOptions: true,
      shapeOptions: true,
    },
    whiteboard: {
      lineStyle: true,
      lockSelection: true,
      groupSelection: true,
      smoothing: true,
      autoErase: true,
      textOptions: true,
      shapeOptions: true,
    },
  }));

  const availableTools = computed(() => toolsByMode.value[mode.value]);
  const controls = computed(() => controlsByMode.value[mode.value]);

  return {
    availableTools,
    controls,
  };
}
