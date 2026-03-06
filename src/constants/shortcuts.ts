export type { ShortcutDefinition } from "./shortcut-types";
export { GLOBAL_SHORTCUTS } from "./shortcuts-global";
export { LOCAL_SHORTCUTS } from "./shortcuts-local";

import { GLOBAL_SHORTCUTS } from "./shortcuts-global";
import { LOCAL_SHORTCUTS } from "./shortcuts-local";

export const ALL_SHORTCUTS = [...GLOBAL_SHORTCUTS, ...LOCAL_SHORTCUTS];
