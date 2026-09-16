# Spec gaps — 待确认 / 未绑定

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

## main-home（2026-09-04 @bv-design-bind）

| 项 | 说明 |
|----|------|
| Exit Native loaded | 无独立 main-home 画板；loaded 视觉复用 `ads-common/DS-03` Native 槽 + `NativeAdPlacement.Exit` |
| Exit Native loading | 无独立画板；复用 Native 槽 loading 状态机（同 ads-common） |
| home-native-横屏 | 蓝湖有画板 `home-native-横屏`；Diff 拍板不出横屏专稿，Compose 自适应即可 |
| home-native-更新 | 组合态（Native + 更新条）；静态验收可叠 `main-home/DS-03` + `DS-05` |
| 旧版 home / home-banner | `42014d18`、`0d83696d` 已被较新画板替代（见 `design/cache/main-home/urls_codex`） |
| spec/modules/main-home.md | 尚未 canonical；行为以 Android 仓 `docs/ai/existing-logic/main-home.md` + Diff 为准 |
