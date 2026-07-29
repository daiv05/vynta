import type { DrawAction } from "../../types/drawing";
import type { Point } from "../../types/drawing";

function normalizeDashPattern(pattern: unknown): number[] {
  if (!Array.isArray(pattern)) return [];
  return pattern
    .filter((value) => Number.isFinite(value) && Number(value) >= 0)
    .map((value) => Math.round(Number(value)));
}

function normalizePoint(point: unknown): Point {
  const raw = point as { x?: unknown; y?: unknown };
  return {
    x: Number.isFinite(raw?.x) ? Number(raw.x) : 0,
    y: Number.isFinite(raw?.y) ? Number(raw.y) : 0,
  };
}

function normalizePoints(points: unknown): Point[] {
  if (!Array.isArray(points)) return [];
  return points.map((point) => normalizePoint(point));
}

function normalizeTextWeight(value: unknown): "normal" | "bold" {
  return value === "bold" ? "bold" : "normal";
}

function normalizeTextStyle(value: unknown): "normal" | "italic" {
  return value === "italic" ? "italic" : "normal";
}

function normalizeTextDecoration(value: unknown): "none" | "underline" {
  return value === "underline" ? "underline" : "none";
}

function normalizeTextAlign(value: unknown): "left" | "center" | "right" {
  if (value === "center" || value === "right") return value;
  return "left";
}

function normalizeArrowStyle(
  value: unknown,
): "simple" | "filled" | "double" | "thick" | "stealth" {
  if (
    value === "filled" ||
    value === "double" ||
    value === "thick" ||
    value === "stealth"
  ) {
    return value;
  }
  return "simple";
}

export function normalizeDrawAction(action: DrawAction): DrawAction {
  const points = normalizePoints(action.points);
  const width = Number.isFinite(action.width) ? Math.max(1, Number(action.width)) : 1;
  const opacity = Number.isFinite(action.opacity)
    ? Math.max(0, Math.min(1, Number(action.opacity)))
    : 1;
  const fillOpacity = Number.isFinite(action.fillOpacity)
    ? Math.max(0, Math.min(1, Number(action.fillOpacity)))
    : 0;
  const fontSize = Number.isFinite(action.fontSize)
    ? Math.max(8, Math.round(Number(action.fontSize)))
    : 16;
  const borderRadius = Number.isFinite(action.borderRadius)
    ? Math.max(0, Math.round(Number(action.borderRadius)))
    : 0;

  return {
    ...action,
    points,
    width,
    opacity,
    fillOpacity,
    dashPattern: normalizeDashPattern(action.dashPattern),
    fontSize,
    fontWeight: normalizeTextWeight(action.fontWeight),
    fontStyle: normalizeTextStyle(action.fontStyle),
    textDecoration: normalizeTextDecoration(action.textDecoration),
    textAlign: normalizeTextAlign(action.textAlign),
    borderRadius,
    arrowStyle: normalizeArrowStyle(action.arrowStyle),
  };
}

export function normalizeDrawActions(actions: DrawAction[]): DrawAction[] {
  return actions.map((action) => normalizeDrawAction(action));
}
