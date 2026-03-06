use crate::monitor::detect_monitors;
use crate::types::{
    CursorPositionPayload, Mode, ModeVisibilityRequestPayload, MonitorContextPayload,
    TrayTranslations, VisibilityPayload,
};
use crate::window::{
    hide_cursor_highlight_window, hide_main_window, hide_overlay_window, hide_spotlight_window,
    hide_whiteboard_window, hide_zoom_window, show_main_window,
};
use tauri::menu::{Menu, MenuItemBuilder};
use tauri::{Emitter, Manager};
use windows::Win32::Foundation::POINT;
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

#[tauri::command]
pub fn update_tray_lang(
    app: tauri::AppHandle,
    translations: TrayTranslations,
) -> Result<(), String> {
    let tray = app
        .tray_by_id("main")
        .ok_or_else(|| "Tray not found".to_string())?;

    let menu = Menu::new(&app).map_err(|e| e.to_string())?;

    let draw_item = MenuItemBuilder::new(&translations.draw)
        .id("tray-draw")
        .build(&app)
        .map_err(|e| e.to_string())?;

    // let spotlight_item = MenuItemBuilder::new(&translations.spotlight)
    //     .id("tray-spotlight")
    //     .build(&app)
    //     .map_err(|e| e.to_string())?;

    // let highlight_item = MenuItemBuilder::new(&translations.highlight)
    //     .id("tray-highlight")
    //     .build(&app)
    //     .map_err(|e| e.to_string())?;

    let whiteboard_item = MenuItemBuilder::new(&translations.whiteboard)
        .id("tray-whiteboard")
        .build(&app)
        .map_err(|e| e.to_string())?;

    // let zoom_item = MenuItemBuilder::new(&translations.zoom)
    //     .id("tray-zoom")
    //     .build(&app)
    //     .map_err(|e| e.to_string())?;

    let config_item = MenuItemBuilder::new(&translations.config)
        .id("tray-config")
        .build(&app)
        .map_err(|e| e.to_string())?;

    let exit_item = MenuItemBuilder::new(&translations.exit)
        .id("tray-exit")
        .build(&app)
        .map_err(|e| e.to_string())?;

    menu.append(&draw_item).map_err(|e| e.to_string())?;
    // menu.append(&spotlight_item).map_err(|e| e.to_string())?;
    // menu.append(&highlight_item).map_err(|e| e.to_string())?;
    menu.append(&whiteboard_item).map_err(|e| e.to_string())?;
    // menu.append(&zoom_item).map_err(|e| e.to_string())?;
    menu.append(&config_item).map_err(|e| e.to_string())?;
    menu.append(&exit_item).map_err(|e| e.to_string())?;

    tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_overlay_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    app.emit(
        "mode-visibility-request",
        ModeVisibilityRequestPayload {
            mode: Mode::Overlay.as_str().to_string(),
            visible,
        },
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_whiteboard_mode(app: tauri::AppHandle) -> Result<(), String> {
    hide_main_window(&app);
    hide_overlay_window(&app);
    hide_cursor_highlight_window(&app);
    hide_spotlight_window(&app);
    hide_zoom_window(&app);

    if let Some(window) = app.get_webview_window("whiteboard") {
        window.show().map_err(|error| error.to_string())?;
        let _ = window.set_focus();
        let _ = app.emit("whiteboard-visibility", VisibilityPayload { visible: true });
        Ok(())
    } else {
        Err("Whiteboard window not found".to_string())
    }
}

#[tauri::command]
pub fn set_whiteboard_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    if visible {
        open_whiteboard_mode(app)
    } else {
        hide_whiteboard_window(&app);
        let _ = app.emit(
            "whiteboard-visibility",
            VisibilityPayload { visible: false },
        );
        Ok(())
    }
}

#[tauri::command]
pub fn set_cursor_highlight_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    app.emit(
        "mode-visibility-request",
        ModeVisibilityRequestPayload {
            mode: Mode::Highlight.as_str().to_string(),
            visible,
        },
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_spotlight_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    app.emit(
        "mode-visibility-request",
        ModeVisibilityRequestPayload {
            mode: Mode::Spotlight.as_str().to_string(),
            visible,
        },
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_zoom_visible(app: tauri::AppHandle, visible: bool) -> Result<(), String> {
    app.emit(
        "mode-visibility-request",
        ModeVisibilityRequestPayload {
            mode: Mode::Zoom.as_str().to_string(),
            visible,
        },
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_zoom_capture_excluded(excluded: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        crate::window::set_zoom_capture_exclusion(excluded);
    }
    Ok(())
}

#[tauri::command]
pub fn freeze_zoom() -> Result<(), String> {
    crate::zoom::stop_zoom_stream()?;
    #[cfg(target_os = "windows")]
    {
        crate::window::set_zoom_capture_exclusion(false);
    }
    Ok(())
}

#[tauri::command]
pub fn unfreeze_zoom() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        crate::window::set_zoom_capture_exclusion(true);
    }
    Ok(())
}

#[tauri::command]
pub fn mag_zoom_show(size: u32, zoom_level: f32, shape: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        crate::magnifier::mag_start(size, zoom_level, &shape)?;
        crate::magnifier::mag_show();
    }
    Ok(())
}

#[tauri::command]
pub fn mag_zoom_hide() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    crate::magnifier::mag_hide();
    Ok(())
}

