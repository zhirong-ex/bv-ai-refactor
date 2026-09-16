---
name: bv-existing-logic
description: >-
  从现有 Android 工程反查业务逻辑：现网路径为主本；PRD/蓝湖/埋点/配置辅助剔除脏代码。Use when
  @bv-existing-logic, 现有逻辑, 现有代码梳理, code inventory, reverse engineer
  Android, or before spec/work-plan/compose when legacy wiring must be documented.
---

# bv-existing-logic — 现有代码逻辑梳理

流水线 **Phase 3.5**（`bv-table-sync` 之后、`bv-design-bind` / `bv-spec-canonical` 对照之前）。目录：`@bv-index`。  
**本 skill 是唯一允许为「写现有逻辑文档」而通读 Android 业务代码的步骤。**

后续 skill **不得**再现场反查代码补需求：只读本步产物。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 目标

把遗留 Activity / Manager / SDK 编排写成 **重构的行为主本**（bv-work-plan / bv-compose-write **必须跟这份走**）：

- **保留并实现**：现网可走路径、仍读取的 CFG、仍上报的 EVT、git-history 回归点（**PRD 没写也要做**）
- **待重写**：XML / LiveData → Compose 分层
- **辅本清脏**：对照墨刀、蓝湖、registry。注释/不可达/已下线/三无（无 PRD、无稿、无 CFG/EVT）标进 `known-gaps.md` 脏代码，compose **不迁**
- **墨刀多出的能力**：默认不加，记 gaps（新产品）

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| Android 工程根 | 是 | 含 `app/src/main/` |
| 模块列表 | 建议 | 与 `spec/modules/` / pipeline `modules` 对齐；缺省按下方域映射 |
| registry | 否 | 有则给 CFG/EVT 打 ID；无则只写代码里的 key |

## 输出

主本：**Android 工程** `docs/ai/existing-logic/`（与 plan/gate 同仓）。  
若存在 Spec 仓：同步副本到 `{specRepo}/spec/existing-logic/`。

```text
docs/ai/existing-logic/
  README.md                 # 进程图、模块映射、入口表
  main-home.md              # 首页、导航、Deeplink、退出
  config.md                 # 远程配置键 + 默认值 + 读取入口
  ads.md
  ads-billing.md            # 广告 ↔ 去广告购买（VIP）冲突，必写
  billing.md                # SKU、购买、Restore、埋点
  device-search.md          # 搜索 + 连接
  mirror-flow.md            # Cast / Mirror / 教程页
  settings.md               # 设置 + 引流
  app-update.md
  splash-loading.md         # 开屏 / GDPR / App Open
  troubleshoot.md
  _crosscut.md              # 弹窗队列、Billing、IoT、埋点入口
  analytics.md              # 全部有效/动态/注释埋点，必写
  storage-manifest.md       # SP、DB、权限、组件、Deeplink
  iot-discovery.md          # IoT 扫描与设备遥测边界
  screen-adaptation.md      # 横竖屏、inset、系统栏、广告横竖模板，必写
  git-history.md            # 提交/ChangeLog 筛选后的重构回归点，必写
  known-gaps.md             # 代码/注释/配置冲突
```

只输出 **当前磁盘上真实存在且可读取** 的源码。用 `git ls-files` 区分已跟踪代码与未提交草稿；两者若都在磁盘则分别标注。Cursor 索引里存在、但磁盘不可读的 `feature/` 文件 **不算** 现有逻辑。

## 读取范围（Android 纪律）

**只读**：

- `app/src/main/java|kotlin/**`、`AndroidManifest.xml`、`app/build.gradle*`
- `app/src/main/res/xml/remote_config*.xml`、`values/**` 中配置/广告相关
- 业务相关 library 模块的 **Kotlin/Java 门面**（如 `market.android` 的 `ConfigManager`）— 只读编排 API，不读实现细节堆

**不读**：NDK/`.so`/`build/`/`.gradle/`/大图；未点名 native 时不打开 `jni/`。

## 域 → 模块映射（默认 zhongnan）

