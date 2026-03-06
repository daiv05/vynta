use std::ptr;
use windows::core::Interface;
use windows::Win32::Foundation::{HMODULE, RECT};
use windows::Win32::Graphics::Direct3D::D3D_DRIVER_TYPE_UNKNOWN;
use windows::Win32::Graphics::Direct3D11::*;
use windows::Win32::Graphics::Dxgi::Common::*;
use windows::Win32::Graphics::Dxgi::*;

const DXGI_ERROR_WAIT_TIMEOUT: i32 = 0x887A0027u32 as i32;
const DXGI_ERROR_ACCESS_LOST: i32 = 0x887A0026u32 as i32;

pub struct DxgiDuplicator {
    device: ID3D11Device,
    context: ID3D11DeviceContext,
    duplication: IDXGIOutputDuplication,
    mirror: ID3D11Texture2D,
    staging: Option<ID3D11Texture2D>,
    staging_size: (u32, u32),
    has_valid_mirror: bool,
    pub origin_x: i32,
    pub origin_y: i32,
    pub width: u32,
    pub height: u32,
}

impl DxgiDuplicator {
    pub fn new_for_point(x: i32, y: i32) -> Result<Self, String> {
        unsafe {
            let factory: IDXGIFactory1 =
                CreateDXGIFactory1().map_err(|e| format!("CreateDXGIFactory1: {e}"))?;

            let mut adapter_idx = 0u32;
            loop {
                let Ok(adapter) = factory.EnumAdapters1(adapter_idx) else {
                    break;
                };
                let mut output_idx = 0u32;
                loop {
                    let Ok(output) = adapter.EnumOutputs(output_idx) else {
                        break;
                    };
                    let desc = output.GetDesc().map_err(|e| format!("GetDesc: {e}"))?;
                    let rect = desc.DesktopCoordinates;

                    if x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom {
                        return Self::init(adapter, output, rect);
                    }
                    output_idx += 1;
                }
                adapter_idx += 1;
            }

            let adapter = factory
                .EnumAdapters1(0)
                .map_err(|e| format!("No adapters: {e}"))?;
            let output = adapter
                .EnumOutputs(0)
                .map_err(|e| format!("No outputs: {e}"))?;
            let desc = output.GetDesc().map_err(|e| format!("GetDesc: {e}"))?;
            Self::init(adapter, output, desc.DesktopCoordinates)
        }
    }

    unsafe fn init(
        adapter: IDXGIAdapter1,
        output: IDXGIOutput,
        rect: RECT,
    ) -> Result<Self, String> {
        let mut device = None;
        let mut context = None;

        D3D11CreateDevice(
            &adapter,
            D3D_DRIVER_TYPE_UNKNOWN,
            HMODULE::default(),
            D3D11_CREATE_DEVICE_BGRA_SUPPORT,
            None,
            D3D11_SDK_VERSION,
            Some(&mut device),
            None,
            Some(&mut context),
        )
        .map_err(|e| format!("D3D11CreateDevice: {e}"))?;

        let device = device.ok_or("D3D11 device is None")?;
        let context = context.ok_or("D3D11 context is None")?;

        let width = (rect.right - rect.left) as u32;
        let height = (rect.bottom - rect.top) as u32;

        let mirror_desc = D3D11_TEXTURE2D_DESC {
            Width: width,
            Height: height,
            MipLevels: 1,
            ArraySize: 1,
            Format: DXGI_FORMAT_B8G8R8A8_UNORM,
            SampleDesc: DXGI_SAMPLE_DESC {
                Count: 1,
                Quality: 0,
            },
            Usage: D3D11_USAGE_DEFAULT,
            BindFlags: 0,
            CPUAccessFlags: 0,
            MiscFlags: 0,
        };
        let mut mirror = None;
        device
            .CreateTexture2D(&mirror_desc, None, Some(&mut mirror))
            .map_err(|e| format!("CreateTexture2D mirror: {e}"))?;
        let mirror = mirror.ok_or("CreateTexture2D mirror returned None")?;

        let output1: IDXGIOutput1 = output
            .cast()
            .map_err(|e| format!("Cast to IDXGIOutput1: {e}"))?;
        let duplication = output1
            .DuplicateOutput(&device)
            .map_err(|e| format!("DuplicateOutput: {e}"))?;

        Ok(Self {
            device,
            context,
            duplication,
            mirror,
            staging: None,
            staging_size: (0, 0),
            has_valid_mirror: false,
            origin_x: rect.left,
            origin_y: rect.top,
            width,
            height,
        })
    }

    pub fn contains_point(&self, x: i32, y: i32) -> bool {
        x >= self.origin_x
            && y >= self.origin_y
            && x < self.origin_x + self.width as i32
            && y < self.origin_y + self.height as i32
    }

