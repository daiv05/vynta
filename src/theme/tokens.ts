/**
 * Single source of truth for theme color values consumed by JavaScript state.
 *
 * These values MUST stay in sync with the CSS custom properties defined in the
 * `:root` block of `src/App.vue` (`--color-stroke-default` and `--color-accent`).
 */

export const STROKE_DEFAULT = "#6fb8d6";

export const GRADIENT_DEFAULT_STOPS = [
  { color: "#6fb8d6", position: 0 },
  { color: "#4f7cff", position: 0.5 },
  { color: "#6a5bff", position: 1 },
] as const;
