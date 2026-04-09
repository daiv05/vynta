# Keyboard Shortcuts

Vynta is designed to be fully operable via keyboard. All modes and major actions have configurable shortcuts.

## Global Shortcuts

These shortcuts work from **anywhere** in Windows — even when Vynta is not focused:

| Shortcut | Action |
|---|---|
| `Ctrl + 1` | Toggle Live Draw overlay |
| `Ctrl + 2` | Toggle Cursor Highlight |
| `Ctrl + 3` | Toggle Spotlight |
| `Ctrl + 4` | Toggle Whiteboard |
| `Ctrl + 5` | Toggle Dynamic Zoom |

### Enabling / Disabling Modes

Each global shortcut can be individually **enabled or disabled** in the Hotkeys panel. When a mode shortcut is disabled, the keyboard shortcut is unregistered from the OS.

## Overlay Drawing Shortcuts

These shortcuts are active **while the Live Draw overlay is visible**:

| Shortcut | Action |
|---|---|
| `V` | Select / Move tool |
| `P` | Pen tool |
| `M` | Marker tool |
| `R` | Rectangle tool |
| `O` | Ellipse tool |
| `A` | Arrow tool |
| `T` | Text tool |
| `E` | Eraser tool |
| `H` | Show / Hide dock toolbar |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Ctrl + Shift + E` | Toggle auto-erase |
| `Ctrl + M` | Toggle stroke smoothing |
| `Escape` | Clear all annotations |

## Selection & Editing Shortcuts

These shortcuts are active when the **Select** tool is used in Live Draw or Whiteboard:

| Shortcut | Action |
|---|---|
| `Ctrl + C` | Copy current selection |
| `Ctrl + V` | Paste copied selection |
| `Ctrl + D` | Duplicate current selection |
| `Ctrl + L` | Lock / Unlock current selection |
| `Ctrl + G` | Group current selection |
| `Ctrl + Shift + G` | Ungroup current selection |

### Selection Behavior

- Use **Ctrl / Cmd / Shift + click** with the Select tool to add/remove items from the current selection.
- Clicking a grouped item selects the **entire group** as a single unit.
- Moving a grouped item moves the entire group.
- **Lock / Unlock** applies to the selected unit, including all members of a selected group.
- Grouping an item that already belongs to a group with external items will merge them into one group.
- Locked items cannot be moved or erased until unlocked.

## Customizing Shortcuts

All global shortcuts can be customized from the **Hotkeys** panel in settings:

1. Open Vynta settings
2. Navigate to the **Hotkeys** tab
3. Click on any shortcut's key binding
4. Press the new key combination
5. The shortcut updates immediately

### Rules for Custom Shortcuts

- Shortcuts must include at least one **modifier key** (`Ctrl`, `Alt`, `Shift`)
- Shortcuts cannot conflict with other registered global shortcuts
- Changes are saved automatically and persist across restarts

## Tips

- If a shortcut conflicts with another application, customize it from the Hotkeys panel
- You can disable individual mode shortcuts if you only use a subset of features
- Overlay tool shortcuts (P, M, R, etc.) are **single-key** for speed — no modifier needed
