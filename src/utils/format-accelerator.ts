const displayTokenMap: Record<string, string> = {
  commandorcontrol: "Ctrl",
  ctrl: "Ctrl",
  control: "Ctrl",
  shift: "Shift",
  alt: "Alt",
  option: "Alt",
  super: "Win",
  meta: "Win",
  win: "Win",
  windows: "Win",
};

/**
 * Formats a shortcut accelerator string into a human-readable label.
 *
 * @param {string} accelerator Accelerator string (e.g. "Ctrl+1").
 * @returns {string} Display label (e.g. "Ctrl + 1"), or "Sin asignar" when empty.
 */
export function formatAccelerator(accelerator: string): string {
  if (!accelerator) return "Sin asignar";
  return accelerator
    .split("+")
    .map((token) => {
      const key = token.trim().toLowerCase();
      return displayTokenMap[key] ?? token;
    })
    .join(" + ");
}
