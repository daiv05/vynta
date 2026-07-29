# Changelog

## [1.3.0](https://github.com/daiv05/vynta/compare/vynta-app-v1.2.0...vynta-app-v1.3.0) (2026-07-29)


### Features

* enhance whiteboard and dock ([c3d26d4](https://github.com/daiv05/vynta/commit/c3d26d4a7ef9693c525eecfdf38aab651b405232))
* enhance whiteboard functionality with text styling and dock improvements ([cc330c2](https://github.com/daiv05/vynta/commit/cc330c2394a7033a97ca0a8aee525f324248ec67))
* improve selection handling and add line style controls ([1b911d7](https://github.com/daiv05/vynta/commit/1b911d7f4e0e558ecd8740ab46566c0dcc773356))

## [1.2.0](https://github.com/daiv05/vynta/compare/vynta-app-v1.1.2...vynta-app-v1.2.0) (2026-07-20)


### Features

* **capabilities:** update default capabilities and add mode-windows configuration ([693cf06](https://github.com/daiv05/vynta/commit/693cf0607f6900f779d193176f93358a16428896))
* **cursor:** add border width and fill opacity settings for cursor highlight ([cf356c4](https://github.com/daiv05/vynta/commit/cf356c403ce3af88b29d6e6856313b92ab01efec))
* improvements and bug fixes ([4da23dc](https://github.com/daiv05/vynta/commit/4da23dcbb1d01c9820cf1fc384a10f20655b6bb8))
* **onboarding:** implement onboarding modal and related functionality ([c89966a](https://github.com/daiv05/vynta/commit/c89966a008f2308a314d5dc719d32106df567244))
* refactor and change default app color ([183b584](https://github.com/daiv05/vynta/commit/183b584588ec99e0cfcb4b8d5b4390f2a9680b87))


### Bug Fixes

* **canvas:** clear autoErase timers and maps on cleanup ([1f7e709](https://github.com/daiv05/vynta/commit/1f7e709e93ed18f26714b1151d62dc68ded2524b))
* **cursor:** ensure message loop runs correctly in start_mouse_hook function ([ba6f535](https://github.com/daiv05/vynta/commit/ba6f535fa2ee68a3b0eabad07984316aba4c13cd))
* **dependencies:** add devtools feature to tauri and update CSP settings ([c0e1e1f](https://github.com/daiv05/vynta/commit/c0e1e1f86b1cced3535ce7894fe7bf93606160d2))
* **dxgi:** implement UnmapGuard for safe D3D11 resource unmapping ([f725318](https://github.com/daiv05/vynta/commit/f72531853c386f6df50b9f92d22814924ca74665))
* **gdi:** implement GdiDcGuard for resource management in GDI screenshot capture ([1ed0d62](https://github.com/daiv05/vynta/commit/1ed0d62dc556314ca369d20bb936b03a50d7ab56))
* **magnifier:** add error handling for SetWindowRgn in set_circle function ([a244e16](https://github.com/daiv05/vynta/commit/a244e16e95b49b860ec410c7076465f3f9d406f1))
* **monitor:** manage fallback timer for monitor context retrieval ([a28121c](https://github.com/daiv05/vynta/commit/a28121c2a9076011e6d462eb0452220b3b4bbc6e))
* **monitor:** use scaleFactor from monitorContext for coordinate transformations ([1d235e3](https://github.com/daiv05/vynta/commit/1d235e357385343eb8aa28aa297f6f35d5eb3c20))
* **overlay:** rename handleHideDock to handleCloseOverlay and update functionality ([8d9d159](https://github.com/daiv05/vynta/commit/8d9d1590151d84685d902bb493fd252cb9f07901))
* **persistence:** implement queuePersist function for overlay and settings stores ([463eb79](https://github.com/daiv05/vynta/commit/463eb79d9cd3dfe9de53c5a1470acdf8019bb650))
* **window:** implement mode locking for safe window rebuild and visibility handling ([279d110](https://github.com/daiv05/vynta/commit/279d110d8c15cd5362a0b8fff6c518574fc57637))
* **window:** reassert transparent background for WebView2 and improve window positioning ([f31a580](https://github.com/daiv05/vynta/commit/f31a580a4d99be9ae443b8aba45300d597121618))
* **zoom:** clamp zoom region size to MAX_ZOOM_REGION in capture_zoom_region_raw_sync ([2ee163b](https://github.com/daiv05/vynta/commit/2ee163bc17a18985c7de1112e4e09a8c6a37b11f))
* **zoom:** clear zoom window handle on mode destruction and validate window existence ([0f85f67](https://github.com/daiv05/vynta/commit/0f85f67a1dc5a942d174ae55b3497df4b54066bc))
* **zoom:** convert stop_zoom_stream and freeze_zoom to async for improved handling ([eaad776](https://github.com/daiv05/vynta/commit/eaad77629efecc4b5b2fa558408b3d766a62194f))
* **zoom:** ensure sourceBuffer is set before updating canvas with decoded data ([39486f0](https://github.com/daiv05/vynta/commit/39486f08276b43dee5f62d01abc15d302299baef))
* **zoom:** improve error handling and fallback for zoom backend initialization ([6db3217](https://github.com/daiv05/vynta/commit/6db32174bd5ece2c2b405d9b02f2ef835291fcd6))

## [1.1.2](https://github.com/daiv05/vynta/compare/vynta-app-v1.1.1...vynta-app-v1.1.2) (2026-03-09)


### Bug Fixes

* branch correction for updating to update Cargo.lock ([7ad4895](https://github.com/daiv05/vynta/commit/7ad4895b0c7ab4963995a59e608cdd2906d9d4de))
* magnifier and release please config ([ac7f760](https://github.com/daiv05/vynta/commit/ac7f760df3c5e19b95b00eac8c779be64058452d))
* magnifier motor/mode improvements ([e6c784b](https://github.com/daiv05/vynta/commit/e6c784bf1e40a26cac20b0c8935cafd4c0d00036))
* release please config ([4f2f0ca](https://github.com/daiv05/vynta/commit/4f2f0caff950105f0bcebf9245433b2104ece078))

## [1.1.1](https://github.com/daiv05/vynta/compare/vynta-app-v1.1.0...vynta-app-v1.1.1) (2026-03-09)


### Bug Fixes

* single instance initialization ([04625c8](https://github.com/daiv05/vynta/commit/04625c8ad0c1a19fb78927450a903d58fee71a20))

## [1.1.0](https://github.com/daiv05/vynta/compare/vynta-app-v1.0.0...vynta-app-v1.1.0) (2026-03-06)


### Features

* initial version ([3091bd0](https://github.com/daiv05/vynta/commit/3091bd07c3df0ada6fa82228ae18ce1cc385ae8b))
* initializing ([ceda836](https://github.com/daiv05/vynta/commit/ceda83616a45b36a6ebca0c44d0ce7330e14394a))


### Bug Fixes

* reset app version ([614f31b](https://github.com/daiv05/vynta/commit/614f31bd2f5f8ba8947922f891e021eeaf355f8c))
