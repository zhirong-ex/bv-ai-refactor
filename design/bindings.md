# 蓝湖绑定

> 项目：[Miracast GP 设计稿（Zhongnan）](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49)  
> Android 工程：`/Users/lizhirong/boostvision/otherBoostvision/zhongnan.android`  
> 分支：`zhirong/v1.5.4`  
> 维护：**bv-design-bind**（2026-08-25，模块 device-search，Lanhu MCP 拉取）

## 使用说明

- **UI 视觉以蓝湖为准**；流程/状态以 `spec/modules/device-search.md` 为准。
- 画板 deep link 含 `image_id`；本地缓存见 `design/cache/device-search/`。
- `spec alias` 列为 spec 中语义化设计引用，与 `DS-xx` 一一对应。
- 切图按需放入 `design/assets/device-search/`（compose-write 阶段 `lanhu_download_slices`）。

## device-search

| id | spec alias | 模块 | 名称（蓝湖画板） | 蓝湖链接 | 缓存 | feature 路径 | 状态 |
|----|------------|------|------------------|----------|------|--------------|------|
| DS-01 | DS:device-search-main | device-search | device-新增设备 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=9472047f-b527-4a2d-9505-5ba227e6265b) | cache/device-search/DS-01/ | presentation/screen/devicesearch/ | done |
| DS-01-alt | — | device-search | device-连接中（Connecting 变体） | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=89cde083-a62b-4921-aff0-211dbede5e38) | cache/device-search/DS-01/preview-connecting.png | presentation/screen/devicesearch/ui/ConnectingOverlay.kt | done |
| DS-02 | DS:device-search-no-wifi | device-search | device-no wifi | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=135a9da0-0d0f-41e5-9d09-b546cb84acd1) | cache/device-search/DS-02/ | presentation/screen/devicesearch/ui/NoWifiContent.kt | done |
| DS-03 | DS:device-search-no-device | device-search | device-未搜索到设备-native | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=aaccaffc-1b96-44cb-83cd-e5d6f5bae955) | cache/device-search/DS-03/ | presentation/screen/devicesearch/ui/NoDeviceHintRow.kt | done |
| DS-04 | DS:device-search-pin-dialog | device-search | device-pin码 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=4d30634e-cb71-471c-9205-501a523366f3) | cache/device-search/DS-04/ | presentation/screen/devicesearch/ui/PinDialogContent.kt | done |
| DS-05 | DS:device-search-apple-tv-guide | device-search | device- Apple tv提示弹窗 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=60928932-0c3e-49df-b4dc-40ee4ff8b973) | cache/device-search/DS-05/ | presentation/screen/devicesearch/ui/AppleTvGuideDialogContent.kt | done |
| DS-06 | DS:device-search-mac-guide | device-search | device- Mac提示弹窗 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=b7dbd240-8ab9-422e-ab0c-19cd3ced8aec) | cache/device-search/DS-06/ | presentation/screen/devicesearch/ui/MacGuideDialogContent.kt | done |
| DS-07 | DS:device-search-apple-password-guide | device-search | device- Apple tv需要密码弹窗 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=d1c4a842-6f24-4003-bb0c-0562066a47cf) | cache/device-search/DS-07/ | presentation/screen/devicesearch/ui/ApplePasswordGuideContent.kt | done |
| DS-07-alt-mac | — | device-search | device- Mac需要密码弹窗 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=d866e610-4ade-4263-aade-a5ab50171dad) | cache/device-search/DS-07-alt-mac/ | presentation/screen/devicesearch/ui/ApplePasswordGuideContent.kt | done |
| DS-07-alt-other | — | device-search | device- 其它需要密码弹窗 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=5b3f9c12-ddac-43de-b7cd-6d94f7ad9ee1) | cache/device-search/DS-07-alt-other/ | presentation/screen/devicesearch/ui/ApplePasswordGuideContent.kt | done |
| DS-08 | DS:device-search-samsung-pair | device-search | device-sumsung | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=63829a2e-4d33-4826-a76e-d84dab69bf6a) | cache/device-search/DS-08/ | — | **skipped**（Diff 删除，虚连） |
| DS-09 | DS:device-search-native-ad | device-search | device-native | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=8c417000-2a2d-483b-b0fd-c39bee42a5a5) | cache/device-search/DS-09/ | presentation/common/ads/NativeAdSlot*.kt + DeviceSearchScreen | done |
| DS-10 | DS:device-search-banner | device-search | （无独立画板） | — | — | app/.../feature/devicesearch/ | **unbound** |

