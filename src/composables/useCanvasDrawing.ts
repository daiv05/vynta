import type { Ref } from "vue";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { DrawAction, Point } from "../types/drawing";
import type { ToolId } from "../types/tools";
import { exportCanvasAsImage } from "../utils/canvas/exporter";
import {
  clamp,
  drawAction,
  drawSelection,
  getDrawBounds,
  translatePoints,
} from "../utils/canvas/renderer";

const drawableTools = new Set<ToolId>([
  "pen",
  "marker",
  "rect",
  "ellipse",
  "line",
  "arrow",
  "eraser",
]);

const movableTools = new Set<ToolId>([
  "pen",
  "marker",
  "rect",
  "ellipse",
  "line",
  "arrow",
  "text",
]);

const markerOpacity = 0.35;

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useCanvasDrawing(options: {
  tool: Ref<ToolId>;
  color: Ref<string>;
  width: Ref<number>;
  smoothingEnabled: Ref<boolean>;
  gradientEnabled: Ref<boolean>;
  gradientType: Ref<"linear" | "radial">;
  gradientAngle: Ref<number>;
  gradientStops: Ref<Array<{ color: string; position: number }>>;
  autoEraseEnabled: Ref<boolean>;
  autoEraseDelay: Ref<number>;
  clearNonce: Ref<number>;
  fillOpacity: Ref<number>;
  infiniteCanvas?: Ref<boolean>;
}) {
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const containerRef = ref<HTMLDivElement | null>(null);
  type HistoryEntry =
    | { type: "add"; actions: DrawAction[] }
    | { type: "remove"; actions: Array<{ action: DrawAction; index: number }> };

  const actions = ref<DrawAction[]>([]);
  const historyStack = ref<HistoryEntry[]>([]);
  const redoStack = ref<HistoryEntry[]>([]);
  const autoEraseTimers = new Map<string, number>();
  const autoEraseFadeMap = new Map<
    string,
    { start: number; duration: number }
  >();
  let autoEraseRaf: number | null = null;
  const activeAction = ref<DrawAction | null>(null);
  const isDrawing = ref(false);
  const scale = ref(1);
  const hiddenActionIds = ref<Set<string>>(new Set());
  const selectedActionId = ref<string | null>(null);
  const dragState = ref<{
    active: boolean;
    lastPoint: Point | null;
    isPan?: boolean;
  }>({
    active: false,
    lastPoint: null,
    isPan: false,
  });
  let resizeObserver: ResizeObserver | null = null;

  const visualScale = ref(1);
  const visualOffset = ref<Point>({ x: 0, y: 0 });

  function screenToWorld(clientX: number, clientY: number): Point {
    const canvas = canvasRef.value;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;

    return {
      x: (rawX - visualOffset.value.x) / visualScale.value,
      y: (rawY - visualOffset.value.y) / visualScale.value,
    };
  }

  function resizeCanvas() {
    const canvas = canvasRef.value;
    const container = containerRef.value;
    if (!canvas || !container) return;
    const { width, height } = container.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    scale.value = ratio;
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    redraw();
  }

  function getFadeMultiplier(id: string) {
    const fade = autoEraseFadeMap.get(id);
    if (!fade) return 1;
    const progress = clamp(
      (performance.now() - fade.start) / fade.duration,
      0,
      1,
    );
    return 1 - progress;
  }

  function stopFadeLoopIfIdle() {
    if (autoEraseFadeMap.size > 0) return;
    if (autoEraseRaf !== null) {
      cancelAnimationFrame(autoEraseRaf);
      autoEraseRaf = null;
    }
  }

  function tickFade() {
    autoEraseRaf = null;
    if (autoEraseFadeMap.size === 0) return;

    const now = performance.now();
    const toRemove: string[] = [];
    autoEraseFadeMap.forEach((fade, id) => {
      const progress = clamp((now - fade.start) / fade.duration, 0, 1);
      if (progress >= 1) {
        toRemove.push(id);
      }
    });

    toRemove.forEach((id) => {
      autoEraseFadeMap.delete(id);
      removeAction(id);
    });

    if (autoEraseFadeMap.size > 0) {
      autoEraseRaf = requestAnimationFrame(tickFade);
      redraw();
      return;
    }

    stopFadeLoopIfIdle();
  }

  function startFade(action: DrawAction) {
    autoEraseFadeMap.set(action.id, {
      start: performance.now(),
      duration: 700,
    });
    autoEraseRaf ??= requestAnimationFrame(tickFade);
  }

  function clearFade(id: string) {
    if (autoEraseFadeMap.delete(id)) {
      stopFadeLoopIfIdle();
    }
  }

  function redraw() {
    const canvas = canvasRef.value;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = scale.value || 1;

    if (options.infiniteCanvas?.value) {
      const s = visualScale.value * ratio;
      const ox = visualOffset.value.x * ratio;
      const oy = visualOffset.value.y * ratio;
      ctx.setTransform(s, 0, 0, s, ox, oy);
    } else {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    actions.value.forEach((action) => {
      if (action.tool === "text" && hiddenActionIds.value.has(action.id)) {
        return;
      }
      drawAction(ctx, action, getFadeMultiplier(action.id));
    });
    if (activeAction.value) {
      drawAction(ctx, activeAction.value);
    }

    if (selectedActionId.value) {
      const action = actions.value.find(
        (entry) => entry.id === selectedActionId.value,
      );
      if (action) {
        const bounds = getActionBounds(action);
        if (bounds) {
          drawSelection(ctx, bounds);
        }
      }
    }
  }

  function startAction(point: Point) {
    const tool = options.tool.value;
    const isDrawable = drawableTools.has(tool);
    if (!isDrawable) return;

    const gradient = options.gradientEnabled.value
      ? {
        enabled: true,
        type: options.gradientType.value,
        angle: options.gradientAngle.value,
        stops: options.gradientStops.value.map((stop) => ({ ...stop })),
      }
      : { enabled: false, type: "linear" as const, angle: 0, stops: [] };

    const action: DrawAction = {
      id: createId(),
      tool,
      color: options.color.value,
      width: options.width.value,
      opacity: tool === "marker" ? markerOpacity : 1,
      fillOpacity: options.fillOpacity.value,
      points: [point],
      gradient,
      smoothing: options.smoothingEnabled.value,
      composite: tool === "eraser" ? "destination-out" : "source-over",
    };

    activeAction.value = action;
    isDrawing.value = true;
  }

  function updateAction(point: Point) {
    if (!activeAction.value) return;

    if (
      activeAction.value.tool === "pen" ||
      activeAction.value.tool === "marker" ||
      activeAction.value.tool === "eraser" ||
      activeAction.value.tool === "arrow"
    ) {
      activeAction.value.points.push(point);
    } else if (activeAction.value.points.length === 1) {
      activeAction.value.points.push(point);
    } else {
      activeAction.value.points[1] = point;
    }
    redraw();
  }

  function shouldAutoErase(action: DrawAction) {
    if (!options.autoEraseEnabled.value) return false;
    return action.tool !== "eraser";
  }

  function clearAutoEraseTimer(id: string) {
    const timer = autoEraseTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      autoEraseTimers.delete(id);
    }
  }

  function scheduleAutoErase(action: DrawAction) {
    if (!shouldAutoErase(action)) return;
    clearAutoEraseTimer(action.id);
    clearFade(action.id);
    const delayMs = Math.max(1, options.autoEraseDelay.value) * 1000;
    const timer = window.setTimeout(() => {
      autoEraseTimers.delete(action.id);
      startFade(action);
    }, delayMs);
    autoEraseTimers.set(action.id, timer);
  }

  function endAction() {
    if (options.tool.value === "eraser") {
      activeAction.value = null;
      isDrawing.value = false;
      redraw();
      return;
    }
    if (activeAction.value) {
      const next = { ...activeAction.value };
      actions.value.push(next);
      historyStack.value.push({ type: "add", actions: [next] });
      redoStack.value = [];
      scheduleAutoErase(next);
    }
    activeAction.value = null;
    isDrawing.value = false;
    redraw();
  }

  function handleWheel(event: WheelEvent) {
    if (!options.infiniteCanvas?.value) return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const delta = -event.deltaY;
      zoomToPoint(delta, event.clientX, event.clientY);
    } else {
      pan(-event.deltaX, -event.deltaY);
    }
  }

  function handlePointerDown(event: PointerEvent) {
    const canvas = canvasRef.value;
    if (!canvas) return;

    if (event.buttons === 4) {
      canvas.setPointerCapture(event.pointerId);
      dragState.value = {
        active: true,
        lastPoint: { x: event.clientX, y: event.clientY },
        isPan: true,
      };
      return;
    }

    if (options.tool.value === "select") {
      const point = screenToWorld(event.clientX, event.clientY);
      canvas.setPointerCapture(event.pointerId);
      startSelection(point);
      return;
    }
    if (!drawableTools.has(options.tool.value)) return;

    canvas.setPointerCapture(event.pointerId);
    const point = screenToWorld(event.clientX, event.clientY);
    if (options.tool.value === "eraser") {
      isDrawing.value = true;
      eraseAtPoint(point);
      return;
    }
    startAction(point);
    redraw();
  }

  function handlePointerMove(event: PointerEvent) {
    const canvas = canvasRef.value;
    if (!canvas) return;

    if (dragState.value.active && dragState.value.isPan) {
      const current = { x: event.clientX, y: event.clientY };
      const last = dragState.value.lastPoint!;
      const deltaX = current.x - last.x;
      const deltaY = current.y - last.y;
      pan(deltaX, deltaY);
      dragState.value.lastPoint = current;
      return;
    }

    const point = screenToWorld(event.clientX, event.clientY);

    if (options.tool.value === "select") {
      updateSelection(point);
      return;
    }
    if (!isDrawing.value) return;
    if (options.tool.value === "eraser") {
      eraseAtPoint(point);
      return;
    }
    updateAction(point);
  }

  function handlePointerUp(event: PointerEvent) {
    const canvas = canvasRef.value;
    if (!canvas) return;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (dragState.value.isPan) {
      dragState.value = { active: false, lastPoint: null, isPan: false };
      return;
    }

    if (options.tool.value === "select") {
      endSelection();
      return;
    }
    endAction();
  }

  function clear() {
    actions.value = [];
    historyStack.value = [];
    redoStack.value = [];
    autoEraseTimers.forEach((timer) => clearTimeout(timer));
    autoEraseTimers.clear();
    autoEraseFadeMap.clear();
    stopFadeLoopIfIdle();
    activeAction.value = null;
    hiddenActionIds.value.clear();
    redraw();
  }

  function getActionBounds(action: DrawAction) {
    if (!movableTools.has(action.tool)) return null;
    const canvas = canvasRef.value;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return null;
    return getDrawBounds(ctx, action);
  }

  function hitTestText(point: Point) {
    const candidates = [...actions.value]
      .filter((action) => action.tool === "text")
      .reverse();
    for (const action of candidates) {
      if (action.points.length === 0) continue;
      const bounds = getActionBounds(action);
      if (!bounds) continue;
      const withinX = point.x >= bounds.x && point.x <= bounds.x + bounds.width;
      const withinY =
        point.y >= bounds.y && point.y <= bounds.y + bounds.height;
      if (withinX && withinY) {
        return action.id;
      }
    }
    return null;
  }

  function getTextAction(id: string) {
    const action = actions.value.find((entry) => entry.id === id);
    if (action?.tool !== "text") return null;
    return { ...action };
  }

  function createTextAction(payload: {
    point: Point;
    text: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    gradient?: DrawAction["gradient"];
  }) {
    const action: DrawAction = {
      id: createId(),
      tool: "text",
      color: payload.color,
      width: payload.fontSize,
      opacity: 1,
      points: [payload.point],
      text: payload.text,
      fontSize: payload.fontSize,
      fontFamily: payload.fontFamily,
      gradient: payload.gradient,
    };
    actions.value.push(action);
    historyStack.value.push({ type: "add", actions: [action] });
    redoStack.value = [];
    scheduleAutoErase(action);
    redraw();
    return action.id;
  }

  function updateTextAction(payload: {
    id: string;
    text: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    gradient?: DrawAction["gradient"];
  }) {
    const action = actions.value.find((entry) => entry.id === payload.id);
    if (action?.tool !== "text") return;
    action.text = payload.text;
    action.fontFamily = payload.fontFamily;
    action.fontSize = payload.fontSize;
    action.color = payload.color;
    if (payload.gradient) {
      action.gradient = {
        ...payload.gradient,
        stops: payload.gradient.stops.map((stop) => ({ ...stop })),
      };
    }
    scheduleAutoErase(action);
    redraw();
  }

  function removeAction(id: string) {
    const index = actions.value.findIndex((entry) => entry.id === id);
    if (index >= 0) {
      const [removed] = actions.value.splice(index, 1);
      if (removed) {
        clearAutoEraseTimer(removed.id);
        clearFade(removed.id);
        historyStack.value.push({
          type: "remove",
          actions: [{ action: removed, index }],
        });
        redoStack.value = [];
      }
      hiddenActionIds.value.delete(id);
      redraw();
    }
  }

  function eraseAtPoint(point: Point) {
    const radius = Math.max(8, options.width.value);
    const radiusSq = radius * radius;
    const removals: Array<{ action: DrawAction; index: number }> = [];

    actions.value.forEach((action, index) => {
      if (hiddenActionIds.value.has(action.id)) return;
      const bounds = getActionBounds(action);
      if (!bounds) return;
      const closestX = Math.max(
        bounds.x,
        Math.min(point.x, bounds.x + bounds.width),
      );
      const closestY = Math.max(
        bounds.y,
        Math.min(point.y, bounds.y + bounds.height),
      );
      const dx = point.x - closestX;
      const dy = point.y - closestY;
      if (dx * dx + dy * dy <= radiusSq) {
        removals.push({ action, index });
      }
    });

    if (!removals.length) return;
    const ids = new Set(removals.map((item) => item.action.id));
    removals.forEach((item) => clearAutoEraseTimer(item.action.id));
    removals.forEach((item) => clearFade(item.action.id));
    actions.value = actions.value.filter((action) => !ids.has(action.id));
    removals.forEach((item) => hiddenActionIds.value.delete(item.action.id));
    historyStack.value.push({ type: "remove", actions: removals });
    redoStack.value = [];
    redraw();
  }

  function setActionHidden(id: string, hidden: boolean) {
    if (hidden) {
      hiddenActionIds.value.add(id);
    } else {
      hiddenActionIds.value.delete(id);
    }
    redraw();
  }

  function hitTestAction(point: Point) {
    const candidates = [...actions.value]
      .filter((action) => movableTools.has(action.tool))
      .reverse();
    for (const action of candidates) {
      const bounds = getActionBounds(action);
      if (!bounds) continue;
      const withinX =
        point.x >= bounds.x - 6 && point.x <= bounds.x + bounds.width + 6;
      const withinY =
        point.y >= bounds.y - 6 && point.y <= bounds.y + bounds.height + 6;
      if (withinX && withinY) return action.id;
    }
    return null;
  }

  function startSelection(point: Point) {
    const hitId = hitTestAction(point);
    selectedActionId.value = hitId;
    if (hitId) {
      dragState.value = { active: true, lastPoint: point };
    } else {
      dragState.value = { active: false, lastPoint: null };
    }
    redraw();
  }

  function updateSelection(point: Point) {
    if (!dragState.value.active || !selectedActionId.value) return;
    const action = actions.value.find(
      (entry) => entry.id === selectedActionId.value,
    );
    if (!action) return;
    const lastPoint = dragState.value.lastPoint;
    if (!lastPoint) return;
    const deltaX = point.x - lastPoint.x;
    const deltaY = point.y - lastPoint.y;
    action.points = translatePoints(action.points, deltaX, deltaY);
    dragState.value.lastPoint = point;
    redraw();
  }

  function endSelection() {
    dragState.value = { active: false, lastPoint: null };
  }

  function undo() {
    const last = historyStack.value.pop();
    if (!last) return;
    if (last.type === "add") {
      const ids = new Set(last.actions.map((action) => action.id));
      last.actions.forEach((action) => clearAutoEraseTimer(action.id));
      last.actions.forEach((action) => clearFade(action.id));
      actions.value = actions.value.filter((action) => !ids.has(action.id));
    } else {
      const sorted = [...last.actions].sort((a, b) => a.index - b.index);
      sorted.forEach((entry) => {
        actions.value.splice(entry.index, 0, entry.action);
        scheduleAutoErase(entry.action);
      });
    }
    redoStack.value.push(last);
    redraw();
  }

  function redo() {
    const last = redoStack.value.pop();
    if (!last) return;
    if (last.type === "add") {
      actions.value.push(...last.actions);
      last.actions.forEach((action) => scheduleAutoErase(action));
    } else {
      const ids = new Set(last.actions.map((entry) => entry.action.id));
      last.actions.forEach((entry) => clearAutoEraseTimer(entry.action.id));
      last.actions.forEach((entry) => clearFade(entry.action.id));
      actions.value = actions.value.filter((action) => !ids.has(action.id));
    }
    historyStack.value.push(last);
    redraw();
  }

  function zoomToPoint(delta: number, clientX?: number, clientY?: number) {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const scaleAmount = 1.1;
    const newScale =
      delta > 0
        ? visualScale.value * scaleAmount
        : visualScale.value / scaleAmount;

    const minScale = 0.5;
    const maxScale = 5.0;
    const clampedScale = clamp(newScale, minScale, maxScale);

    if (clampedScale === visualScale.value) return;

    let centerX: number;
    let centerY: number;

    if (clientX !== undefined && clientY !== undefined) {
      const rect = canvas.getBoundingClientRect();
      centerX = clientX - rect.left;
      centerY = clientY - rect.top;
    } else {
      centerX = canvas.width / (2 * (scale.value || 1));
      centerY = canvas.height / (2 * (scale.value || 1));
    }

    const worldX = (centerX - visualOffset.value.x) / visualScale.value;
    const worldY = (centerY - visualOffset.value.y) / visualScale.value;

    visualScale.value = clampedScale;

    visualOffset.value = {
      x: centerX - worldX * clampedScale,
      y: centerY - worldY * clampedScale,
    };

    redraw();
  }

  function setZoom(value: number) {
    const targetScale = value / 100;
    const canvas = canvasRef.value;
    if (!canvas) {
      visualScale.value = targetScale;
      return;
    }
    const centerX = canvas.width / (2 * (scale.value || 1));
    const centerY = canvas.height / (2 * (scale.value || 1));
    const worldX = (centerX - visualOffset.value.x) / visualScale.value;
    const worldY = (centerY - visualOffset.value.y) / visualScale.value;

    visualScale.value = targetScale;
    visualOffset.value = {
      x: centerX - worldX * targetScale,
      y: centerY - worldY * targetScale,
    };
    redraw();
  }

  function pan(deltaX: number, deltaY: number) {
    visualOffset.value = {
      x: visualOffset.value.x + deltaX,
      y: visualOffset.value.y + deltaY,
    };
    redraw();
  }

  onMounted(() => {
    resizeCanvas();
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (containerRef.value) {
      resizeObserver.observe(containerRef.value);
    }
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    if (autoEraseRaf !== null) {
      cancelAnimationFrame(autoEraseRaf);
      autoEraseRaf = null;
    }
  });

  watch(options.clearNonce, () => {
    clear();
  });

  watch(options.tool, (tool) => {
    if (tool !== "select") {
      selectedActionId.value = null;
      dragState.value = { active: false, lastPoint: null };
    }
  });

  return {
    canvasRef,
    containerRef,
    visualScale,
    visualOffset,
    actions,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    clear,
    downloadSnapshot: (
      expOptions?: Parameters<typeof exportCanvasAsImage>[1],
    ) => exportCanvasAsImage(actions.value, expOptions),
    hitTestText,
    getTextAction,
    createTextAction,
    updateTextAction,
    removeAction,
    setActionHidden,
    undo,
    redo,
    redraw,
    zoomToPoint,
    setZoom,
    pan,
    screenToWorld,
  };
}
