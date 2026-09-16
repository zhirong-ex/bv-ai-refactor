---
name: bv-debug-console
description: >-
  INTERNAL 调试台（Debug Console）与飞书测试 Firebase 配置表运行时同步。Use when
  @bv-debug-console, Debug Console, INTERNAL 调试, 飞书测试配置 Sync,
  test_firebase_configs, FeishuTestConfigSync, App Info 入口, Jenkins -fu/-fkc/-fvc。
---

# bv-debug-console — INTERNAL 调试台

横切 skill，**不在 Compose 重构主链**。为 **internal 测试包** 提供全屏 Debug Console（埋点 / 配置 / 广告 / 订阅 / 日志），以及 **与 Jenkins 打包一致的飞书测试表 Sync**。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

主链包布局是 `presentation/`；本 skill 历史路径可用 `feature/debug/`，新工程优先 `presentation/debug/`。

**详细规范**：[references/debug-console.md](references/debug-console.md)

## 何时使用

| 场景 | 动作 |
|------|------|
| 新工程首次接入 Debug Console | 按 reference 建 `feature/debug/`、接线、Gradle BuildConfig |
| Config Sync 与表格不一致 | 查 URL/列是否来自 Jenkins BuildConfig，禁止硬编码 B/F |
| 列表顺序与表格不符 | 全链路 `LinkedHashMap`，UI 禁止 `sortedBy { key }` |
| 凭证 / CI | 飞书 secret 仅 local.properties 或 Jenkins Credentials，**禁止进 Git** |
| 扩展 Tab 或调试能力 | 仅 `BuildConfig.INTERNAL == true` 分支；不改 platform 菜单文案 |

## 硬规则

1. **仅 INTERNAL**：`BuildConfig.INTERNAL == true`；正式包 `normal` 不含凭证、不含 Sync 能力。
2. **入口**：platform `TesterMenu` 保持 **App Info** 文案不变；app 层 `AbstractBaseActivity` 将 `APP_INFO` 接到 `DebugConsoleActivity`。
3. **禁止改 platform**（除已约定接线外）：菜单名、Events 对话框等留在 platform。
4. **飞书表 URL / Key列 / Value列**：与 `scripts/build.py -fu/-fkc/-fvc` 一致，编译进 `BuildConfig`；**禁止**在 Kotlin 硬编码 B/F 或固定表 URL。
5. **飞书凭证**：`FEISHU_TEST_APP_ID/SECRET` 来自 `local.properties` 或 Jenkins Environment；**禁止**源码 / 脚本 / example 文件明文 secret。
6. **解析对齐** `scripts/testFBconfigs.py`：跳过首行表头；trim key；value 列不足视为空串。
7. **顺序**：拉取 → 存储 → 展示均用 **`LinkedHashMap`**，Config Tab **按表格行序**展示，不按 key 字母序。
8. **Config 展示**：有本地测试配置时展示 **`ConfigManager.getAll()` 全部 key**；无本地文件时展示 curated miracast 项 + Firebase 生效值对比。
9. **日志**：feature 内用 **`AppLog`**（INTERNAL 才输出）；platform `Logger` 不在本 skill 范围改。
10. **HUD 已移除**：边测边看埋点用 Events Tab 或 TesterMenu → Events。

## Android 包结构（app 单模块）

```text
app/.../feature/debug/
  model/          DebugTab, ConfigDebugItem
  data/           DebugEventNotifier, DebugSnapshotRepository, FeishuTestConfigSyncRepository
  ui/             DebugConsoleActivity, DebugConsoleScreen
  ui/tabs/        Events, Config, Ads, Billing, Logs, System
```

## BuildConfig 字段（internal flavor）

| 来源 | BuildConfig |
|------|-------------|
| Jenkins `-fu` → `-P FeishuTestSheetUrl` | `FEISHU_TEST_SHEET_URL` |
| Jenkins `-fkc` → `-P FeishuTestKeyColumn` | `FEISHU_TEST_KEY_COLUMN` |
| Jenkins `-fvc` → `-P FeishuTestValueColumn` | `FEISHU_TEST_VALUE_COLUMN` |
| `local.properties` / Jenkins Credentials | `FEISHU_TEST_APP_ID`, `FEISHU_TEST_APP_SECRET` |

Gradle 读取优先级：`local.properties` → 环境变量 → Gradle `-P`（表 URL/列以 `-P` 为准，见 reference）。

## 关键接线

| 位置 | 职责 |
|------|------|
| `AbstractBaseActivity` | INTERNAL 时 App Info → DebugConsoleActivity |
| `Statistics` | INTERNAL 埋点后 `DebugEventNotifier` 刷新 Events |
| `ConfigManager` | `applyRuntimeTestConfigs` / `clearRuntimeTestConfigs`；`LinkedHashMap` 存测试配置 |
| `scripts/build.py` | 打包拉表 → assets + 向 Gradle 传 `-P FeishuTest*` |
| `AndroidManifest.xml` | 注册 `DebugConsoleActivity` |

## 验收（INTERNAL MT）

1. TesterMenu → **App Info** 打开全屏 Debug Console（6 Tab）。
2. Config 页显示 Jenkins 注入的 URL 与列号（非写死 B/F）。
3. 飞书改表 → Sync → 列表 key/值/**顺序**与表一致（跳过表头）。
4. Events Tab 实时看到新埋点。
5. 仓库 grep 无 `app_secret` 明文；正式包 BuildConfig 凭证为空。

## 与 bv-compose-write

- Debug Console 可作为独立工步或横切任务；**不替代** gate 模块验收。
- 实现后：`compileInternalGpDebugKotlin` + `testInternalGpDebugUnitTest`（含 `FeishuTestConfigSyncRepositoryTest`）。
- commit 范围：`feature/debug/`、`AppLog.kt`、接线文件、`market.android/.../ConfigManager.kt`、`app/build.gradle`、`scripts/build.py`、`scripts/testFBconfigs.py`、`local.properties.example`、`docs/ai/debug-console.md`（Android 工程内文档可指向本 skill）。

## 触发示例

```text
@bv-debug-console 接入 Debug Console 与飞书 Sync
@bv-debug-console Config 顺序与表格不一致，排查 LinkedHashMap
@bv-debug-console Jenkins 环境变量怎么配 FEISHU_TEST_APP_ID
```
