import type { DrawAction } from "../../types/drawing";
import { drawAction, getDrawBounds } from "./renderer";

export interface ExportOptions {
  padding?: number;
  format?: "image/png" | "image/jpeg" | "image/webp";
  quality?: number;
  fileName?: string;
  backgroundColor?: string;
}

export async function exportCanvasAsImage(
  actions: DrawAction[],
  options: ExportOptions = {},
) {
  if (actions.length === 0) return;

  const padding = options.padding ?? 40;
  const format = options.format ?? "image/png";
  const quality = options.quality ?? 1.0;
  const fileName = options.fileName ?? `whiteboard-export-${Date.now()}.png`;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  actions.forEach((action) => {
    const bounds = getDrawBounds(ctx, action);
    if (!bounds) return;
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  if (
    !isFinite(minX) ||
    !isFinite(minY) ||
    !isFinite(maxX) ||
    !isFinite(maxY)
  ) {
    return;
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  canvas.width = width;
  canvas.height = height;

  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  ctx.translate(offsetX, offsetY);

  actions.forEach((action) => {
    drawAction(ctx, action);
  });

  const dataUrl = canvas.toDataURL(format, quality);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  canvas.remove();
}