#[tauri::command]
pub fn mag_zoom_set_config(size: u32, zoom_level: f32, shape: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    crate::magnifier::mag_set_config(size, zoom_level, &shape);
    Ok(())
}

#[tauri::command]
pub fn get_cursor_position(
    app: tauri::AppHandle,
    window_label: String,
) -> Result<CursorPositionPayload, String> {
    unsafe {
        let mut point = POINT { x: 0, y: 0 };
        match GetCursorPos(&mut point) {
            Ok(_) => {
                let scale_factor = app
                    .get_webview_window(&window_label)
                    .and_then(|window| window.scale_factor().ok())
                    .unwrap_or(1.0);
                let x = (point.x as f64 / scale_factor).round() as i32;
                let y = (point.y as f64 / scale_factor).round() as i32;
                Ok(CursorPositionPayload { x, y })
            }
            Err(_) => Err("No se pudo obtener la posición del cursor".to_string()),
        }
    }
}

#[tauri::command]
pub fn set_zoom_ignore_cursor_events(app: tauri::AppHandle, ignore: bool) -> Result<(), String> {
    if crate::get_zoom_backend() != "dxgi" {
        return Ok(());
    }

    let registry = crate::monitor::window_registry();
    if let Ok(mode_windows) = registry.mode_windows.read() {
        if let Some(labels) = mode_windows.get(&crate::types::Mode::Zoom) {
            for label in labels {
                if let Some(window) = app.get_webview_window(label) {
                    #[cfg(not(target_os = "windows"))]
                    let _ = window.set_ignore_cursor_events(ignore);

                    #[cfg(target_os = "windows")]
                    {
                        use raw_window_handle::{HasWindowHandle, RawWindowHandle};
                        use windows::Win32::Foundation::HWND;
                        use windows::Win32::UI::WindowsAndMessaging::{
                            GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_TRANSPARENT,
                        };

                        if let Ok(handle) = window.window_handle() {
                            if let RawWindowHandle::Win32(win32_handle) = handle.as_raw() {
                                let hwnd = HWND(win32_handle.hwnd.get() as *mut _);
                                unsafe {
                                    let mut ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
                                    if ignore {
                                        ex_style |= WS_EX_TRANSPARENT.0;
                                    } else {
                                        ex_style &= !WS_EX_TRANSPARENT.0;
                                    }
                                    SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style as isize);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn capture_monitor_frame(cursor_x: i32, cursor_y: i32) -> Result<String, String> {
    tokio::task::spawn_blocking(move || crate::zoom::capture_monitor_frame_sync(cursor_x, cursor_y))
        .await
        .map_err(|e| format!("spawn_blocking error: {e}"))?
}

#[tauri::command]
pub fn get_cursor_position_global() -> Result<CursorPositionPayload, String> {
    if let Some(payload) = crate::cursor::get_cursor_pos_cached() {
        return Ok(payload);
    }
    unsafe {
        let mut point = POINT { x: 0, y: 0 };
        match GetCursorPos(&mut point) {
            Ok(_) => Ok(CursorPositionPayload {
                x: point.x,
                y: point.y,
            }),
            Err(_) => Err("No se pudo obtener la posición del cursor".to_string()),
        }
    }
}

#[tauri::command]
pub fn get_monitor_context(
    app: tauri::AppHandle,
    monitor_id: String,
) -> Result<MonitorContextPayload, String> {
    let monitors = detect_monitors(&app)?;
    let monitor = monitors
        .into_iter()
        .find(|item| item.id == monitor_id)
        .ok_or_else(|| "Monitor no encontrado".to_string())?;

    Ok(MonitorContextPayload {
        monitor_id: monitor.id,
        virtual_x: monitor.x,
        virtual_y: monitor.y,
        width: monitor.width,
        height: monitor.height,
        scale_factor: monitor.scale_factor,
    })
}

#[tauri::command]
pub fn get_active_monitor_context(app: tauri::AppHandle) -> Result<MonitorContextPayload, String> {
    let cursor_pos =
        crate::cursor::get_cursor_pos_cached().ok_or("Failed to get cursor position")?;
    let monitors = detect_monitors(&app)?;
    let monitor = crate::monitor::get_monitor_from_point(cursor_pos.x, cursor_pos.y, &monitors)
        .ok_or_else(|| "Monitor no encontrado".to_string())?;

    Ok(MonitorContextPayload {
        monitor_id: monitor.id,
        virtual_x: monitor.x,
        virtual_y: monitor.y,
        width: monitor.width,
        height: monitor.height,
        scale_factor: monitor.scale_factor,
    })
}

#[tauri::command]
pub fn show_configuration_window(app: tauri::AppHandle) -> Result<(), String> {
    hide_overlay_window(&app);
    hide_whiteboard_window(&app);
    hide_cursor_highlight_window(&app);
    hide_spotlight_window(&app);
    hide_zoom_window(&app);
    show_main_window(&app);
    let _ = app.emit("overlay-visibility", VisibilityPayload { visible: false });
    let _ = app.emit(
        "whiteboard-visibility",
        VisibilityPayload { visible: false },
    );
    let _ = app.emit(
        "cursor-highlight-visibility",
        VisibilityPayload { visible: false },
    );
    let _ = app.emit("spotlight-visibility", VisibilityPayload { visible: false });
    let _ = app.emit("zoom-visibility", VisibilityPayload { visible: false });
    Ok(())
}

#[tauri::command]
pub fn reveal_mode_window(
    app: tauri::AppHandle,
    mode_str: String,
    width: Option<u32>,
    height: Option<u32>,
) -> Result<(), String> {
    if let Some(mode) = crate::types::mode_from_str(&mode_str) {
        let registry = crate::monitor::window_registry();
        if let Ok(mode_windows) = registry.mode_windows.read() {
            if let Some(labels) = mode_windows.get(&mode) {
                for label in labels {
                    if let Some(w) = app.get_webview_window(label) {
                        #[cfg(target_os = "windows")]
                        {
                            use raw_window_handle::{HasWindowHandle, RawWindowHandle};
                            use windows::Win32::Foundation::HWND;
                            use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_SHOW};

                            if let Ok(handle) = w.window_handle() {
                                if let RawWindowHandle::Win32(h) = handle.as_raw() {
                                    let hwnd = HWND(h.hwnd.get() as *mut _);
                                    unsafe {
                                        let _ = ShowWindow(hwnd, SW_SHOW);
                                    }
                                    if let (Some(wi), Some(hi)) = (width, height) {
                                        unsafe {
                                            use windows::Win32::UI::WindowsAndMessaging::{
                                                SetWindowPos, SWP_NOACTIVATE, SWP_NOMOVE,
                                                SWP_NOZORDER,
                                            };
                                            let _ = SetWindowPos(
                                                hwnd,
                                                Some(HWND::default()),
                                                0,
                                                0,
                                                wi as i32,
                                                hi as i32,
                                                SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE,
                                            );
                                        }
                                        let _ = w.set_size(tauri::Size::Physical(
                                            tauri::PhysicalSize {
                                                width: wi,
                                                height: hi,
                                            },
                                        ));
                                    }
                                }
                            }
                            let _ = w.set_focus();
                        }
                        #[cfg(not(target_os = "windows"))]
                        {
                            let _ = w.show();
                            if let (Some(wi), Some(hi)) = (width, height) {
                                let _ = w.set_size(tauri::Size::Logical(tauri::LogicalSize {
                                    width: wi as f64,
                                    height: hi as f64,
                                }));
                            }
                            let _ = w.set_focus();
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn execute_hide_mode(app: tauri::AppHandle, mode_str: String) -> Result<(), String> {
    if let Some(mode) = crate::types::mode_from_str(&mode_str) {
        crate::window::hide_mode_windows_inner(&app, mode);
    }
    Ok(())
}

#[tauri::command]
pub fn get_zoom_backend_cmd() -> String {
    crate::get_zoom_backend()
}

#[tauri::command]
pub fn set_zoom_backend_cmd(backend: String) -> Result<(), String> {
    crate::set_zoom_backend_internal(backend);
    Ok(())
}
