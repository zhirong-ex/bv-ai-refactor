# bv-existing-logic 扫描清单

在 `app/src/main/java|kotlin` 与 `**/src/main/res/xml/remote_config*.xml` 内 Grep（不要扫 `build/`）。

## 配置

- `ConfigManager.getBoolean|getLong|getString`
- `UniversalConfigUpdateManager`
- `remote_config_defaults.xml` 全部 `<key>`

## 广告

- `AdManager` / `InterstitialAdManager` / `NativeAdManager` / `AppOpenAdManager`
- `miracast_enable_*_ad`、`triggerTryToShowAd`、`triggerTryToLoadAd`
- VIP / Test Lab 关广告：`BillingManager.isVip`、`isTestLab`

## 广告 ↔ 去广告购买（必写 ads-billing.md）

- `enableAd` 公式 vs `BillingManager.isEnable()` / `isVip()`（两套开关正交后再互斥）
- 购买入口显隐：首页 / 设置 / 教程；Restore 与 VIP
- 弹窗：`BillingActivity.enqueueToPopup` vs 插屏 / Open Ad / GDPR
- VIP 跳过 GDPR；开屏倒计时 VIP 2s vs CFG 秒
- 购买成功当次广告是否仍在 show；IAP 晚于冷启动的竞态
- SKU 是一次性去广告还是周期订阅（以代码为准，勿想当然）

## 连接

- `VirtualConnectManager.connect|disconnect`
- `needRealConnectDeviceBrands` vs `enableDeviceBrands` vs 虚连接
- 5s 连接超时、`REQUIRE_PAIRING`、Apple PIN
- `UniversalDeviceControl`、`PrivateDeviceSearchManager`

## Cast / Mirror

- `MirrorManager` / `MirrorImpl` / `mirrorImpl/*`
- `enableMirrorBrands`；非镜像 brand → `MiracastController.goToMiracastSetting`
- `CastOptionsProvider` Receiver ApplicationId
- `MirrorQualityManager`、录屏 `CaptureManager`、`REQUEST_CAPTURE_CODE`
- 超时：`WAIT_WEB_MIRROR_SUCCESS_TIME_OUT`、`WAIT_GOOGLE_MIRROR_SUCCESS_TIME_OUT`

## 升级

- `Updater.checkUpdate`、Play Core FLEXIBLE、`sp_latest_version`

## 引流

- `miracast_settings_promotion_order`、`getRecommendAppList`
- `UniversalConstant.to*Link`、`queries` 包名
- Fire 接收端下载弹窗 / Amazon countdown

## 设置 / 会员

- `SettingActivity` 项：隐私、条款、评分、Restore、排障、去广告
- `BillingManager` SKU、`miracast_enable_purchase_remove_ad`

## 弹窗门禁

- `AppPopQueue`、`PopPriority` 注释序：GDPR > Rate > Billing > 插屏≈开屏 > 升级

## 埋点

- `Statistics.logEvent("` 收集事件名；与 registry `EVT:` 对齐（若有）
- `Statistics.logEvent(event|logVal|it)`：追踪变量来源，展开动态品牌/页面映射
- 直接 `AnalyticsManager.logEvent`、`uploadGDPRPurposeConsentString`
- 注释调用单列，禁止混入当前有效事件
- 每个事件尽量写参数 key、枚举值、触发时机与源文件

## 持久化 / Manifest

- `CommonSPUtil`、`SPUtils(`、所有 `SP_*` key
- Room `databaseBuilder`、DB/表名、是否参与 UI
- Manifest permissions、queries、Activity、Service、receiver、metadata、App Link
- 对照设置引流 catalog 与 `<queries>`，找缺包

## 屏幕适配（必写 screen-adaptation.md）

- Manifest：`resizeableActivity`、`screenOrientation`、是否有 `layout-land` / `sw600dp`
- `ORIENTATION_PORTRAIT` 守卫：哪些 Activity 横屏不 init
- `setDecorFitsSystemWindows` / `WindowInsets` / `windowStatusBarHeight` / `windowNavigationBarHeight` / SP 缓存
- 手势导航 vs 三键（`navigation_mode`）
- Native `aspectRatio` 横竖模板（素材方向 ≠ 设备方向）
- 与 Compose `WindowSizeClass` 对照：现状有无 Compact/Expanded

## Git 历史（必写 git-history.md）

在 Android 工程根：`git fetch --all --tags`（只读历史，不改业务代码）。

- 根目录 `ChangeLog` 版本线
- `git log` 筛选：crash/崩溃、revert、hotfix、Billing/SKU、GDPR、开屏/插屏/Native、AirPlay、timeout、FGS、onBackPressed、issues/N
- submodule `sync xxx [理由]` 的方括号 → SDK 契约，写入对应域「不得回退」
- 不要把 1000+ 提交全文抄进文档；只留重构回归点

## 脏代码（必写入 known-gaps.md）

对照 spec / 蓝湖 / registry / ChangeLog，标出 **不迁** 项：

- 已注释的 `logEvent`、死方法、未使用 SP
- ChangeLog 已删除的功能残留（引流包、开关）
- 无 PRD、无蓝湖控件、无 CFG/EVT、用户不可达

**不要**把「PRD 漏写的现网路径」标成脏代码。

## 冲突核验

- `PopPriority` 注释 vs 实际数值和队列排序方向
- Remote Config 默认值大小写/空格 vs 解析代码
- Cursor 索引文件 vs 磁盘可读文件 / `git ls-files`
- “订阅”命名 vs 实际 SKU 类型
