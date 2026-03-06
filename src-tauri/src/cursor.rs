use crate::types::CursorPositionPayload;
use std::sync::atomic::{AtomicBool, AtomicI64, AtomicU32, Ordering};
use windows::Win32::Foundation::{LPARAM, POINT, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, GetCursorPos, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
    UnhookWindowsHookEx, MSLLHOOKSTRUCT, WH_MOUSE_LL, WM_MOUSEMOVE, WM_QUIT,
};

static CURSOR_POS: AtomicI64 = AtomicI64::new(0);
static CURSOR_HOOK_RUNNING: AtomicBool = AtomicBool::new(false);
static HOOK_THREAD_ID: AtomicU32 = AtomicU32::new(0);

#[cfg(target_os = "windows")]
unsafe extern "system" fn mouse_hook_proc(
    code: i32,
    w_param: windows::Win32::Foundation::WPARAM,
    l_param: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::LRESULT {
    if code >= 0 && w_param.0 as u32 == WM_MOUSEMOVE {
        let mouse = &*(l_param.0 as *const MSLLHOOKSTRUCT);
        let x = mouse.pt.x as i64;
        let y = mouse.pt.y as i64;
        let packed = (x << 32) | (y & 0xFFFF_FFFF);
        CURSOR_POS.store(packed, Ordering::Relaxed);
    }
    CallNextHookEx(None, code, w_param, l_param)
}

#[cfg(target_os = "windows")]
pub fn start_mouse_hook() {
    if CURSOR_HOOK_RUNNING.swap(true, Ordering::Relaxed) {
        return;
    }

    unsafe {
        let mut point = POINT { x: 0, y: 0 };
        if GetCursorPos(&mut point).is_ok() {
            let x = point.x as i64;
            let y = point.y as i64;
            let packed = (x << 32) | (y & 0xFFFF_FFFF);
            CURSOR_POS.store(packed, Ordering::Relaxed);
        }
    }

    std::thread::spawn(|| unsafe {
        HOOK_THREAD_ID.store(
            windows::Win32::System::Threading::GetCurrentThreadId(),
            Ordering::Relaxed,
        );

        let hook = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook_proc), None, 0);
        let mut msg = std::mem::zeroed();
        while GetMessageW(&mut msg, None, 0, 0).into() {}
        if let Ok(hook) = hook {
            if !hook.0.is_null() {
                let _ = UnhookWindowsHookEx(hook);
            }
        }
        CURSOR_HOOK_RUNNING.store(false, Ordering::Relaxed);
    });
}

#[cfg(target_os = "windows")]
pub fn stop_mouse_hook() {
    let tid = HOOK_THREAD_ID.load(Ordering::Relaxed);
    if tid != 0 {
        unsafe {
            let _ = PostThreadMessageW(tid, WM_QUIT, WPARAM(0), LPARAM(0));
        }
    }
}

pub fn get_cursor_pos_cached() -> Option<CursorPositionPayload> {
    if !CURSOR_HOOK_RUNNING.load(Ordering::Relaxed) {
        return None;
    }
    let packed = CURSOR_POS.load(Ordering::Relaxed);
    let x = (packed >> 32) as i32;
    let y = (packed & 0xFFFF_FFFF) as i32;
    Some(CursorPositionPayload { x, y })
}
