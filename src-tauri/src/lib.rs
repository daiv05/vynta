mod commands;
mod cursor;
mod dxgi_capture;
mod magnifier;
mod monitor;
mod types;
mod window;
mod zoom;

use std::sync::{OnceLock, RwLock};

#[derive(serde::Deserialize)]
struct ZoomConfig {
    #[serde(rename = "ZOOM_BACKEND")]
    backend: String,
}

static ZOOM_BACKEND_STATE: OnceLock<RwLock<String>> = OnceLock::new();

pub fn get_zoom_backend() -> String {
    let state = ZOOM_BACKEND_STATE.get_or_init(|| {
        let json_str = include_str!("../../config/zoom.json");
        let config: ZoomConfig = serde_json::from_str(json_str).expect("Failed to parse zoom.json");
        RwLock::new(config.backend)
    });

    match state.read() {
        Ok(guard) => guard.clone(),
        Err(e) => {
            eprintln!("Failed to read zoom backend state: {}", e);
            "dxgi".to_string()
        }
    }
}

pub fn set_zoom_backend_internal(new_backend: String) {
    let state = ZOOM_BACKEND_STATE.get_or_init(|| {
        let json_str = include_str!("../../config/zoom.json");
        let config: ZoomConfig = serde_json::from_str(json_str).expect("Failed to parse zoom.json");
        RwLock::new(config.backend)
    });

    if let Ok(mut guard) = state.write() {
        *guard = new_backend;
    }
}

