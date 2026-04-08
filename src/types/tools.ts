export type ToolId =
  | "select"
  | "pen"
  | "marker"
  | "rect"
  | "ellipse"
  | "arrow"
  | "text"
  | "eraser"
  | "cursor"
  | "spotlight"
  | "zoom"
  | "line"
  | "whiteboard";

export type ToolDefaults = {
  strokeColor: string;
  strokeWidth: number;
  dashPattern: number[];
  textFont: string;
  textSize: number;
};
