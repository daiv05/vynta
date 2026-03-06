import type { Bounds, DrawAction, Point } from "../../types/drawing";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function drawFreehand(
  ctx: CanvasRenderingContext2D,
  action: DrawAction,
  smoothing: boolean,
) {
  const pts = action.points;
  if (!pts || pts.length === 0) return;

  function smoothPoints(points: Point[], windowSize = 3) {
    if (windowSize <= 0 || points.length <= 2) return points;
    const out: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      const start = Math.max(0, i - windowSize);
      const end = Math.min(points.length - 1, i + windowSize);
      for (let j = start; j <= end; j++) {
        sumX += points[j].x;
        sumY += points[j].y;
        count += 1;
      }
      out.push({ x: sumX / count, y: sumY / count });
    }
    return out;
  }

  const drawPts = !smoothing || pts.length < 3 ? pts : smoothPoints(pts, 3);

  const [first, ...rest] = drawPts;
  if (!first) return;

  if (drawPts.length < 3 || !smoothing) {
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    rest.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let index = 1; index < drawPts.length - 1; index += 1) {
    const current = drawPts[index];
    const next = drawPts[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }
  const last = drawPts[drawPts.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function drawRectangle(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  fillOpacity = 0,
) {
  const width = end.x - start.x;
  const height = end.y - start.y;
  if (fillOpacity > 0) {
    ctx.save();
    ctx.globalAlpha *= fillOpacity;
    ctx.fillRect(start.x, start.y, width, height);
    ctx.restore();
  }
  ctx.strokeRect(start.x, start.y, width, height);
}

function drawEllipse(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  fillOpacity = 0,
) {
  const radiusX = Math.abs(end.x - start.x) / 2;
  const radiusY = Math.abs(end.y - start.y) / 2;
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  if (fillOpacity > 0) {
    ctx.save();
    ctx.globalAlpha *= fillOpacity;
    ctx.fill();
    ctx.restore();
  }
  ctx.stroke();
}

function drawLine(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

function computeSmoothedAngle(points: Point[], windowSize = 4) {
  if (!points || points.length < 2) return 0;
  const maxSegments = Math.max(1, Math.min(windowSize, points.length - 1));
  let dx = 0;
  let dy = 0;
  let count = 0;
  for (let i = points.length - maxSegments; i < points.length; i++) {
    if (i <= 0) continue;
    const a = points[i - 1];
    const b = points[i];
    dx += b.x - a.x;
    dy += b.y - a.y;
    count += 1;
  }
  if (count === 0) {
    const a = points[points.length - 2];
    const b = points[points.length - 1];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
  dx /= count;
  dy /= count;
  return Math.atan2(dy, dx);
}

function drawArrow(ctx: CanvasRenderingContext2D, action: DrawAction) {
  const points = action.points;
  if (!points || points.length < 2) return;
  const headLength = Math.max(12, (action.width ?? 1) * 3);

  const angleWindow = action.smoothing ? 6 : 2;
  const angle = computeSmoothedAngle(points, angleWindow);

  if (points.length === 2) {
    const start = points[0];
    const end = points[1];
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const p1x = end.x - headLength * Math.cos(angle - Math.PI / 6);
    const p1y = end.y - headLength * Math.sin(angle - Math.PI / 6);
    const p2x = end.x - headLength * Math.cos(angle + Math.PI / 6);
    const p2y = end.y - headLength * Math.sin(angle + Math.PI / 6);

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(p1x, p1y);
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();
    return;
  }

  drawFreehand(ctx, action, action.smoothing ?? false);
  const last = points[points.length - 1];
  const p1x = last.x - headLength * Math.cos(angle - Math.PI / 6);
  const p1y = last.y - headLength * Math.sin(angle - Math.PI / 6);
  const p2x = last.x - headLength * Math.cos(angle + Math.PI / 6);
  const p2y = last.y - headLength * Math.sin(angle + Math.PI / 6);

  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(p1x, p1y);
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(p2x, p2y);
  ctx.stroke();
}

function applyStyle(ctx: CanvasRenderingContext2D, action: DrawAction) {
  ctx.globalCompositeOperation = action.composite ?? "source-over";
  ctx.strokeStyle = action.color;
  ctx.lineWidth = action.width;
  ctx.globalAlpha = action.opacity;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = action.color;
}

function createGradient(
  ctx: CanvasRenderingContext2D,
  action: DrawAction,
  bounds: Bounds | null,
) {
  if (!action.gradient?.enabled || action.tool === "eraser") return null;
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
  const { x, y, width, height } = bounds;

  if (action.gradient.type === "radial") {
    const radius = Math.max(width, height) / 2;
    const gradient = ctx.createRadialGradient(
      x + width / 2,
      y + height / 2,
      0,
      x + width / 2,
      y + height / 2,
      radius,
    );
    action.gradient.stops.forEach((stop) => {
      gradient.addColorStop(stop.position, stop.color);
    });
    return gradient;
  }

  const angle = (action.gradient.angle * Math.PI) / 180;
  const length = Math.max(width, height);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const dx = Math.cos(angle) * length;
  const dy = Math.sin(angle) * length;
  const gradient = ctx.createLinearGradient(
    cx - dx / 2,
    cy - dy / 2,
    cx + dx / 2,
    cy + dy / 2,
  );
  action.gradient.stops.forEach((stop) => {
    gradient.addColorStop(stop.position, stop.color);
  });
  return gradient;
}

function splitLongWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
) {
  const chunks: string[] = [];
  let buffer = "";
  for (const char of word) {
    const next = buffer + char;
    if (ctx.measureText(next).width > maxWidth && buffer) {
      chunks.push(buffer);
      buffer = char;
    } else {
      buffer = next;
    }
  }
  if (buffer) {
    chunks.push(buffer);
  }
  return chunks;
}

function pushWrappedWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
  lines: string[],
) {
  if (ctx.measureText(word).width <= maxWidth) {
    lines.push(word);
    return;
  }
  const chunks = splitLongWord(ctx, word, maxWidth);
  lines.push(...chunks);
}

function wrapLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
) {
  if (maxWidth <= 0) return [line];
  const words = line.split(" ");
  const result: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      result.push(current);
      current = "";
    }

    pushWrappedWord(ctx, word, maxWidth, result);
  }

  if (current) {
    result.push(current);
  }

  return result;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = [];
  text.split(/\r?\n/).forEach((paragraph) => {
    const wrapped = wrapLine(ctx, paragraph, maxWidth);
    if (wrapped.length === 0) {
      lines.push("");
      return;
    }
    lines.push(...wrapped);
  });
  return lines;
}