画板清单 TSV：`design/cache/device-search/urls_codex`

### 画板 ↔ spec 状态对照

| DS-xx | spec 状态 / 场景 |
|-------|------------------|
| DS-01 | `Searching`、`DeviceList`、`Connecting`（列表项含协议标签、已连/未连视觉） |
| DS-01-alt | `Connecting` 加载变体（同 DS-01 目录） |
| DS-02 | `NoWifi` |
| DS-03 | `NoDeviceHint`（10s 无设备或 10s 无操作；Contact Us 外链） |
| DS-04 | `PinDialog`（新 LG、Fire TV、Apple Pin 模式） |
| DS-05 | `AppleTvGuideDialog`（限高 2/3 屏、5s 禁点「知道了」） |
| DS-06 | `MacGuideDialog` |
| DS-07 | `ApplePasswordGuideDialog`（Apple TV 文案/图） |
| DS-07-alt-mac | `ApplePasswordGuideDialog`（Mac 变体） |
| DS-07-alt-other | `OtherAirPlayPasswordGuide` |
| DS-08 | `SamsungPairDialog` |
| DS-09 | 底部 native（受 `CFG:miracast_enable_search_device_native_ad`） |
| DS-10 | Banner（蓝湖无 device-search 独立画板；见 `spec/gaps.md`） |

### 列表项视觉要点（DS-01 子元素，对照蓝湖）

- 每行：设备名称 + 协议标签（最多 1 种，不做多语言）：Miracast / FireTV / Chromecast / WebOS / AirPlay
- 已配对/已连接 vs 未配对：视觉区分（与首页设备状态区域一致）

## ads-common

> 维护：**bv-design-bind**（2026-09-04，模块 ads-common，版本 1.4.2，Lanhu MCP 拉取）  
> Android 工程：`/Users/lizhirong/boostvision/zhongnan/zhongnan1.5.3`  
> 代码路径：`app/.../presentation/common/ads/`

| id | 模块 | 名称（蓝湖画板） | 蓝湖链接 | 缓存 | 代码路径 | 状态 |
|----|------|------------------|----------|------|----------|------|
| DS-01 | ads-common | 插屏 loading | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=6e651d30-8f0a-48db-9c93-e76553d85aac) | cache/ads-common/DS-01/ | presentation/common/ads/InterstitialAdLoadingOverlay.kt | done |
| DS-02 | ads-common | App Open Welcome Back loading | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=eeed56f4-256a-4ec2-9583-a1fa27aedd26) | cache/ads-common/DS-02/ | presentation/common/ads/AppOpenAdLoadingOverlay.kt | done |
| DS-03 | ads-common | Native 槽（device-native） | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=c2da56ea-f017-4951-8269-36e85d4e6b00) | cache/ads-common/DS-03/ | presentation/common/ads/NativeAdSlot*.kt | done |
| DS-04 | ads-common | 首页 Banner 槽 | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=0d83696d-c41d-4d76-9910-f94e3c7a0e8b) | cache/ads-common/DS-04/ | presentation/common/ads/BannerAdSlot.kt | done |
| DS-05 | ads-common | 设置页 Banner 槽 | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=bd7469f1-ab04-4b23-9d7b-17fa07669492) | cache/ads-common/DS-05/ | presentation/common/ads/BannerAdSlot.kt | done |

