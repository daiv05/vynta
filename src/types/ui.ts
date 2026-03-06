import type { GradientConfig } from "./drawing";

export type QuickColorSlot = {
  id: string;
  type: "color" | "gradient";
  color?: string;
  gradient?: GradientConfig;
};

export type TextFontOption = {
  label: string;
  value: string;
};

export type OverlayDockOrientation = "horizontal" | "vertical";