use monitor::{detect_monitors, generate_monitors_snapshot, monitors_changed, window_registry};
use std::time::Duration;
use tauri::{menu::Menu, menu::MenuItemBuilder, tray::TrayIconBuilder};
use tauri::{Emitter, Listener, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tokio::time::sleep;
use types::{mode_from_str, CursorPositionPayload, VisibilityPayload};
use window::{handle_mode_visibility, rebuild_mode_windows};
use windows::Win32::Foundation::POINT;
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            cursor::start_mouse_hook();

            let monitors = detect_monitors(app.handle())?;
            let snapshot = generate_monitors_snapshot(&monitors);
            if let Ok(mut stored) = window_registry().current_snapshot.write() {
                *stored = snapshot;
            }

            let app_handle_for_cursor = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    unsafe {
                        let mut point = POINT { x: 0, y: 0 };
                        if GetCursorPos(&mut point).is_ok() {
                            let _ = app_handle_for_cursor.emit(
                                "cursor-position",
                                CursorPositionPayload {
                                    x: point.x,
                                    y: point.y,
                                },
                            );
                        }
                    }
                    sleep(Duration::from_millis(16)).await;
                }
            });

            let app_handle_for_monitors = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    sleep(Duration::from_secs(2)).await;

                    if let Ok((changed, new_monitors)) = monitors_changed(&app_handle_for_monitors)
                    {
                        if changed {
                            let registry = window_registry();
                            if let Ok(mode_windows) = registry.mode_windows.read() {
                                let active_modes: Vec<types::Mode> =
                                    mode_windows.keys().copied().collect();
                                drop(mode_windows);

                                for mode in active_modes {
                                    let _ = rebuild_mode_windows(
                                        &app_handle_for_monitors,
                                        mode,
                                        &new_monitors,
                                    );
                                }
                            }

                            let _ = app_handle_for_monitors.emit(
                                "monitors-changed",
                                serde_json::json!({ "count": new_monitors.len() }),
                            );
                        }
                    }
                }
            });

            let app_handle_for_requests = app.handle().clone();

            app.handle()
                .listen("mode-visibility-request", move |event: tauri::Event| {
                    let app = app_handle_for_requests.clone();

                    let payload = event.payload().to_string();

                    tauri::async_runtime::spawn(async move {
                        if payload.is_empty() {
                            eprintln!("[WARN] mode-visibility-request without payload");
                            return;
                        }

                        let request: Result<types::ModeVisibilityRequestPayload, _> =
                            serde_json::from_str(&payload);

                        match request {
                            Ok(request) => {
                                let Some(mode) = mode_from_str(&request.mode) else {
                                    eprintln!("[WARN] Unknown mode in request: {}", request.mode);
                                    return;
                                };

                                if let Err(err) =
                                    handle_mode_visibility(&app, mode, request.visible)
                                {
                                    eprintln!("[ERROR] Failed to handle mode visibility: {}", err);
                                    let _ = app.emit("backend-error", err);
                                }
                            }
                            Err(err) => {
                                eprintln!(
                                    "[WARN] Invalid mode-visibility-request payload: {}",
                                    err
                                );
                            }
                        }
                    });
                });

            let tray_menu = Menu::new(app)?;
            let draw_item = MenuItemBuilder::new("Live Draw")
                .id("tray-draw")
                .build(app)?;
            let whiteboard_item = MenuItemBuilder::new("Whiteboard")
                .id("tray-whiteboard")
                .build(app)?;
            let config_item = MenuItemBuilder::new("Configuración")
                .id("tray-config")
                .build(app)?;
            let exit_item = MenuItemBuilder::new("Cerrar").id("tray-exit").build(app)?;
            tray_menu.append(&draw_item)?;
            tray_menu.append(&whiteboard_item)?;
            tray_menu.append(&config_item)?;
            tray_menu.append(&exit_item)?;

            let tray_builder = if let Some(icon) = app.default_window_icon().cloned() {
                TrayIconBuilder::<tauri::Wry>::with_id("main")
                    .icon(icon)
                    .tooltip("Vynta")
            } else {
                TrayIconBuilder::<tauri::Wry>::with_id("main").tooltip("Vynta")
            };

            tray_builder
                .menu(&tray_menu)
                .on_menu_event(|app: &tauri::AppHandle, event: tauri::menu::MenuEvent| {
                    let id = event.id().as_ref();
                    match id {
                        "tray-draw" => {
                            let _ = commands::set_overlay_visible(app.clone(), true);
                        }
                        "tray-config" => {
                            let _ = commands::show_configuration_window(app.clone());
                        }
                        "tray-whiteboard" => {
                            let _ = commands::open_whiteboard_mode(app.clone());
                        }
                        "tray-exit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();

                let window_handle = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_handle.hide();
                    }
                });
            }

            WebviewWindowBuilder::new(
                app,
                "whiteboard",
                WebviewUrl::App("index.html?whiteboard=true".into()),
            )
            .title("Vynta Whiteboard")
            .maximized(true)
            .resizable(true)
            .visible(false)
            .build()?;

            if let Some(window) = app.get_webview_window("whiteboard") {
                let app_handle = app.handle().clone();
                let window_handle = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_handle.hide();
                        let _ = app_handle.emit(
                            "whiteboard-visibility",
                            VisibilityPayload { visible: false },
                        );
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::set_overlay_visible,
            commands::open_whiteboard_mode,
            commands::set_whiteboard_visible,
            commands::show_configuration_window,
            commands::set_cursor_highlight_visible,
            commands::set_spotlight_visible,
            commands::set_zoom_visible,
            commands::set_zoom_capture_excluded,
            commands::get_cursor_position,
            commands::get_cursor_position_global,
            commands::get_monitor_context,
            commands::get_active_monitor_context,
            zoom::start_zoom_stream,
            zoom::set_zoom_stream_config,
            zoom::zoom_frame_consumed,
            zoom::stop_zoom_stream,
            commands::freeze_zoom,
            commands::unfreeze_zoom,
            zoom::capture_viewport_without_zoom,
            commands::mag_zoom_show,
            commands::mag_zoom_hide,
            commands::mag_zoom_set_config,
            commands::capture_monitor_frame,
            commands::set_zoom_ignore_cursor_events,
            commands::reveal_mode_window,
            commands::execute_hide_mode,
            commands::update_tray_lang,
            commands::get_zoom_backend_cmd,
            commands::set_zoom_backend_cmd
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                #[cfg(target_os = "windows")]
                cursor::stop_mouse_hook();
            }
        });
}