画板清单 TSV：`design/cache/ads-common/urls_codex`

### 说明

- **版本基准**：1.4.2（DS-02 Welcome Back 为主本；墨刀 v1.4.2）
- **DS-01**：画板「插屏loading」；产品 v1.4.7 增前置 loading，视觉主本仅此画板
- **DS-03**：Native loading 骨架复用槽壳 + 扫光；搜索页 loaded 态另见 device-search **DS-09**（同项目不同 `image_id` 变体）
- **DS-04 / DS-05**：Banner loading 无独立画板；loaded 槽 + Compose shimmer

## billing

> 维护：**bv-design-bind**（2026-09-04，模块 billing，版本 v1.1.3 墨刀「小额付费」，Lanhu MCP 拉取）  
> Android 工程：`/Users/lizhirong/boostvision/zhongnan/zhongnan1.5.3`  
> 代码路径：`app/.../presentation/screen/billing/`、`presentation/common/billing/`

| id | spec alias | 模块 | 名称（蓝湖画板） | 蓝湖链接 | 缓存 | 代码路径 | 状态 |
|----|------------|------|------------------|----------|------|----------|------|
| DS-01 | DS:billing-serious | billing | pro-Serious Version | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=420efee9-aed7-44c2-b79f-4eed66a08311) | cache/billing/DS-01/ | presentation/screen/billing/ui/BillingSeriousContent.kt | todo |
| DS-02 | DS:billing-funny | billing | pro-Funny Version | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=b3ffeeb7-099a-4b0f-a6b7-44ad4a7e1878) | cache/billing/DS-02/ | presentation/screen/billing/ui/BillingFunnyContent.kt | todo |
| DS-02-alt | DS:billing-funny-loading | billing | pro-Funny Version-loading | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=d4555d86-bbcb-4ce9-b8f3-03626cea1482) | cache/billing/DS-02-alt/ | presentation/screen/billing/ui/BillingPurchaseButton.kt | todo |
| DS-02-page-loading | — | billing | pro-loading | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=2775abcd-f4ac-4c9a-9d34-78d557e32c7c) | cache/billing/DS-02-page-loading/ | presentation/screen/billing/ui/BillingFunnyContent.kt | todo |
| DS-03 | DS:billing-restore-success | billing | Restore succeed | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=6dbaae1c-90c9-4eae-a48e-9c10bb2b52cb) | cache/billing/DS-03/ | presentation/common/billing/BillingRestoreResultToast.kt | todo |
| DS-03-alt | DS:billing-restore-failed | billing | Restore failed | [画板](https://lanhuapp.com/web/#/item/project/detailDetach?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=6c99e20a-2656-437a-a9fe-5232288298cc) | cache/billing/DS-03-alt/ | presentation/common/billing/BillingRestoreResultToast.kt | todo |

画板清单 TSV：`design/cache/billing/urls_codex`

### 画板 ↔ 场景对照

| DS-xx | 场景 / CFG |
|-------|------------|
| DS-01 | `miracast_remove_ad_page_style` → SERIOUS；TV 卖点列表 + 一次性付费按钮 |
| DS-02 | style → FUNNY；汉堡插画 + `string_one_hamburger_of` |
| DS-02-alt | ProductDetails 未返回：购买钮 loading（FUNNY 沙漏 overlay） |
| DS-02-page-loading | FUNNY 整页 loading 辅本（`pro-loading`） |
| DS-01 loading | 无独立画板：SERIOUS 购买钮内 `icon_refresh` 旋转 700ms + disabled |
| DS-03 / DS-03-alt | Restore 结果 Toast（设置 / 购买页）；700ms 后展示 |

### 共用 chrome（两风格）

- 顶栏：关闭 `icon_close`（禁系统返回）；右上 `Restore`（`string_restore` / `string_restore_purchase`）
- 购买钮：`#1F2123` + 阴影 `#4990E780`；价格返回后启用

## main-home

> 维护：**bv-design-bind**（2026-09-04，模块 main-home，版本 1.4.2+，Lanhu MCP 拉取）  
> Android 工程：`/Users/lizhirong/boostvision/zhongnan/zhongnan1.5.3`  
> 代码路径：`app/.../presentation/screen/mainhome/`  
> 用户入口链接：`miracast-native`（`9cebac73…`）→ **DS-03**

| id | spec alias | 模块 | 名称（蓝湖画板） | 蓝湖链接 | 缓存 | 代码路径 | 状态 |
|----|------------|------|------------------|----------|------|----------|------|
| DS-01 | DS:main-home-main | main-home | home | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=296a1ad3-5730-43c0-96a7-4bc02ec7af4f) | cache/main-home/DS-01/ | presentation/screen/mainhome/ | todo |
| DS-02 | DS:main-home-banner | main-home | home-banner | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=69b1afe3-1ba3-4e5d-b694-74932bf20314) | cache/main-home/DS-02/ | MainHomeScreen + BannerAdSlot（槽见 ads-common DS-04） | todo |
| DS-03 | DS:main-home-native | main-home | miracast-native | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=9cebac73-316a-4750-9807-6ae64f076ac0) | cache/main-home/DS-03/ | MainHomeScreen + NativeAdSlot（placement Home） | done |
| DS-04 | DS:main-home-native-loading | main-home | home-native-loading | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=029da343-5216-4ee1-8128-c57147789d92) | cache/main-home/DS-04/ | presentation/common/ads/NativeAdSlot.kt | done |
| DS-05 | DS:main-home-update-bar | main-home | 更新 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=70584691-a642-4198-a7eb-059bdfda0c4d) | cache/main-home/DS-05/ | presentation/screen/mainhome/ui/UpdateRestartBar.kt | todo |

