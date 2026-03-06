use crate::monitor::{detect_monitors, window_registry};
use crate::types::{Mode, MonitorContext, MonitorContextPayload, VisibilityPayload};
use tauri::AppHandle;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

pub fn destroy_mode_windows(app: &AppHandle, mode: Mode) -> Result<(), String> {
    let registry = window_registry();
    let mut mode_windows = registry
        .mode_windows
        .write()
        .map_err(|_| "Failed to acquire mode_windows lock".to_string())?;

    if let Some(window_labels) = mode_windows.get(&mode) {
        for label in window_labels.iter() {
            if let Some(window) = app.get_webview_window(label) {
                let _ = window.destroy();
            }
        }
    }

    mode_windows.remove(&mode);
    Ok(())
}

fn create_single_window_for_mode(app: &AppHandle, mode: Mode) -> Result<String, String> {
    let label = mode.as_str().to_string();

    let url_param = format!(
        "?{}=true",
        match mode {
            Mode::Overlay => "overlay",
            Mode::Spotlight => "spotlight",
            Mode::Highlight => "cursorHighlight",
            Mode::Zoom => "zoom",
        }
    );

    let window = WebviewWindowBuilder::new(
        app,
        &label,
        WebviewUrl::App(format!("index.html{}", url_param).into()),
    )
    .title("")
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .visible(false)
    .shadow(false)
    .fullscreen(true)
    .build()
    .map_err(|e| {
        eprintln!("[ERROR] Failed to create window {}: {}", label, e);
        format!("Failed to create window: {}", e)
    })?;

    let app_handle = app.clone();
    let window_clone = window.clone();

    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = window_clone.hide();
            let payload = VisibilityPayload { visible: false };
            match mode {
                Mode::Overlay => {
                    let _ = app_handle.emit("overlay-visibility", payload);
                }
                Mode::Highlight => {
                    let _ = app_handle.emit("cursor-highlight-visibility", payload);
                }
                Mode::Spotlight => {
                    let _ = app_handle.emit("spotlight-visibility", payload);
                }
                Mode::Zoom => {
                    let _ = app_handle.emit("zoom-visibility", payload);
                }
            };
        }
    });

    if mode == Mode::Highlight || mode == Mode::Spotlight || mode == Mode::Zoom {
        let _ = window.set_ignore_cursor_events(true);
    }

    #[cfg(target_os = "windows")]
    if mode == Mode::Zoom {
        apply_zoom_capture_exclusion(&window);
    }

    Ok(label)
}

pub fn show_mode_windows_inner(app: &AppHandle, mode: Mode, show: bool) -> Result<(), String> {
    use crate::cursor::get_cursor_pos_cached;
    use crate::monitor::get_monitor_from_point;

    let cursor_pos = get_cursor_pos_cached().ok_or("Failed to get cursor position")?;

    let monitors = detect_monitors(app)?;
    let target_monitor = get_monitor_from_point(cursor_pos.x, cursor_pos.y, &monitors)
        .ok_or("No monitor found at cursor position")?;
    let registry = window_registry();
    let mode_windows = registry
        .mode_windows
        .read()
        .map_err(|_| "Failed to acquire mode_windows lock".to_string())?;

    let label = mode_windows
        .get(&mode)
        .and_then(|labels| labels.first())
        .ok_or(format!("No window found for mode {:?}", mode))?;

    let window = app
        .get_webview_window(label)
        .ok_or("Window not found in AppHandle")?;

    #[cfg(target_os = "windows")]
    ensure_window_on_monitor_native(&window, &target_monitor);

    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
        width: target_monitor.width,
        height: target_monitor.height,
    }));
    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: target_monitor.x,
        y: target_monitor.y,
    }));

    println!(
        "[DEBUG] Setting window size to {}x{} at {},{}",
        target_monitor.width, target_monitor.height, target_monitor.x, target_monitor.y
    );

    let _ = window.emit(
        "monitor-context",
        MonitorContextPayload {
            monitor_id: target_monitor.id.clone(),
            virtual_x: target_monitor.x,
            virtual_y: target_monitor.y,
            width: target_monitor.width,
            height: target_monitor.height,
            scale_factor: target_monitor.scale_factor,
        },
    );

    if show {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    force_window_position_native(&window, &target_monitor);

    Ok(())
}