export function drawAction(
  ctx: CanvasRenderingContext2D,
  action: DrawAction,
  opacityMultiplier = 1,
) {
  ctx.save();
  const adjustedAction =
    opacityMultiplier === 1
      ? action
      : { ...action, opacity: action.opacity * opacityMultiplier };
  applyStyle(ctx, adjustedAction);
  const bounds = getDrawBounds(ctx, adjustedAction);
  const gradient = createGradient(ctx, adjustedAction, bounds);
  if (gradient) {
    ctx.strokeStyle = gradient;
    ctx.fillStyle = gradient;
  }

  if (
    adjustedAction.tool === "pen" ||
    adjustedAction.tool === "marker" ||
    adjustedAction.tool === "eraser"
  ) {
    drawFreehand(ctx, adjustedAction, adjustedAction.smoothing ?? false);
    ctx.restore();
    return;
  }

  if (adjustedAction.tool === "text") {
    const point = adjustedAction.points[0];
    if (point && adjustedAction.text) {
      const size = adjustedAction.fontSize ?? 16;
      const family =
        adjustedAction.fontFamily ?? '"Segoe UI", system-ui, sans-serif';
      const lineHeight = size * 1.35;
      ctx.font = `600 ${size}px ${family}`;
      ctx.textBaseline = "top";
      const ratio = ctx.getTransform().a || 1;
      const maxWidth = ctx.canvas.width / ratio - point.x - 8;
      const lines = wrapText(ctx, adjustedAction.text, maxWidth);
      lines.forEach((line, index) => {
        ctx.fillText(line, point.x, point.y + index * lineHeight);
      });
    }
    ctx.restore();
    return;
  }

  const [start, end] = adjustedAction.points;
  if (!start || !end) return;

  if (adjustedAction.tool === "rect") {
    drawRectangle(ctx, start, end, adjustedAction.fillOpacity);
    ctx.restore();
    return;
  }

  if (adjustedAction.tool === "ellipse") {
    drawEllipse(ctx, start, end, adjustedAction.fillOpacity);
    ctx.restore();
    return;
  }

  if (adjustedAction.tool === "line") {
    drawLine(ctx, start, end);
    ctx.restore();
    return;
  }

  if (adjustedAction.tool === "arrow") {
    drawArrow(ctx, adjustedAction);
  }

  ctx.restore();
}

export function translatePoints(
  points: Point[],
  deltaX: number,
  deltaY: number,
) {
  return points.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY }));
}

export function getPointsBounds(points: Point[]) {
  if (points.length === 0) return null;
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  } satisfies Bounds;
}

export function getDrawBounds(
  ctx: CanvasRenderingContext2D,
  action: DrawAction,
) {
  if (action.tool === "text") {
    const point = action.points[0];
    if (!point || !action.text) return null;
    const size = action.fontSize ?? 16;
    const family = action.fontFamily ?? '"Segoe UI", system-ui, sans-serif';
    const lineHeight = size * 1.35;
    ctx.save();
    ctx.font = `600 ${size}px ${family}`;
    const lines = action.text.split(/\r?\n/);
    const width = Math.max(
      1,
      ...lines.map((line) => ctx.measureText(line).width),
    );
    ctx.restore();
    return {
      x: point.x,
      y: point.y,
      width,
      height: lines.length * lineHeight,
    } satisfies Bounds;
  }

  if (
    action.tool === "rect" ||
    action.tool === "ellipse" ||
    action.tool === "line" ||
    action.tool === "arrow"
  ) {
    if (action.tool === "arrow" && action.points.length > 2) {
      return getPointsBounds(action.points);
    }
    const [start, end] = action.points;
    if (!start || !end) return null;
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    return { x, y, width, height } satisfies Bounds;
  }

  return getPointsBounds(action.points);
}

export function drawSelection(ctx: CanvasRenderingContext2D, bounds: Bounds) {
  ctx.save();
  ctx.strokeStyle = "rgba(127, 217, 255, 0.9)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(
    bounds.x - 4,
    bounds.y - 4,
    bounds.width + 8,
    bounds.height + 8,
  );
  ctx.setLineDash([]);

  const handleSize = 6;
  const handlePoints = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width / 2, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height / 2 },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
  ];
  ctx.fillStyle = "#7fd9ff";
  handlePoints.forEach((point) => {
    ctx.fillRect(
      point.x - handleSize / 2,
      point.y - handleSize / 2,
      handleSize,
      handleSize,
    );
  });
  ctx.restore();
}