画板清单 TSV：`design/cache/main-home/urls_codex`

### 画板 ↔ 场景对照

| DS-xx | 场景 / CFG |
|-------|------------|
| DS-01 | 首页主视觉：顶栏（设置/去广告/搜索）+ 设备区 + 镜像 CTA；无 Banner/Native 底栏 |
| DS-02 | `miracast_enable_home_page_banner_ad` 开且 Native 关；整页含 Banner 底栏 |
| DS-03 | `miracast_enable_home_page_native_ad` 开；Home Native loaded；Banner 互斥隐藏 |
| DS-04 | Home Native loading 骨架（#E9F3FB）；CTA 底边距随 Native 占位 |
| DS-05 | FLEXIBLE 更新下载完成条；点击 RESTART（`Updater.startRestartAndUpdate`） |

### 跨模块引用

- **Banner 槽组件**：`ads-common/DS-04`（`BannerAdSlot.kt`）；DS-02 为整页构图主本
- **Exit Native**：无独立 main-home DS；loaded/loading 复用 `ads-common/DS-03` + `NativeAdPlacement.Exit`（见 `spec/gaps.md`）
- **设备连接态图标**：与 device-search **DS-01** 说明一致（已连/未连 selected 态）

## mirror-flow

> 维护：**bv-design-bind**（2026-09-11，模块 mirror-flow，Lanhu MCP 拉取）  
> Android 工程：`/Users/lizhirong/boostvision/zhongnan/zhongnan1.5.3`  
> 代码路径：`app/.../presentation/screen/mirrorflow/`

