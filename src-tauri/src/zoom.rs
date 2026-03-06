use crate::cursor::get_cursor_pos_cached;
use crate::dxgi_capture::DxgiDuplicator;
use crate::types::{
    ZoomFilter, ZoomFramePayload, ZoomRegionRawPayload, ZoomStreamConfig, ZoomStreamHandle,
};
use arc_swap::ArcSwapOption;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock, RwLock};
use std::time::Duration;
use tauri::Emitter;
use tokio::time::sleep;
use windows::Win32::Foundation::POINT;
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

static ZOOM_STREAM: OnceLock<ArcSwapOption<ZoomStreamHandle>> = OnceLock::new();

pub fn zoom_stream_handle() -> &'static ArcSwapOption<ZoomStreamHandle> {
    ZOOM_STREAM.get_or_init(ArcSwapOption::empty)
}

async fn capture_viewport() -> Result<String, String> {
    tokio::task::spawn_blocking(|| {
        let mut duplicator =
            DxgiDuplicator::new_for_point(0, 0).map_err(|e| format!("DxgiDuplicator: {e}"))?;

        let (rgba, width, height) = duplicator
            .capture_full_frame()
            .map_err(|e| format!("capture_full_frame: {e}"))?;

        let mut png_data = Vec::new();
        {
            let mut encoder = png::Encoder::new(std::io::Cursor::new(&mut png_data), width, height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder
                .write_header()
                .map_err(|e| format!("PNG header: {e}"))?;
            writer
                .write_image_data(&rgba)
                .map_err(|e| format!("PNG write: {e}"))?;
        }

        use base64::Engine as _;
        let base64_string = base64::engine::general_purpose::STANDARD.encode(&png_data);
        let data_url = format!("data:image/png;base64,{}", base64_string);
        Ok(data_url)
    })
    .await
    .map_err(|e| format!("spawn_blocking: {e}"))?
}

use std::sync::Mutex;
static CACHED_DUPLICATOR: Mutex<Option<DxgiDuplicator>> = Mutex::new(None);

fn capture_zoom_region_raw_sync(
    cursor_x: i32,
    cursor_y: i32,
    size: u32,
    zoom_level: f32,
    _filter: ZoomFilter,
) -> Result<ZoomRegionRawPayload, String> {
    let mut cache = CACHED_DUPLICATOR
        .lock()
        .map_err(|_| "Mutex locked".to_string())?;

    let needs_recreate = match cache.as_ref() {
        Some(dup) => !dup.contains_point(cursor_x, cursor_y),
        None => true,
    };

    if needs_recreate {
        match DxgiDuplicator::new_for_point(cursor_x, cursor_y) {
            Ok(dup) => *cache = Some(dup),
            Err(e) => {
                *cache = None;
                return Err(format!("DxgiDuplicator: {e}"));
            }
        }
    }

    let dup = cache.as_mut().unwrap();

    let origin_x = dup.origin_x;
    let origin_y = dup.origin_y;
    let level = zoom_level.max(1.0);
    let region = ((size as f32) / level).round().max(1.0) as i32;
    let half = region / 2;
    let local_x = cursor_x - origin_x - half;
    let local_y = cursor_y - origin_y - half;

    let (rgba, width, height) = dup
        .capture_region(local_x, local_y, region as u32, region as u32)
        .inspect_err(|e| {
            if e.contains("ACCESS_LOST") {
                *cache = None;
            }
        })?;

    use base64::Engine as _;
    let data = base64::engine::general_purpose::STANDARD.encode(&rgba);
    Ok(ZoomRegionRawPayload {
        data,
        width,
        height,
    })
}

#[cfg(target_os = "windows")]
fn capture_gdi_screenshot(cursor_x: i32, cursor_y: i32) -> Result<(Vec<u8>, u32, u32), String> {
    use std::mem;
    use windows::Win32::Foundation::POINT;
    use windows::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, GetMonitorInfoW, MonitorFromPoint, SelectObject, BITMAPINFO, BITMAPINFOHEADER,
        BI_RGB, DIB_RGB_COLORS, MONITORINFO, MONITOR_DEFAULTTONEAREST, SRCCOPY,
    };

    unsafe {
        let pt = POINT {
            x: cursor_x,
            y: cursor_y,
        };
        let hmonitor = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
        let mut mi: MONITORINFO = mem::zeroed();
        mi.cbSize = mem::size_of::<MONITORINFO>() as u32;
        if !GetMonitorInfoW(hmonitor, &mut mi).as_bool() {
            return Err("GetMonitorInfoW failed".to_string());
        }

        let rect = mi.rcMonitor;
        let width = (rect.right - rect.left) as u32;
        let height = (rect.bottom - rect.top) as u32;

        let hdc_screen = GetDC(None);
        let hdc_mem = CreateCompatibleDC(Some(hdc_screen));
        let hbm = CreateCompatibleBitmap(hdc_screen, width as i32, height as i32);

        let hbm_old = SelectObject(hdc_mem, hbm.into());

        BitBlt(
            hdc_mem,
            0,
            0,
            width as i32,
            height as i32,
            Some(hdc_screen),
            rect.left,
            rect.top,
            SRCCOPY,
        )
        .map_err(|e| format!("BitBlt failed: {e}"))?;

        SelectObject(hdc_mem, hbm_old);

        let mut bmi: BITMAPINFO = mem::zeroed();
        bmi.bmiHeader.biSize = mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = width as i32;
        bmi.bmiHeader.biHeight = -(height as i32);
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB.0;

        let mut pixels: Vec<u8> = vec![0; (width * height * 4) as usize];

        let res = GetDIBits(
            hdc_screen,
            hbm,
            0,
            height,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        let _ = DeleteObject(hbm.into());
        let _ = DeleteDC(hdc_mem);
        let _ = windows::Win32::Graphics::Gdi::ReleaseDC(None, hdc_screen);

        if res == 0 {
            return Err("GetDIBits failed".to_string());
        }

        for i in (0..pixels.len()).step_by(4) {
            let b = pixels[i];
            let r = pixels[i + 2];
            pixels[i] = r;
            pixels[i + 2] = b;
            pixels[i + 3] = 255;
        }

        Ok((pixels, width, height))
    }
}

pub fn capture_monitor_frame_sync(cursor_x: i32, cursor_y: i32) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let frame_result = capture_gdi_screenshot(cursor_x, cursor_y);

    let (rgba, width, height) = frame_result?;

    let mut png_data = Vec::new();
    {
        let mut encoder = png::Encoder::new(std::io::Cursor::new(&mut png_data), width, height);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder
            .write_header()
            .map_err(|e| format!("PNG header: {e}"))?;
        writer
            .write_image_data(&rgba)
            .map_err(|e| format!("PNG write: {e}"))?;
    }

    use base64::Engine as _;
    let base64_string = base64::engine::general_purpose::STANDARD.encode(&png_data);
    Ok(format!("data:image/png;base64,{}", base64_string))
}

