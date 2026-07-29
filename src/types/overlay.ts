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
  dashPattern: number[];
  textFont: string;
  textSize: number;
  textWeight: "normal" | "bold";
  textStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  textAlign: "left" | "center" | "right";
  borderRadius: number;
  arrowStyle: "simple" | "filled" | "double" | "thick" | "stealth";
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