| 域 | 文档文件 | 遗留入口 | Compose 模块 |
|----|----------|----------|--------------|
| 开屏/GDPR/Open Ad | `splash-loading.md` | `MainActivity`、`GDPRUtil`、`AppOpenAdManager` | splash-loading |
| 设备搜索/连接 | `device-search.md` | `ConnectActivity`、`VirtualConnectManager`、`ConnectViewModel` | device-search |
| Cast / Mirror | `mirror-flow.md` | `BeforeMirrorActivity`、`MirrorActivity`、`MirrorManager`、`mirrorImpl/*` | mirror-flow |
| 广告 | `ads.md` | `ads/*`、`UniversalConfigUpdateManager` 广告开关 | ads |
| 广告↔购买 | `ads-billing.md` | `AdManager.enableAd` × `BillingManager.isVip/isEnable`、弹窗队列 | ads + settings |
| 设置 / 引流 | `settings.md` | `SettingActivity`、`getRecommendAppList`、`UniversalConstant` store 链 | settings |
| 升级 | `app-update.md` | `Updater` | app-update |
| 排障 | `troubleshoot.md` | `TroubleshootActivity`、`universal_mirror_troubleshoot_website` | troubleshoot |
| 配置 | `config.md` | `ConfigManager`、`remote_config_defaults.xml` | 横切 |
| Billing | `billing.md` | `BillingManager`、`BillingActivity`、Restore | ads + settings |
| 弹窗/会员/IoT | `_crosscut.md` | `popupQueue`、`BillingManager`、`IotDiscovery`、`Statistics` | 横切 |
| 屏幕适配 | `screen-adaptation.md` | `AbstractBaseActivity`、inset、`resizeableActivity`、Native 横竖模板 | 横切 |
| Git 回归 | `git-history.md` | `ChangeLog` + `git log` 筛选的线上修复/SDK 约束 | 横切 |

Gradle 模块：`connect.android` / `gogolecast.sender` / `airplay.mirror.sender` / `firetv` / `webmirror.android` / `capture.android` 视为 **SDK 边界**，文档只记「谁调用、会话何时起止」，不复述 native。

扫描清单见 [references/scan.md](references/scan.md)。

## 工作流

1. 定位 `app` 模块；`find` 列出 `*.kt`/`*.java`；读 `AndroidManifest` Activity 图。
2. 从 `Application.onCreate` 画初始化顺序。
3. 按上表逐域：入口 → 状态机 → 配置键 → 埋点名 → SDK 调用 → 弹窗/广告插入点。
4. 每模块写清 **保留 Manager** vs **将替换的 UI**。
5. 全工程收集 `Statistics.logEvent` 与直接 `AnalyticsManager` 调用，按 **有效静态 / 动态名称 / 已注释** 分类写 `analytics.md`，不得只写“节选”。
6. 收集 SP key、Room DB、Manifest 权限/组件/queries/metadata 写 `storage-manifest.md`。
7. 注释与实现、默认值与解析、模块间时序冲突、**脏代码清单** 写 `known-gaps.md`。
8. 若已有 `spec/modules/` 或 `registry/`：差异同步写入 `{specRepo}/spec/gaps.md`。
9. 更新 `docs/ai/existing-logic/README.md` 索引、源码文件数、日期与覆盖结论。

## 模块文档模板

```markdown
# <模块> — 现有逻辑

> 遗留入口：`…`
> Compose 目标：`presentation/screen/<模块包名>/`（domain/data 按职责）
> 梳理日期：YYYY-MM-DD

## 用户路径
1. …

## 状态机
| 状态 | 触发 | 下一状态 | 代码 |

## 编排入口（保留）
- `FooManager.bar()` — 作用

## UI（待 Compose 替换）
- Activity / Dialog / LiveData

## 配置 CFG
- `CFG:key` — 默认值 — 读取函数

## 埋点 EVT
- `event` — 触发

## 广告 / 弹窗插入点
- 何时 load / show；PopPriority

## 品牌 / 设备分支
- 哪些 brand 真连接 / 虚连接 / 可镜像 / 走系统 Miracast

## 重构约束
- 必须经 Repository 包一层的 SDK
- 禁止在 Composable 内直调的 API
- 脏代码（见 known-gaps）：不迁
```

## 禁止

- 按墨刀删减或改写现网行为（冲突记 gaps，文档仍写代码事实）
- 为补文档去读 `.so` / CMake
- 把未提交的 Compose 草稿当成遗留真相
- 在本步改业务代码（只写 `docs/ai/existing-logic/` 与可选 `spec/existing-logic/`）

## 下一步

→ **bv-work-plan / bv-compose-write**：行为以本目录 + `git-history.md` 为准  
→ **bv-spec-canonical**：墨刀进 spec 作 UI/信息架构辅本；冲突进 `gaps.md`，默认跟代码
