import { load } from "@tauri-apps/plugin-store";
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type { QuickColorSlot } from "../types/ui";

export const useToolsStore = defineStore("tools", () => {
  const quickColorSlots = ref<QuickColorSlot[]>([
    {
      id: "slot-1",
      type: "gradient",
      gradient: {
        type: "linear",
        angle: 45,
        stops: [
          { color: "#5dd2ff", position: 0 },
          { color: "#4f7cff", position: 0.5 },
          { color: "#6a5bff", position: 1 },
        ],
      },
    },
    { id: "slot-2", type: "color", color: "#4f7cff" },
    { id: "slot-3", type: "color", color: "#7c4dff" },
    { id: "slot-4", type: "color", color: "#ffb347" },
    { id: "slot-5", type: "color", color: "#ff5f7a" },
    { id: "slot-6", type: "color", color: "#6ee7b7" },
  ]);

  function setQuickColorSlots(slots: QuickColorSlot[]) {
    quickColorSlots.value = slots.map((slot) => ({
      ...slot,
      gradient: slot.gradient
        ? {
          ...slot.gradient,
          stops: slot.gradient.stops.map((stop) => ({ ...stop })),
        }
        : undefined,
    }));
  }

  function setQuickColorSlot(index: number, slot: QuickColorSlot) {
    const newSlot = {
      ...slot,
      gradient: slot.gradient
        ? {
          ...slot.gradient,
          stops: slot.gradient.stops.map((stop) => ({ ...stop })),
        }
        : undefined,
    };

    const next = [...quickColorSlots.value];
    next[index] = newSlot;
    quickColorSlots.value = next;
  }

  const ready = ref(false);
  const isHydrating = ref(false);
  let storeRef: Awaited<ReturnType<typeof load>> | null = null;
  let persistTimer: number | null = null;

  function snapshotTools() {
    return {
      quickColorSlots: quickColorSlots.value,
    };
  }

  function applyTools(stored: any) {
    if (stored.quickColorSlots) {
      setQuickColorSlots(stored.quickColorSlots);
    }
  }

  async function persist() {
    const store = storeRef;
    if (!store) return;
    await store.set("app-tools", snapshotTools());
    await store.save();
  }

  function schedulePersist() {
    if (isHydrating.value) return;
    if (persistTimer) {
      window.clearTimeout(persistTimer);
    }
    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      persist();
    }, 500);
  }

  async function hydrate() {
    if (ready.value) return;
    isHydrating.value = true;
    try {
      storeRef = await load("tools.json", { autoSave: false, defaults: {} });
      const stored = await storeRef.get<any>("app-tools");
      if (stored) {
        applyTools(stored);
      } else {
        await persist();
      }
    } catch (err) {
      console.error("Failed to hydrate tools:", err);
    } finally {
      isHydrating.value = false;
      ready.value = true;
    }
  }

  watch(
    () => snapshotTools(),
    () => schedulePersist(),
    { deep: true },
  );

  return {
    ready,
    hydrate,
    quickColorSlots,
    setQuickColorSlot,
    setQuickColorSlots,
  };
});
