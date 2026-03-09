#![allow(non_upper_case_globals)]

use std::sync::atomic::{AtomicBool, AtomicIsize, AtomicU32, Ordering};
use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::Magnification::*;
use windows::Win32::UI::WindowsAndMessaging::*;

const MAG_TIMER_ID: usize = 1;
const MAG_TIMER_MS: u32 = 16;

const WM_MAG_SHOW: u32 = 0x8001;
const WM_MAG_HIDE: u32 = 0x8002;
const WM_MAG_QUIT: u32 = 0x8003;
const WM_MAG_RECONFIGURE: u32 = 0x8004;

static MAG_HOST: AtomicIsize = AtomicIsize::new(0);
static MAG_CHILD: AtomicIsize = AtomicIsize::new(0);
static MAG_THREAD_ID: AtomicU32 = AtomicU32::new(0);
static MAG_RUNNING: AtomicBool = AtomicBool::new(false);

static MAG_SIZE: AtomicU32 = AtomicU32::new(300);
static MAG_ZOOM_BITS: AtomicU32 = AtomicU32::new(0x40000000);
static MAG_IS_CIRCLE: AtomicBool = AtomicBool::new(true);

fn store_zoom(level: f32) {
    MAG_ZOOM_BITS.store(level.to_bits(), Ordering::Relaxed);
}
fn load_zoom() -> f32 {
    f32::from_bits(MAG_ZOOM_BITS.load(Ordering::Relaxed))
}
fn host() -> HWND {
    HWND(MAG_HOST.load(Ordering::Relaxed) as *mut _)
}
fn child() -> HWND {
    HWND(MAG_CHILD.load(Ordering::Relaxed) as *mut _)
}
fn post_mag(msg: u32) {
    let tid = MAG_THREAD_ID.load(Ordering::Relaxed);
    if tid != 0 {
        unsafe {
            let _ = PostThreadMessageW(tid, msg, WPARAM(0), LPARAM(0));
        }
    }
}

pub fn mag_start(size: u32, zoom_level: f32, shape: &str) -> Result<(), String> {
    if MAG_RUNNING.load(Ordering::Relaxed) {
        mag_set_config(size, zoom_level, shape);
        return Ok(());
    }
    MAG_SIZE.store(size, Ordering::Relaxed);
    store_zoom(zoom_level);
    MAG_IS_CIRCLE.store(shape == "circle", Ordering::Relaxed);

    let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();
    std::thread::Builder::new()
        .name("vynta-magnifier".into())
        .spawn(move || unsafe { mag_thread(tx) })
        .map_err(|e| format!("spawn: {e}"))?;
    rx.recv().map_err(|_| "thread died".to_string())?
}

pub fn mag_show() {
    post_mag(WM_MAG_SHOW);
}
pub fn mag_hide() {
    post_mag(WM_MAG_HIDE);
}

pub fn mag_set_config(size: u32, zoom_level: f32, shape: &str) {
    MAG_SIZE.store(size, Ordering::Relaxed);
    store_zoom(zoom_level);
    MAG_IS_CIRCLE.store(shape == "circle", Ordering::Relaxed);
    post_mag(WM_MAG_RECONFIGURE);
}

#[allow(dead_code)]
pub fn mag_stop() {
    post_mag(WM_MAG_QUIT);
}

