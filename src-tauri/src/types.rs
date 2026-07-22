use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex, RwLock};
use tauri::async_runtime::JoinHandle;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Mode {
    Overlay,
    Spotlight,
    Highlight,
    Zoom,
}

impl Mode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Mode::Overlay => "overlay",
            Mode::Spotlight => "spotlight",
            Mode::Highlight => "cursor-highlight",
            Mode::Zoom => "zoom",
        }
    }
}

pub fn mode_from_str(value: &str) -> Option<Mode> {
    match value {
        "overlay" => Some(Mode::Overlay),
        "spotlight" => Some(Mode::Spotlight),
        "cursor-highlight" => Some(Mode::Highlight),
        "zoom" => Some(Mode::Zoom),
        _ => None,
    }
}

#[derive(Debug, Clone)]
pub struct MonitorContext {
    pub id: String,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
}

pub struct WindowRegistry {
    pub mode_windows: RwLock<HashMap<Mode, Vec<String>>>,
    pub current_snapshot: RwLock<String>,
    mode_locks: HashMap<Mode, Mutex<()>>,
}

impl WindowRegistry {
    pub fn new() -> Self {
        let mut mode_locks = HashMap::new();
        for mode in [Mode::Overlay, Mode::Spotlight, Mode::Highlight, Mode::Zoom] {
            mode_locks.insert(mode, Mutex::new(()));
        }

        Self {
            mode_windows: RwLock::new(HashMap::new()),
            current_snapshot: RwLock::new(String::new()),
            mode_locks,
        }
    }

    /// Serializes the destroy→build→show sequence for a given [`Mode`] so
    /// concurrent callers (monitor-change loop vs. visibility requests)
    /// cannot interleave window mutations for the same mode.
    pub fn with_mode_lock<T>(&self, mode: Mode, f: impl FnOnce() -> T) -> T {
        let _guard = self
            .mode_locks
            .get(&mode)
            .expect("mode_locks initialized for every Mode variant")
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        f()
    }
}

#[derive(serde::Serialize, Clone)]
pub struct VisibilityPayload {
    pub visible: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct ModeVisibilityRequestPayload {
    pub mode: String,
    pub visible: bool,
}

#[derive(serde::Serialize, Clone)]
pub struct CursorPositionPayload {
    pub x: i32,
    pub y: i32,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MonitorContextPayload {
    pub monitor_id: String,
    pub virtual_x: i32,
    pub virtual_y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
}

#[derive(serde::Serialize, Clone)]
pub struct ZoomRegionRawPayload {
    pub data: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone)]
pub struct ZoomStreamConfig {
    pub size: u32,
    pub zoom_level: f32,
    pub idle_fps: u64,
    pub active_fps: u64,
}

#[derive(Clone, Copy)]
pub enum ZoomFilter {
    Gaussian,
}

#[derive(serde::Serialize, Clone)]
pub struct ZoomFramePayload {
    pub data: String,
    pub width: u32,
    pub height: u32,
    pub cursor_x: i32,
    pub cursor_y: i32,
}

pub struct ZoomStreamHandle {
    pub stop: Arc<AtomicBool>,
    pub config: Arc<RwLock<ZoomStreamConfig>>,
    pub pending: Arc<AtomicBool>,
    pub task: JoinHandle<()>,
}

#[derive(serde::Deserialize)]
pub struct TrayTranslations {
    pub draw: String,
    // pub spotlight: String,
    // pub highlight: String,
    pub whiteboard: String,
    // pub zoom: String,
    pub config: String,
    pub exit: String,
}
