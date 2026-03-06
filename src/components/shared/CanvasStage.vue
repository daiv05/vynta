<script setup lang="ts">
import { nextTick, reactive, ref, toRef } from "vue";
import { useCanvasDrawing } from "../../composables/useCanvasDrawing";
import type { ToolId } from "../../types/tools";

const props = defineProps<{
  selectedTool: ToolId;
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
  gradientStops: Array<{ color: string; position: number }>;
  clearNonce: number;
  fillOpacity?: number;

  gridEnabled?: boolean;
  overlayMode?: boolean;
  whiteboardMode?: boolean;
  infiniteCanvas?: boolean;
}>();

const {
  canvasRef,
  containerRef,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleWheel,
  hitTestText,
  getTextAction,
  createTextAction,
  updateTextAction,
  removeAction,
  setActionHidden,
  undo,
  redo,
  clear,
  visualScale,
  visualOffset,
  zoomToPoint,
  setZoom,
  pan,
  downloadSnapshot,
} = useCanvasDrawing({
  tool: toRef(props, "selectedTool"),
  color: toRef(props, "strokeColor"),
  width: toRef(props, "strokeWidth"),
  smoothingEnabled: toRef(props, "smoothingEnabled"),
  gradientEnabled: toRef(props, "gradientEnabled"),
  gradientType: toRef(props, "gradientType"),
  gradientAngle: toRef(props, "gradientAngle"),
  gradientStops: toRef(props, "gradientStops"),
  autoEraseEnabled: toRef(props, "autoEraseEnabled"),
  autoEraseDelay: toRef(props, "autoEraseDelay"),
  clearNonce: toRef(props, "clearNonce"),
  fillOpacity: toRef(props, "fillOpacity", 0),
  infiniteCanvas: toRef(props, "infiniteCanvas"),
});

const textInput = reactive({
  visible: false,
  x: 0,
  y: 0,
  value: "",
  actionId: "",
});
const textAreaSize = reactive({ width: 160, height: 32 });
const textInputRef = ref<HTMLTextAreaElement | null>(null);
const textMirrorRef = ref<HTMLDivElement | null>(null);
const resizeFrame = ref<number | null>(null);

function getLocalPoint(event: PointerEvent) {
  const container = containerRef.value;
  if (!container) return { x: 0, y: 0 };
  const rect = container.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)),
    y: Math.max(0, Math.min(event.clientY - rect.top, rect.height)),
  };
}

async function handleStagePointerDown(event: PointerEvent) {
  if (props.selectedTool !== "text") {
    handlePointerDown(event);
    return;
  }

  event.preventDefault();
  const point = getLocalPoint(event);
  const hitId = hitTestText(point);
  if (hitId) {
    const existing = getTextAction(hitId);
    if (existing?.points[0]) {
      setActionHidden(hitId, true);
      textInput.visible = true;
      textInput.x = existing.points[0].x;
      textInput.y = existing.points[0].y;
      textInput.value = existing.text ?? "";
      textInput.actionId = hitId;
      await nextTick();
      scheduleTextResize();
      textInputRef.value?.focus();
      return;
    }
  }

  const newId = createTextAction({
    point,
    text: "",
    fontFamily: props.textFont,
    fontSize: props.textSize,
    color: props.strokeColor,
  });
  setActionHidden(newId, true);
  textInput.visible = true;
  textInput.x = point.x;
  textInput.y = point.y;
  textInput.value = "";
  textInput.actionId = newId;
  await nextTick();
  scheduleTextResize();
  textInputRef.value?.focus();
}

function handleStagePointerDownCapture(event: PointerEvent) {
  if (!textInput.visible) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest(".text-editor")) return;
  commitText();
}

function commitText() {
  if (!textInput.visible) return;
  const content = textInput.value.trim();
  if (content && textInput.actionId) {
    updateTextAction({
      id: textInput.actionId,
      text: content,
      fontFamily: props.textFont,
      fontSize: props.textSize,
      color: props.strokeColor,
      gradient: {
        enabled: props.gradientEnabled,
        type: props.gradientType,
        angle: props.gradientAngle,
        stops: props.gradientStops,
      },
    });
    setActionHidden(textInput.actionId, false);
  } else if (textInput.actionId) {
    removeAction(textInput.actionId);
  }
  textInput.visible = false;
  textInput.value = "";
  textInput.actionId = "";
  textAreaSize.width = 160;
  textAreaSize.height = Math.round(props.textSize * 1.4);
}

function cancelText() {
  if (textInput.actionId && !textInput.value.trim()) {
    removeAction(textInput.actionId);
  } else if (textInput.actionId) {
    setActionHidden(textInput.actionId, false);
  }
  textInput.visible = false;
  textInput.value = "";
  textInput.actionId = "";
  textAreaSize.width = 160;
  textAreaSize.height = Math.round(props.textSize * 1.4);
}

function handleTextKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    commitText();
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    cancelText();
    return;
  }
  if (event.key === "Enter") {
    scheduleTextResize();
  }
}

function handleTextInput() {
  if (!textInput.actionId) return;
  updateTextAction({
    id: textInput.actionId,
    text: textInput.value,
    fontFamily: props.textFont,
    fontSize: props.textSize,
    color: props.strokeColor,
    gradient: {
      enabled: props.gradientEnabled,
      type: props.gradientType,
      angle: props.gradientAngle,
      stops: props.gradientStops,
    },
  });
  scheduleTextResize();
}