unsafe fn mag_thread(tx: std::sync::mpsc::Sender<Result<(), String>>) {
    type SetThreadDpiAwarenessContextFn = unsafe extern "system" fn(isize) -> isize;
    let user32 =
        windows::Win32::System::LibraryLoader::LoadLibraryW(windows::core::w!("user32.dll"));
    if let Ok(user32) = user32 {
        let proc = windows::Win32::System::LibraryLoader::GetProcAddress(
            user32,
            windows::core::s!("SetThreadDpiAwarenessContext"),
        );
        if let Some(proc) = proc {
            let set_dpi: SetThreadDpiAwarenessContextFn = std::mem::transmute(proc);
            set_dpi(-4);
        }
    }
    if !MagInitialize().as_bool() {
        let _ = tx.send(Err("MagInitialize failed".into()));
        return;
    }

    let hinstance: HINSTANCE = match GetModuleHandleW(None) {
        Ok(h) => h.into(),
        Err(_) => HINSTANCE(std::ptr::null_mut()),
    };

    let class = windows::core::w!("VyntaMagHost");
    let wc = WNDCLASSEXW {
        cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
        style: CS_HREDRAW | CS_VREDRAW,
        lpfnWndProc: Some(wnd_proc),
        hInstance: hinstance,
        hCursor: LoadCursorW(None, IDC_ARROW).unwrap_or_default(),
        hbrBackground: HBRUSH((COLOR_BTNFACE.0 + 1) as *mut _),
        lpszClassName: class,
        ..Default::default()
    };
    RegisterClassExW(&wc);

    let sz = MAG_SIZE.load(Ordering::Relaxed) as i32;

    let host_hwnd = match CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_LAYERED | WS_EX_TOOLWINDOW,
        class,
        windows::core::w!("VyntaZoom"),
        WS_CLIPCHILDREN | WS_POPUP,
        0,
        0,
        sz,
        sz,
        None,
        None,
        Some(hinstance),
        None,
    ) {
        Ok(h) => h,
        Err(e) => {
            let _ = tx.send(Err(format!("host: {e}")));
            let _ = MagUninitialize();
            return;
        }
    };

    let _ = SetLayeredWindowAttributes(host_hwnd, COLORREF(0), 255, LWA_ALPHA);

    let mag_hwnd = match CreateWindowExW(
        WINDOW_EX_STYLE::default(),
        windows::core::w!("Magnifier"),
        windows::core::w!("MagnifierWindow"),
        WS_CHILD | WS_VISIBLE | WINDOW_STYLE(0x0001),
        0,
        0,
        sz,
        sz,
        Some(host_hwnd),
        None,
        Some(hinstance),
        None,
    ) {
        Ok(h) => h,
        Err(e) => {
            let _ = tx.send(Err(format!("child: {e}")));
            let _ = DestroyWindow(host_hwnd);
            let _ = MagUninitialize();
            return;
        }
    };

    apply_transform(mag_hwnd, load_zoom());

    let mut filter = [host_hwnd];
    let _ = MagSetWindowFilterList(
        mag_hwnd,
        MW_FILTERMODE_EXCLUDE,
        filter.len() as i32,
        filter.as_mut_ptr(),
    );

    if MAG_IS_CIRCLE.load(Ordering::Relaxed) {
        set_circle(host_hwnd, sz as u32);
    }
    MAG_HOST.store(host_hwnd.0 as isize, Ordering::Relaxed);
    MAG_CHILD.store(mag_hwnd.0 as isize, Ordering::Relaxed);
    MAG_THREAD_ID.store(GetCurrentThreadId(), Ordering::Relaxed);
    MAG_RUNNING.store(true, Ordering::Relaxed);

    SetTimer(Some(host_hwnd), MAG_TIMER_ID, MAG_TIMER_MS, None);
    let _ = tx.send(Ok(()));

    let mut msg = MSG::default();
    loop {
        let ret = GetMessageW(&mut msg, None, 0, 0);
        if ret.0 <= 0 {
            break;
        }

        match msg.message {
            m if m == WM_MAG_SHOW => {
                let ex = GetWindowLongW(host_hwnd, GWL_EXSTYLE);
                SetWindowLongW(host_hwnd, GWL_EXSTYLE, ex | (WS_EX_TRANSPARENT.0 as i32));

                let _ = ShowWindow(host_hwnd, SW_SHOWNOACTIVATE);
            }
            m if m == WM_MAG_HIDE => {
                let _ = ShowWindow(host_hwnd, SW_HIDE);

                let ex = GetWindowLongW(host_hwnd, GWL_EXSTYLE);
                SetWindowLongW(host_hwnd, GWL_EXSTYLE, ex & !(WS_EX_TRANSPARENT.0 as i32));
            }
            m if m == WM_MAG_RECONFIGURE => {
                reconfigure(host_hwnd, mag_hwnd);
            }
            m if m == WM_MAG_QUIT => {
                let _ = DestroyWindow(host_hwnd);
                break;
            }
            _ => {
                let _ = TranslateMessage(&msg);
                let _ = DispatchMessageW(&msg);
            }
        }
    }

    MAG_HOST.store(0, Ordering::Relaxed);
    MAG_CHILD.store(0, Ordering::Relaxed);
    MAG_THREAD_ID.store(0, Ordering::Relaxed);
    MAG_RUNNING.store(false, Ordering::Relaxed);
    let _ = MagUninitialize();
}

unsafe extern "system" fn wnd_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_TIMER if wparam.0 == MAG_TIMER_ID => {
            tick();
            LRESULT(0)
        }
        WM_DESTROY => {
            let _ = KillTimer(Some(hwnd), MAG_TIMER_ID);
            PostQuitMessage(0);
            LRESULT(0)
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

unsafe fn tick() {
    let h = host();
    let c = child();
    if h.0.is_null() || c.0.is_null() {
        return;
    }
    if !IsWindowVisible(h).as_bool() {
        return;
    }

    let mut pt = POINT::default();
    if GetCursorPos(&mut pt).is_err() {
        return;
    }

    let size = MAG_SIZE.load(Ordering::Relaxed) as i32;
    let half = size / 2;
    let zoom = load_zoom().max(1.0);

    let src_w = (size as f32 / zoom).round() as i32;
    let src_h = src_w;
    let src_half_w = src_w / 2;
    let src_half_h = src_h / 2;

    let source = RECT {
        left: pt.x - src_half_w,
        top: pt.y - src_half_h,
        right: pt.x - src_half_w + src_w,
        bottom: pt.y - src_half_h + src_h,
    };

    let _ = MagSetWindowSource(c, source);

    let _ = SetWindowPos(
        h,
        Some(HWND_TOPMOST),
        pt.x - half,
        pt.y - half,
        size,
        size,
        SWP_NOACTIVATE,
    );

    let _ = InvalidateRect(Some(c), None, true);
}

unsafe fn apply_transform(mag: HWND, zoom: f32) {
    let mut t = MAGTRANSFORM {
        v: [zoom, 0.0, 0.0, 0.0, zoom, 0.0, 0.0, 0.0, 1.0],
    };
    let ok = MagSetWindowTransform(mag, &mut t);
    eprintln!(
        "[magnifier] MagSetWindowTransform({zoom}) = {}",
        ok.as_bool()
    );
}

unsafe fn set_circle(hwnd: HWND, size: u32) {
    let rgn = CreateEllipticRgn(0, 0, size as i32, size as i32);
    SetWindowRgn(hwnd, Some(rgn), true);
}

unsafe fn set_square(hwnd: HWND) {
    SetWindowRgn(hwnd, None, true);
}

unsafe fn reconfigure(h: HWND, c: HWND) {
    let sz = MAG_SIZE.load(Ordering::Relaxed) as i32;

    let _ = SetWindowPos(
        h,
        None,
        0,
        0,
        sz,
        sz,
        SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE,
    );
    let _ = SetWindowPos(
        c,
        None,
        0,
        0,
        sz,
        sz,
        SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE,
    );

    apply_transform(c, load_zoom());

    if MAG_IS_CIRCLE.load(Ordering::Relaxed) {
        set_circle(h, sz as u32);
    } else {
        set_square(h);
    }
}
