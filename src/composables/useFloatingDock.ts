import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { Ref } from "vue";
import type { OverlayDockOrientation } from "../types/ui";

type Position = { x: number; y: number };

type UseFloatingDockOptions = {
  dockRef: Ref<HTMLDivElement | null>;
  orientation: Ref<OverlayDockOrientation>;
  sourcePosition: Ref<Position>;
  persistPosition: (position: Position) => void;
  persistScreenSize?: (size: { width: number; height: number }) => void;
  verticalX?: number;
  bottomOffset?: number;
};

export function useFloatingDock(options: UseFloatingDockOptions) {
  const dockPosition = ref<Position>({ ...options.sourcePosition.value });
  const dragging = ref(false);
  const dragOffset = ref({ x: 0, y: 0 });

  const verticalX = options.verticalX ?? 24;
  const bottomOffset = options.bottomOffset ?? 24;

  const dockTooltipPlacement = computed<"top" | "bottom" | "left" | "right">(() => {
    const viewportWidth = globalThis.innerWidth || 1920;
    const viewportHeight = globalThis.innerHeight || 1080;
    const dockWidth = options.dockRef.value?.offsetWidth ?? 320;
    const dockHeight = options.dockRef.value?.offsetHeight ?? 120;

    const spaceTop = dockPosition.value.y;
    const spaceBottom = viewportHeight - (dockPosition.value.y + dockHeight);
    const spaceLeft = dockPosition.value.x;
    const spaceRight = viewportWidth - (dockPosition.value.x + dockWidth);

    if (options.orientation.value === "vertical") {
      if (spaceRight < 160 && spaceLeft > spaceRight) return "left";
      return "right";
    }

    if (spaceTop < 80 && spaceBottom > spaceTop) return "bottom";
    if (spaceLeft < 96 && spaceRight > 160) return "right";
    if (spaceRight < 96 && spaceLeft > 160) return "left";
    return "top";
  });

  function applyPositionForOrientation() {
    nextTick(() => {
      const dock = options.dockRef.value;
      if (!dock) return;

      const dockWidth = dock.offsetWidth || 320;
      const dockHeight = dock.offsetHeight || 520;
      const screenWidth = globalThis.innerWidth;
      const screenHeight = globalThis.innerHeight;

      if (options.orientation.value === "horizontal") {
        dockPosition.value = {
          x: Math.max(0, (screenWidth - dockWidth) / 2),
          y: Math.max(0, screenHeight - dockHeight - bottomOffset),
        };
      } else {
        dockPosition.value = {
          x: verticalX,
          y: Math.max(0, (screenHeight - dockHeight) / 2),
        };
      }

      options.persistPosition(dockPosition.value);
    });
  }

  function handleDockDrag(event: PointerEvent) {
    if (!dragging.value) return;
    const dock = options.dockRef.value;
    const width = dock?.offsetWidth ?? 320;
    const height = dock?.offsetHeight ?? 520;
    const nextX = event.clientX - dragOffset.value.x;
    const nextY = event.clientY - dragOffset.value.y;
    const maxX = Math.max(0, globalThis.innerWidth - width - 12);
    const maxY = Math.max(0, globalThis.innerHeight - height - 12);
    dockPosition.value = {
      x: Math.min(Math.max(0, nextX), maxX),
      y: Math.min(Math.max(0, nextY), maxY),
    };
  }

  function stopDockDrag() {
    if (!dragging.value) return;
    dragging.value = false;
    options.persistPosition(dockPosition.value);
    options.persistScreenSize?.({
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
    });
    globalThis.removeEventListener("pointermove", handleDockDrag);
    globalThis.removeEventListener("pointerup", stopDockDrag);
  }

  function startDockDrag(event: PointerEvent) {
    if (event.button !== 0) return;
    const dock = options.dockRef.value;
    if (!dock) return;
    dragging.value = true;
    dragOffset.value = {
      x: event.clientX - dockPosition.value.x,
      y: event.clientY - dockPosition.value.y,
    };
    globalThis.addEventListener("pointermove", handleDockDrag);
    globalThis.addEventListener("pointerup", stopDockDrag);
  }

  watch(options.orientation, () => applyPositionForOrientation());

  watch(options.sourcePosition, (value) => {
    if (!dragging.value) {
      dockPosition.value = { ...value };
    }
  });

  onBeforeUnmount(() => {
    globalThis.removeEventListener("pointermove", handleDockDrag);
    globalThis.removeEventListener("pointerup", stopDockDrag);
  });

  return {
    dockPosition,
    dockTooltipPlacement,
    dragging,
    startDockDrag,
    stopDockDrag,
    applyPositionForOrientation,
  };
}