#[cfg(target_os = "windows")]
fn ensure_window_on_monitor_native(window: &tauri::WebviewWindow, monitor: &MonitorContext) {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_DONOTROUND,
        DWMWINDOWATTRIBUTE,
    };
    use windows::Win32::Graphics::Gdi::{CreateRectRgn, SetWindowRgn};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, GWL_STYLE, HWND_TOPMOST,
        SWP_FRAMECHANGED, SWP_NOACTIVATE, WS_CLIPCHILDREN, WS_CLIPSIBLINGS, WS_EX_LAYERED,
        WS_EX_TOOLWINDOW, WS_POPUP,
    };

    let Ok(handle) = window.window_handle() else {
        return;
    };

    let hwnd = match handle.as_raw() {
        RawWindowHandle::Win32(handle) => HWND(handle.hwnd.get() as *mut _),
        _ => return,
    };

    unsafe {
        let style = WS_POPUP.0 | WS_CLIPCHILDREN.0 | WS_CLIPSIBLINGS.0;
        let current_style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let mut style_changed = false;

        if current_style != style {
            SetWindowLongPtrW(hwnd, GWL_STYLE, style as isize);
            style_changed = true;
        }

        let ex_style = WS_EX_TOOLWINDOW.0 | WS_EX_LAYERED.0;
        let current_ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        if current_ex_style != ex_style {
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style as isize);
            style_changed = true;
        }

        let corner_preference = DWMWCP_DONOTROUND;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &corner_preference as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        );

        let disable_transitions: u32 = 1;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWINDOWATTRIBUTE(3),
            &disable_transitions as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        );

        let region = CreateRectRgn(0, 0, monitor.width as i32, monitor.height as i32);
        SetWindowRgn(hwnd, Some(region), true);

        let flags = if style_changed {
            SWP_NOACTIVATE | SWP_FRAMECHANGED
        } else {
            SWP_NOACTIVATE
        };

        let _ = SetWindowPos(
            hwnd,
            Some(HWND_TOPMOST),
            monitor.x,
            monitor.y,
            monitor.width as i32,
            monitor.height as i32,
            flags,
        );
    }
}

#[cfg(target_os = "windows")]
fn force_window_position_native(window: &tauri::WebviewWindow, monitor: &MonitorContext) {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE};

    let Ok(handle) = window.window_handle() else {
        return;
    };

    let hwnd = match handle.as_raw() {
        RawWindowHandle::Win32(handle) => HWND(handle.hwnd.get() as *mut _),
        _ => return,
    };

    unsafe {
        let _ = SetWindowPos(
            hwnd,
            Some(HWND_TOPMOST),
            monitor.x,
            monitor.y,
            monitor.width as i32,
            monitor.height as i32,
            SWP_NOACTIVATE,
        );
    }
}

pub fn hide_mode_windows_inner(app: &AppHandle, mode: Mode) {
    let registry = window_registry();
    if let Ok(mode_windows) = registry.mode_windows.read() {
        if let Some(window_labels) = mode_windows.get(&mode) {
            for label in window_labels {
                if let Some(window) = app.get_webview_window(label) {
                    let _ = window.hide();
                }
            }
        }
    } else {
        eprintln!("[ERROR] Failed to acquire mode_windows lock (hide inner)");
    }
}

pub fn build_mode_windows_inner(
    app: &AppHandle,
    mode: Mode,
    _monitors: &[MonitorContext],
    show_after: bool,
) -> Result<(), String> {
    let window_label = create_single_window_for_mode(app, mode)?;

    {
        let registry = window_registry();
        let mut mode_windows = registry
            .mode_windows
            .write()
            .map_err(|_| "Failed to acquire mode_windows lock".to_string())?;

        mode_windows.insert(mode, vec![window_label]);
    }

    if show_after {
        let should_show = mode != Mode::Zoom;
        show_mode_windows_inner(app, mode, should_show)?;
    }

    let _ = app.emit(
        "mode-windows-ready",
        serde_json::json!({
            "mode": mode.as_str(),
            "count": 1
        }),
    );

    Ok(())
}

pub fn rebuild_mode_windows(
    app: &AppHandle,
    mode: Mode,
    monitors: &[MonitorContext],
) -> Result<(), String> {
    let monitors = monitors.to_vec();
    if let Err(err) = destroy_mode_windows(app, mode) {
        eprintln!("[ERROR] Failed to destroy mode windows {:?}: {}", mode, err);
    }
    if let Err(err) = build_mode_windows_inner(app, mode, &monitors, true) {
        eprintln!("[ERROR] Failed to rebuild mode windows {:?}: {}", mode, err);
    }
    Ok(())
}

pub fn hide_mode_windows(app: &AppHandle, mode: Mode) -> Result<(), String> {
    hide_mode_windows_inner(app, mode);
    Ok(())
}

pub fn mode_windows_ready(app: &AppHandle, mode: Mode) -> bool {
    let registry = window_registry();
    let Ok(mode_windows) = registry.mode_windows.read() else {
        return false;
    };

    let Some(window_labels) = mode_windows.get(&mode) else {
        return false;
    };

    if window_labels.is_empty() {
        return false;
    }

    window_labels
        .iter()
        .all(|label| app.get_webview_window(label).is_some())
}

pub fn hide_main_window(app: &AppHandle) {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.unminimize();
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
}

pub fn hide_overlay_window(app: &AppHandle) {
    let _ = hide_mode_windows(app, Mode::Overlay);
}

pub fn hide_whiteboard_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("whiteboard") {
        let _ = window.hide();
        let _ = app.emit(
            "whiteboard-visibility",
            VisibilityPayload { visible: false },
        );
    }
}