    fn refresh_mirror(&mut self) -> Result<bool, String> {
        let max_attempts = if self.has_valid_mirror { 1 } else { 20 };
        let mut attempts = 0;

        unsafe {
            loop {
                let mut frame_info = DXGI_OUTDUPL_FRAME_INFO::default();
                let mut resource: Option<IDXGIResource> = None;
                let timeout = if self.has_valid_mirror { 0 } else { 100 };

                let result =
                    self.duplication
                        .AcquireNextFrame(timeout, &mut frame_info, &mut resource);

                match result {
                    Ok(()) => {
                        let resource = resource.ok_or("Resource is None after AcquireNextFrame")?;
                        let desktop_tex: ID3D11Texture2D = resource
                            .cast()
                            .map_err(|e| format!("Cast to ID3D11Texture2D: {e}"))?;

                        self.context.CopyResource(&self.mirror, &desktop_tex);
                        self.has_valid_mirror = true;

                        self.duplication
                            .ReleaseFrame()
                            .map_err(|e| format!("ReleaseFrame: {e}"))?;

                        return Ok(true);
                    }
                    Err(e) if e.code().0 == DXGI_ERROR_WAIT_TIMEOUT => {
                        attempts += 1;
                        if attempts < max_attempts {
                            continue;
                        } else {
                            if self.has_valid_mirror {
                                return Ok(false);
                            }
                            return Err(
                                "Timeout acquiring first frame (no changes on screen)".to_string()
                            );
                        }
                    }
                    Err(e) if e.code().0 == DXGI_ERROR_ACCESS_LOST => {
                        return Err(
                            "DXGI_ERROR_ACCESS_LOST: need to recreate duplicator".to_string()
                        )
                    }
                    Err(e) => return Err(format!("AcquireNextFrame: {e}")),
                }
            }
        }
    }

    pub fn capture_region(
        &mut self,
        local_x: i32,
        local_y: i32,
        region_w: u32,
        region_h: u32,
    ) -> Result<(Vec<u8>, u32, u32), String> {
        self.refresh_mirror()?;

        if !self.has_valid_mirror {
            return Err("No valid mirror frame yet".to_string());
        }

        unsafe {
            if self.staging.is_none() || self.staging_size != (region_w, region_h) {
                let staging_desc = D3D11_TEXTURE2D_DESC {
                    Width: region_w,
                    Height: region_h,
                    MipLevels: 1,
                    ArraySize: 1,
                    Format: DXGI_FORMAT_B8G8R8A8_UNORM,
                    SampleDesc: DXGI_SAMPLE_DESC {
                        Count: 1,
                        Quality: 0,
                    },
                    Usage: D3D11_USAGE_STAGING,
                    BindFlags: 0,
                    CPUAccessFlags: D3D11_CPU_ACCESS_READ.0 as u32,
                    MiscFlags: 0,
                };
                let mut staging_tex = None;
                self.device
                    .CreateTexture2D(&staging_desc, None, Some(&mut staging_tex))
                    .map_err(|e| format!("CreateTexture2D staging: {e}"))?;
                let staging = staging_tex.ok_or("CreateTexture2D staging returned None")?;
                self.staging = Some(staging);
                self.staging_size = (region_w, region_h);
            }

            let staging = self.staging.as_ref().unwrap();

            let intersect_left = local_x.max(0);
            let intersect_top = local_y.max(0);
            let intersect_right = (local_x + region_w as i32).min(self.width as i32);
            let intersect_bottom = (local_y + region_h as i32).min(self.height as i32);

            let copy_w = (intersect_right - intersect_left).max(0) as u32;
            let copy_h = (intersect_bottom - intersect_top).max(0) as u32;

            if copy_w > 0 && copy_h > 0 {
                let src_box = D3D11_BOX {
                    left: intersect_left as u32,
                    top: intersect_top as u32,
                    front: 0,
                    right: intersect_right as u32,
                    bottom: intersect_bottom as u32,
                    back: 1,
                };

                let dst_x = (intersect_left - local_x) as u32;
                let dst_y = (intersect_top - local_y) as u32;

                self.context.CopySubresourceRegion(
                    staging,
                    0,
                    dst_x,
                    dst_y,
                    0,
                    &self.mirror,
                    0,
                    Some(&src_box),
                );
            }

            let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
            self.context
                .Map(staging, 0, D3D11_MAP_READ, 0, Some(&mut mapped))
                .map_err(|e| format!("Map staging: {e}"))?;
            let row_pitch = mapped.RowPitch as usize;
            let pixel_count = (region_w * region_h * 4) as usize;
            let mut rgba = Vec::with_capacity(pixel_count);

            let src_base = mapped.pData as *const u8;
            for row in 0..region_h as usize {
                let row_ptr = src_base.add(row * row_pitch);
                for col in 0..region_w as usize {
                    let px = row_ptr.add(col * 4);
                    let r_i32 = row as i32;
                    let c_i32 = col as i32;
                    let is_valid = r_i32 >= (intersect_top - local_y)
                        && r_i32 < (intersect_bottom - local_y)
                        && c_i32 >= (intersect_left - local_x)
                        && c_i32 < (intersect_right - local_x);

                    if is_valid {
                        rgba.push(ptr::read(px.add(2)));
                        rgba.push(ptr::read(px.add(1)));
                        rgba.push(ptr::read(px.add(0)));
                        rgba.push(255);
                    } else {
                        rgba.extend_from_slice(&[0, 0, 0, 255]);
                    }
                }
            }

            self.context.Unmap(staging, 0);

            Ok((rgba, region_w, region_h))
        }
    }

    pub fn capture_full_frame(&mut self) -> Result<(Vec<u8>, u32, u32), String> {
        self.capture_region(0, 0, self.width, self.height)
    }
}
