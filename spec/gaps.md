# Spec gaps — 待确认 / 未绑定

## settings（2026-09-17 @bv-design-bind）

| 项 | 说明 |
|----|------|
| spec canonical | `spec/modules/settings.md` 仅含设计引用与概要；完整状态机待 `@bv-spec-canonical` 或 `@bv-existing-logic` |
| v1.5.0 引流 App | AI Translate / AI Meeting Notes 等仅墨刀批注；蓝湖 DS-01 Recommend 区为示例 Fire/Roku/TVCast/LG，Compose 按配置动态渲染 |
| Banner loading | 设置页 Banner 无独立 loading 画板；复用 `BannerAdSlot` shimmer（同 ads-common） |
| 旧版 setting | `ab59fea1`、`bb59e025` 已 skip（见 `urls_codex`） |
| Restore Toast | 无 settings 独立 DS；复用 `billing/DS-03` / `DS-03-alt` |

## mirror-flow（2026-09-11 @bv-design-bind）

| 项 | 说明 |
|----|------|
| spec canonical | `spec/modules/mirror-flow.md` 仅含设计引用与概要；完整状态机待 `@bv-spec-canonical` 或 `@bv-existing-logic` |
| DS-02 `miracast` | 启发式映射为 Chromecast/通用参数页；若产品区分 AirPlay 专用页请确认 |
| AirPlay 镜像中 | 蓝湖无手机端「镜像进行中」主画面；Fire/LG/Apple 以参数页 + 系统录屏窗为主 |
| adb教程 | 画板 `e20e2a1a…` 已 skip（v1.2.0 移除 ADB） |
| duplicate 画板 | 旧版 `miracast-lg` / 下载弹窗 / native 变体见 `urls_codex` 末行，未单独 bind |
| Native loading | mirror-flow 无独立 Native loading 画板；复用 `ads-common/DS-03` loading 状态机 |
| 代码路径 | bindings 中 `*.kt` 文件名为 compose-write 占位，工步计划以 plan 为准 |

## troubleshoot（2026-09-30 @bv-design-bind）

| 项 | 说明 |
|----|------|
| Topic IA | 蓝湖 DS-01～03 示例含「About Apple device」等；Compose **Topic 顺序/条目** 跟现网 XML（Topic1/2/8），见 Android `docs/ai/diff/troubleshoot.md` |
| Forgot Password 深链 | DS-02/03 含 Forgot Password 视觉；**不**恢复 `openApplePassword` 连接弹窗深链 |
| 远程排障 | 无 WebView 画板；CFG `url` 非空 → 系统浏览器 |
| 切图 | 步骤插图优先复用现网 `drawable`；按需从 DS-03 schema `imageRef` 补拉 `slices/` |

## app-update（2026-09-30 @bv-design-bind）

| 项 | 说明 |
|----|------|
| Play 系统 UI | FLEXIBLE 下载/安装面板为 Play Core 原生 UI，无蓝湖稿 |
| DS-01 / main-home DS-05 | 同画板 `70584691…`；组件主本 `app-update/DS-01`，整页构图见 `main-home/DS-05` |
| DS-02 | 组合验收态；Native 槽见 `main-home/DS-03` + `ads-common/DS-03` |
| 无 dismiss | 墨刀曾有收起；Diff 拍板仅 RESTART，Compose 勿加关闭手势 |

## main-home（2026-09-04 @bv-design-bind）

| 项 | 说明 |
|----|------|
| Exit Native loaded | 无独立 main-home 画板；loaded 视觉复用 `ads-common/DS-03` Native 槽 + `NativeAdPlacement.Exit` |
| Exit Native loading | 无独立画板；复用 Native 槽 loading 状态机（同 ads-common） |
| home-native-横屏 | 蓝湖有画板 `home-native-横屏`；Diff 拍板不出横屏专稿，Compose 自适应即可 |
| home-native-更新 | 组合态（Native + 更新条）；静态验收可叠 `main-home/DS-03` + `DS-05` |
| 旧版 home / home-banner | `42014d18`、`0d83696d` 已被较新画板替代（见 `design/cache/main-home/urls_codex`） |
| spec/modules/main-home.md | 尚未 canonical；行为以 Android 仓 `docs/ai/existing-logic/main-home.md` + Diff 为准 |
