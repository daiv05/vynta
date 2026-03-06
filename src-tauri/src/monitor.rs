use crate::types::{MonitorContext, WindowRegistry};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::OnceLock;
use tauri::AppHandle;

static WINDOW_REGISTRY: OnceLock<WindowRegistry> = OnceLock::new();

pub fn window_registry() -> &'static WindowRegistry {
    WINDOW_REGISTRY.get_or_init(WindowRegistry::new)
}

pub fn generate_monitor_id(name: &str, x: i32, y: i32, width: u32, height: u32) -> String {
    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    x.hash(&mut hasher);
    y.hash(&mut hasher);
    width.hash(&mut hasher);
    height.hash(&mut hasher);

    format!("mon_{:x}", hasher.finish())
}

pub fn detect_monitors(app: &AppHandle) -> Result<Vec<MonitorContext>, String> {
    let monitors = app
        .available_monitors()
        .map_err(|e| format!("Error detecting monitors: {}", e))?;

    let mut contexts = Vec::new();
    for monitor in monitors {
        let name = monitor
            .name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "Unknown".to_string());
        let position = monitor.position();
        let size = monitor.size();
        let scale_factor = monitor.scale_factor();

        let id = generate_monitor_id(&name, position.x, position.y, size.width, size.height);

        contexts.push(MonitorContext {
            id,
            name,
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            scale_factor,
        });
    }

    Ok(contexts)
}

pub fn generate_monitors_snapshot(monitors: &[MonitorContext]) -> String {
    let mut parts = Vec::new();
    for monitor in monitors {
        parts.push(format!(
            "{}:{}x{}@{},{}:{}",
            monitor.name, monitor.width, monitor.height, monitor.x, monitor.y, monitor.scale_factor
        ));
    }
    parts.sort();
    parts.join("|")
}

pub fn monitors_changed(app: &AppHandle) -> Result<(bool, Vec<MonitorContext>), String> {
    let current_monitors = detect_monitors(app)?;
    let current_snapshot = generate_monitors_snapshot(&current_monitors);

    let registry = window_registry();
    let mut stored_snapshot = registry
        .current_snapshot
        .write()
        .map_err(|_| "Failed to acquire snapshot lock".to_string())?;

    let changed = *stored_snapshot != current_snapshot;
    if changed {
        *stored_snapshot = current_snapshot;
    }

    Ok((changed, current_monitors))
}

pub fn get_monitor_from_point(
    x: i32,
    y: i32,
    monitors: &[MonitorContext],
) -> Option<MonitorContext> {
    for monitor in monitors {
        let mx = monitor.x;
        let my = monitor.y;
        let mw = monitor.width as i32;
        let mh = monitor.height as i32;

        if x >= mx && x < (mx + mw) && y >= my && y < (my + mh) {
            return Some(monitor.clone());
        }
    }
    None
}
