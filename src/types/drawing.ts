import type { ToolId } from "./tools";

export type Point = {
  x: number;
  y: number;
};

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GradientStop = {
  color: string;
  position: number;
};

export type GradientConfig = {
  type: "linear" | "radial";
  angle: number;
  stops: GradientStop[];
};

export type GradientPalette = {
  id: string;
  name: string;
  config: GradientConfig;
};

export type DrawAction = {
  id: string;
  tool: ToolId;
  color: string;
  width: number;
  opacity: number;
  fillOpacity?: number;
  points: Point[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  smoothing?: boolean;
  gradient?: {
    enabled: boolean;
    type: "linear" | "radial";
    angle: number;
    stops: Array<{ color: string; position: number }>;
  };
  composite?: GlobalCompositeOperation;
};