function scheduleTextResize() {
  if (resizeFrame.value) {
    cancelAnimationFrame(resizeFrame.value);
  }
  resizeFrame.value = requestAnimationFrame(() => {
    resizeFrame.value = null;
    updateTextAreaSize();
  });
}

function updateTextAreaSize() {
  const textarea = textInputRef.value;
  const container = containerRef.value;
  const mirror = textMirrorRef.value;
  if (!textarea || !container || !mirror) return;
  const minWidth = 120;
  const minHeight = Math.round(props.textSize * 1.4);
  const containerRect = container.getBoundingClientRect();
  const maxWidth = Math.max(120, containerRect.width - textInput.x - 8);

  const canvas = canvasRef.value;
  const ctx = canvas?.getContext("2d");
  const fontFamily = props.textFont;
  const fontSize = props.textSize;
  if (ctx) {
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
  }

  const lines = textInput.value.length ? textInput.value.split(/\r?\n/) : [" "];
  const maxLineWidth = ctx
    ? Math.max(1, ...lines.map((line) => ctx.measureText(line || " ").width))
    : minWidth;

  const nextWidth = Math.min(
    maxWidth,
    Math.max(minWidth, Math.ceil(maxLineWidth) + 6),
  );
  mirror.style.width = `${nextWidth}px`;
  mirror.textContent = textInput.value.length ? textInput.value : " ";

  const nextHeight = Math.max(
    minHeight,
    Math.ceil(mirror.getBoundingClientRect().height),
  );

  textAreaSize.width = nextWidth;
  textAreaSize.height = nextHeight;
  textarea.scrollTop = 0;
}

defineExpose({
  canvasRef,
  containerRef,
  undo,
  redo,
  clear,
  visualScale,
  visualOffset,
  zoomToPoint,
  setZoom,
  pan,
  downloadSnapshot,
});
</script>

<template>
  <section
    class="stage"
    :class="{ overlay: props.overlayMode, whiteboard: props.whiteboardMode }"
  >
    <div
      ref="containerRef"
      class="canvas-surface"
      @pointerdown.capture="handleStagePointerDownCapture"
    >
      <div
        v-if="
          (!props.overlayMode || props.whiteboardMode) &&
          props.gridEnabled !== false
        "
        class="grid"
      />
      <canvas
        ref="canvasRef"
        class="draw-canvas"
        @pointerdown="handleStagePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointerleave="handlePointerUp"
        @pointercancel="handlePointerUp"
        @wheel="handleWheel"
      />
      <div
        v-if="textInput.visible"
        class="text-editor"
        :style="{
          left: `${textInput.x}px`,
          top: `${textInput.y}px`,
          width: `${textAreaSize.width}px`,
          height: `${textAreaSize.height}px`,
        }"
      >
        <div
          ref="textMirrorRef"
          class="text-mirror"
          :style="{
            fontFamily: props.textFont,
            fontSize: `${props.textSize}px`,
            lineHeight: `${Math.round(props.textSize * 1.35)}px`,
          }"
        ></div>
        <textarea
          ref="textInputRef"
          v-model="textInput.value"
          class="text-input"
          :style="{
            color: props.strokeColor,
            fontFamily: props.textFont,
            fontSize: `${props.textSize}px`,
            lineHeight: `${Math.round(props.textSize * 1.35)}px`,
          }"
          @keydown="handleTextKeydown"
          @input="handleTextInput"
          @paste="handleTextInput"
          @blur="commitText"
        ></textarea>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stage.overlay {
  gap: 0;
}

.stage-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.stage-header h2 {
  margin: 0;
  font-size: 18px;
}

.stage-header p {
  margin: 6px 0 0;
  color: #9aa3bb;
  font-size: 13px;
}

.pill {
  padding: 8px 14px;
  border-radius: 999px;
  background: #0f1a24;
  color: #bff2ff;
  border: 1px solid rgba(93, 210, 255, 0.35);
  font-size: 12px;
  font-weight: 600;
}

.canvas-surface {
  position: relative;
  flex: 1;
  min-height: 420px;
  border-radius: 24px;
  border: 1px dashed rgba(93, 210, 255, 0.3);
  background:
    radial-gradient(circle at top, rgba(93, 210, 255, 0.08), transparent),
    #0f1118;
  overflow: hidden;
}

.stage.overlay .canvas-surface {
  min-height: 100vh;
  border-radius: 0;
  border: none;
  background: transparent;
}

.stage.whiteboard {
  width: 100%;
  height: 100%;
}

.stage.whiteboard .canvas-surface {
  min-height: 100dvh;
  border-radius: 0;
  border: none;
  background: #0e0f13;
}

.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
}

.draw-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

.text-editor {
  position: absolute;
  z-index: 2;
}

.text-mirror {
  position: absolute;
  top: 0;
  left: 0;
  visibility: hidden;
  pointer-events: none;
  white-space: pre-wrap;
  word-break: normal;
  overflow-wrap: break-word;
}

.text-input {
  min-width: 120px;
  min-height: 28px;
  padding: 0;
  border-radius: 0;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: normal;
  overflow-wrap: break-word;
  caret-color: currentColor;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.45);
  width: 100%;
  height: 100%;
}

.hint {
  position: absolute;
  bottom: 24px;
  left: 24px;
  right: 24px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(25, 29, 43, 0.8);
  color: #c9d1e6;
  font-size: 13px;
}
</style>