| id | spec alias | 模块 | 名称（蓝湖画板） | 蓝湖链接 | 缓存 | 代码路径 | 状态 |
|----|------------|------|------------------|----------|------|----------|------|
| DS-01 | DS:mirror-flow-tutorial | mirror-flow | Tutorial | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=957b6771-2436-4d9e-940d-bf97f609efa6) | cache/mirror-flow/DS-01/ | presentation/screen/mirrorflow/ | todo |
| DS-01-unfold | DS:mirror-flow-tutorial-unfold | mirror-flow | Tutorial-unfold | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=558c4ca6-b861-4ca5-825d-3d1813e5afd0) | cache/mirror-flow/DS-01-unfold/ | presentation/screen/mirrorflow/ui/TutorialContent.kt | todo |
| DS-02 | DS:mirror-flow-prep-generic | mirror-flow | miracast | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=8dde88e4-2af0-43c1-9679-85d9a27e3490) | cache/mirror-flow/DS-02/ | presentation/screen/mirrorflow/ui/BeforeMirrorGenericContent.kt | todo |
| DS-03 | DS:mirror-flow-prep-lg | mirror-flow | miracast-lg | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=4719a634-1554-40a1-a15c-19f08e5eaac6) | cache/mirror-flow/DS-03/ | presentation/screen/mirrorflow/ui/BeforeMirrorLgContent.kt | todo |
| DS-03-alt-touch | DS:mirror-flow-prep-lg-touch | mirror-flow | miracast-lg-touch | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=096b122f-5693-4b98-8252-eb795b56eb4f) | cache/mirror-flow/DS-03-alt-touch/ | presentation/screen/mirrorflow/ui/BeforeMirrorLgContent.kt | todo |
| DS-04 | DS:mirror-flow-prep-fire | mirror-flow | fire tv | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=61937fe9-735d-4a74-9dca-c31ccee62045) | cache/mirror-flow/DS-04/ | presentation/screen/mirrorflow/ui/BeforeMirrorFireContent.kt | todo |
| DS-04-alt-gray | DS:mirror-flow-prep-fire-gray | mirror-flow | fire tv-置灰 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=5f8dea09-987c-4bb1-8b74-3d1d3176f7c4) | cache/mirror-flow/DS-04-alt-gray/ | presentation/screen/mirrorflow/ui/BeforeMirrorFireContent.kt | todo |
| DS-04-alt-v2 | — | mirror-flow | fire tv2 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=f1ca79bd-d036-4a3c-9f6d-53293eadbcdb) | cache/mirror-flow/DS-04-alt-v2/ | presentation/screen/mirrorflow/ui/BeforeMirrorFireContent.kt | todo |
| DS-05 | DS:mirror-flow-active-web | mirror-flow | web | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=d785631c-1e36-4ae5-8497-72f344286fd1) | cache/mirror-flow/DS-05/ | presentation/screen/mirrorflow/ui/MirrorWebContent.kt | todo |
| DS-05-alt-volume | DS:mirror-flow-active-web-volume | mirror-flow | web-音量 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=33d6e7b8-e654-41fe-b481-1a42251ca9cb) | cache/mirror-flow/DS-05-alt-volume/ | presentation/screen/mirrorflow/ui/MirrorWebContent.kt | todo |
| DS-06 | DS:mirror-flow-loading | mirror-flow | mirror_loading | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=38f49f18-b99b-47fb-ab35-875814bb4620) | cache/mirror-flow/DS-06/ | presentation/screen/mirrorflow/ui/MirrorLoadingOverlay.kt | todo |
| DS-06-alt | — | mirror-flow | miracast-loading | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=92217760-b637-44d6-b533-2540b3ff4894) | cache/mirror-flow/DS-06-alt/ | presentation/screen/mirrorflow/ui/MirrorLoadingOverlay.kt | todo |
| DS-07 | DS:mirror-flow-dialog-lg-switch | mirror-flow | miracast-lg-弹窗 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=84493a88-f2ab-446a-a10d-8c784f44e660) | cache/mirror-flow/DS-07/ | presentation/screen/mirrorflow/ui/LgSwitchMirrorDialog.kt | todo |
| DS-08 | DS:mirror-flow-dialog-fire | mirror-flow | fire tv弹窗 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=d19143cc-5040-47a3-a7e9-63a399c95fdb) | cache/mirror-flow/DS-08/ | presentation/screen/mirrorflow/ui/FireTvMirrorDialog.kt | todo |
| DS-09 | DS:mirror-flow-dialog-download | mirror-flow | miracast-下载提示弹窗 | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=3128b6fd-53ea-44bc-b42e-2a3a1550f002) | cache/mirror-flow/DS-09/ | presentation/screen/mirrorflow/ui/DownloadReceiverDialog.kt | todo |
| DS-10 | DS:mirror-flow-record-remind | mirror-flow | record_remind | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=f2fd8045-e0fc-4229-9102-e7476c6de46c) | cache/mirror-flow/DS-10/ | presentation/screen/mirrorflow/ui/RecordRemindDialog.kt | todo |
| DS-11 | DS:mirror-flow-native-tutorial | mirror-flow | miracast-native | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=f03b1ddd-66b0-4a09-b2e1-bda4abc606ea) | cache/mirror-flow/DS-11/ | NativeAdSlot + TutorialScreen | todo |
| DS-12 | DS:mirror-flow-native-lg | mirror-flow | miracast-lg-native | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=2967c8ed-4c1c-4bca-912f-4485ead8c308) | cache/mirror-flow/DS-12/ | NativeAdSlot + BeforeMirrorLgContent | todo |
| DS-13 | DS:mirror-flow-native-fire | mirror-flow | fire tv-native | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=63f4cd48-96e1-4224-af86-3e39143f9629) | cache/mirror-flow/DS-13/ | NativeAdSlot + BeforeMirrorFireContent | todo |
| DS-14 | DS:mirror-flow-native-cast-start | mirror-flow | google cast-start-native | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=a198efa7-9385-4a0f-a866-532c25f033a5) | cache/mirror-flow/DS-14/ | NativeAdSlot + BeforeMirrorGenericContent | todo |
| DS-15 | DS:mirror-flow-native-cast-stop | mirror-flow | google cast-stop-native | [画板](https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49&image_id=5d1e0c58-e403-48e2-812d-fc7b68613aa9) | cache/mirror-flow/DS-15/ | NativeAdSlot + BeforeMirrorGenericContent | todo |

