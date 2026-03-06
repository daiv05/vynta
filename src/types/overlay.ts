import type {
  GradientStop,
  QuickColorSlot,
  ToolId,
} from "../composables/useToolState";

export type OverlayPayload = {
  selectedTool: ToolId;
  enabledTools: Record<ToolId, boolean>;
  strokeColor: string;
  strokeWidth: number;
  textFont: string;
  textSize: number;
  smoothingEnabled: boolean;
  autoEraseEnabled: boolean;
  autoEraseDelay: number;
  gradientEnabled: boolean;
  gradientType: "linear" | "radial";
  gradientAngle: number;
  gradientStops: GradientStop[];
  clearNonce: number;
  quickColorSlots: QuickColorSlot[];
  overlayDockOrientation: "horizontal" | "vertical";
  whiteboardGridEnabled: boolean;
  fillOpacity: number;
};

export type OverlayAction = {
  type: "undo" | "redo";
};