#[tauri::command]
pub fn start_zoom_stream(app: tauri::AppHandle, size: u32, zoom_level: f32) -> Result<(), String> {
    let handle_store = zoom_stream_handle();
    if let Some(existing) = handle_store.load_full() {
        if let Ok(mut cfg) = existing.config.write() {
            cfg.size = size;
            cfg.zoom_level = zoom_level;
        }
        existing.pending.store(false, Ordering::Relaxed);
        return Ok(());
    }

    let stop = Arc::new(AtomicBool::new(false));
    let config = Arc::new(RwLock::new(ZoomStreamConfig {
        size,
        zoom_level,
        idle_fps: 30,
        active_fps: 60,
    }));
    let pending = Arc::new(AtomicBool::new(false));

    let stop_flag = stop.clone();
    let cfg_ref = config.clone();
    let in_flight_flag = Arc::new(AtomicBool::new(false));
    let pending_flag = pending.clone();
    let app_handle = app.clone();

    let task = tauri::async_runtime::spawn(async move {
        let mut last_cursor: Option<(i32, i32)> = None;
        loop {
            if stop_flag.load(Ordering::Relaxed) {
                break;
            }

            let cfg = cfg_ref.read().ok().map(|c| c.clone());
            if let Some(cfg) = cfg {
                let (cursor_x, cursor_y) = if let Some(cached) = get_cursor_pos_cached() {
                    (cached.x, cached.y)
                } else {
                    unsafe {
                        let mut point = POINT { x: 0, y: 0 };
                        if GetCursorPos(&mut point).is_ok() {
                            (point.x, point.y)
                        } else {
                            (0, 0)
                        }
                    }
                };

                let (dx, dy) = if let Some(last) = last_cursor {
                    (cursor_x - last.0, cursor_y - last.1)
                } else {
                    (0, 0)
                };
                let moved = dx != 0 || dy != 0;
                last_cursor = Some((cursor_x, cursor_y));

                if !pending_flag.load(Ordering::Relaxed)
                    && !in_flight_flag.swap(true, Ordering::Relaxed)
                {
                    let payload = tauri::async_runtime::spawn_blocking(move || {
                        let filter = ZoomFilter::Gaussian;
                        capture_zoom_region_raw_sync(
                            cursor_x,
                            cursor_y,
                            cfg.size,
                            cfg.zoom_level,
                            filter,
                        )
                    })
                    .await
                    .ok()
                    .and_then(|r| r.ok());

                    if let Some(payload) = payload {
                        pending_flag.store(true, Ordering::Relaxed);
                        if app_handle
                            .emit(
                                "zoom-frame",
                                ZoomFramePayload {
                                    data: payload.data,
                                    width: payload.width,
                                    height: payload.height,
                                    cursor_x,
                                    cursor_y,
                                },
                            )
                            .is_err()
                        {
                            pending_flag.store(false, Ordering::Relaxed);
                        }
                    }
                    in_flight_flag.store(false, Ordering::Relaxed);
                }

                let fps = if moved { cfg.active_fps } else { cfg.idle_fps };
                sleep(Duration::from_millis(1000 / fps.max(1))).await;
                continue;
            }

            sleep(Duration::from_millis(33)).await;
        }
    });

    handle_store.store(Some(Arc::new(ZoomStreamHandle {
        stop,
        config,
        pending,
        task,
    })));
    Ok(())
}

#[tauri::command]
pub fn zoom_frame_consumed() -> Result<(), String> {
    let handle_store = zoom_stream_handle();
    if let Some(existing) = handle_store.load_full() {
        existing.pending.store(false, Ordering::Relaxed);
    }
    Ok(())
}

#[tauri::command]
pub fn set_zoom_stream_config(size: u32, zoom_level: f32) -> Result<(), String> {
    let handle_store = zoom_stream_handle();
    if let Some(existing) = handle_store.load_full() {
        if let Ok(mut cfg) = existing.config.write() {
            cfg.size = size;
            cfg.zoom_level = zoom_level;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn stop_zoom_stream() -> Result<(), String> {
    let handle_store = zoom_stream_handle();
    if let Some(existing) = handle_store.swap(None) {
        existing.stop.store(true, Ordering::Relaxed);
        existing.task.abort();
    }
    Ok(())
}

#[tauri::command]
pub async fn capture_viewport_without_zoom(app: tauri::AppHandle) -> Result<String, String> {
    let _ = app;
    capture_viewport().await
}