画板清单 TSV：`design/cache/mirror-flow/urls_codex`

### 画板 ↔ 场景对照

| DS-xx | 场景 / 说明 |
|-------|-------------|
| DS-01 / DS-01-unfold | 镜像教程；Go Mirroring → 参数页 |
| DS-02 | Chromecast / Android TV 等通用参数页（画质 + 音量开关 + Start/Stop） |
| DS-03 / DS-03-alt-touch | LG webOS 参数页（touch 为交互变体） |
| DS-04 系列 | Fire TV 参数页；置灰 = Start 不可用；fire tv2 为辅本 |
| DS-05 / DS-05-alt-volume | WebMirror 镜像中控制 + 音量条 |
| DS-06 / DS-06-alt | 点击 Start 后 loading overlay（mirror_loading 主本） |
| DS-07 | LG 不支持自研镜像 → 切换系统镜像提示 |
| DS-08 | Fire TV 配对/安装相关弹窗 |
| DS-09 | TV 端 Receiver 下载提示（蒙层） |
| DS-10 | 录屏/录音权限提醒 |
| DS-11–DS-15 | 教程/参数页 Native 槽（loaded）；槽组件见 `ads-common/DS-03` |

### 跨模块引用

- **Native 槽组件**：`ads-common/DS-03`（`NativeAdSlot.kt`）；DS-11–15 为各页整页构图主本
- **Stop 插屏**：无独立 mirror-flow DS；行为见 spec + `ads-common/DS-01`
- **AirPlay 镜像中 UI**：蓝湖无独立「镜像中」手机页（通知栏回前台）；见 `spec/gaps.md`