pub fn hide_cursor_highlight_window(app: &AppHandle) {
    let _ = hide_mode_windows(app, Mode::Highlight);
    let _ = app.emit(
        "cursor-highlight-visibility",
        VisibilityPayload { visible: false },
    );
}

pub fn hide_spotlight_window(app: &AppHandle) {
    let _ = hide_mode_windows(app, Mode::Spotlight);
    let _ = app.emit("spotlight-visibility", VisibilityPayload { visible: false });
}

pub fn hide_zoom_window(app: &AppHandle) {
    let _ = hide_mode_windows(app, Mode::Zoom);
    let _ = app.emit("zoom-visibility", VisibilityPayload { visible: false });
}

pub fn emit_mode_visibility_event(app: &AppHandle, mode: Mode, visible: bool) {
    let event_name = match mode {
        Mode::Overlay => "overlay-visibility",
        Mode::Highlight => "cursor-highlight-visibility",
        Mode::Spotlight => "spotlight-visibility",
        Mode::Zoom => "zoom-visibility",
    };
    let _ = app.emit(event_name, VisibilityPayload { visible });
}

pub fn handle_mode_visibility(app: &AppHandle, mode: Mode, visible: bool) -> Result<(), String> {
    if mode == Mode::Zoom && crate::get_zoom_backend() == "magnifier" {
        if visible {
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.hide();
            }
            if let Some(window) = app.get_webview_window("whiteboard") {
                let _ = window.hide();
                let _ = app.emit(
                    "whiteboard-visibility",
                    VisibilityPayload { visible: false },
                );
            }
            for other_mode in [Mode::Overlay, Mode::Highlight, Mode::Spotlight] {
                hide_mode_windows_inner(app, other_mode);
                emit_mode_visibility_event(app, other_mode, false);
            }
        }
        emit_mode_visibility_event(app, Mode::Zoom, visible);
        return Ok(());
    }

    if visible {
        if let Some(main_window) = app.get_webview_window("main") {
            let _ = main_window.hide();
        }

        if let Some(window) = app.get_webview_window("whiteboard") {
            let _ = window.hide();
            let _ = app.emit(
                "whiteboard-visibility",
                VisibilityPayload { visible: false },
            );
        }

        for other_mode in [Mode::Overlay, Mode::Highlight, Mode::Spotlight, Mode::Zoom] {
            if other_mode != mode {
                hide_mode_windows_inner(app, other_mode);
                emit_mode_visibility_event(app, other_mode, false);
            }
        }

        let mut reused_existing = false;
        if mode_windows_ready(app, mode) {
            let should_show = mode != Mode::Zoom;
            if let Err(err) = show_mode_windows_inner(app, mode, should_show) {
                eprintln!(
                    "[WARN] Failed to show existing windows for {:?}: {}",
                    mode, err
                );
            } else {
                reused_existing = true;
            }
        }

        if !reused_existing {
            match detect_monitors(app) {
                Ok(monitors) => {
                    if let Err(err) = destroy_mode_windows(app, mode) {
                        eprintln!("[ERROR] Failed to destroy windows for {:?}: {}", mode, err);
                    }
                    if let Err(err) = build_mode_windows_inner(app, mode, &monitors, true) {
                        eprintln!("[ERROR] Failed to build windows for {:?}: {}", mode, err);
                    }
                }
                Err(err) => {
                    eprintln!("[ERROR] Failed to detect monitors: {}", err);
                }
            }
        }
    } else if mode != Mode::Zoom {
        hide_mode_windows_inner(app, mode);
    }
    emit_mode_visibility_event(app, mode, visible);
    Ok(())
}

use std::sync::atomic::{AtomicPtr, Ordering};

static ZOOM_HWND: AtomicPtr<std::ffi::c_void> = AtomicPtr::new(std::ptr::null_mut());

#[cfg(target_os = "windows")]
pub fn apply_zoom_capture_exclusion(window: &tauri::WebviewWindow) {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowDisplayAffinity, WINDOW_DISPLAY_AFFINITY,
    };

    let Ok(handle) = window.window_handle() else {
        return;
    };
    let hwnd = match handle.as_raw() {
        RawWindowHandle::Win32(handle) => HWND(handle.hwnd.get() as *mut _),
        _ => return,
    };

    ZOOM_HWND.store(hwnd.0, Ordering::Relaxed);

    unsafe {
        let _ = SetWindowDisplayAffinity(hwnd, WINDOW_DISPLAY_AFFINITY(0x11));
    }
}

#[cfg(target_os = "windows")]
pub fn set_zoom_capture_exclusion(excluded: bool) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowDisplayAffinity, WINDOW_DISPLAY_AFFINITY,
    };

    let ptr = ZOOM_HWND.load(Ordering::Relaxed);
    if ptr.is_null() {
        return;
    }
    let hwnd = HWND(ptr);

    unsafe {
        if excluded {
            let _ = SetWindowDisplayAffinity(hwnd, WINDOW_DISPLAY_AFFINITY(0x11));
        } else {
            let _ = SetWindowDisplayAffinity(hwnd, WINDOW_DISPLAY_AFFINITY(0x00));
        }
    }
}
