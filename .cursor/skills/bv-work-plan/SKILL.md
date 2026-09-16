---
name: bv-work-plan
description: >-
  将 spec/modules 模块 spec 拆为可编译、可验收的 Compose 工步计划。Use when
  @bv-work-plan, 工步计划, work plan, or splitting module spec into implementation
  steps for Android refactor. 行为对齐 existing-logic；工步须可单批编译（≤20 文件）。
---

# bv-work-plan — 模块 Spec → 工步 Plan

流水线 **Phase 5**。输出驱动 bv-compose-write 与 bv-accept-gate。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 目标

为单个模块生成 `plan/<模块名>-compose.md`。工步 **行为对齐 existing-logic**，视觉/文案对齐蓝湖与 spec 辅本。

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| 模块名 | 是 | 对应 `spec/modules/<模块名>.md`（辅：页面/文案） |
| registry | 是 | CFG/EVT/I18N 子集（ID；行为默认值以代码为准） |
| bindings | 是 | DS-xx（视觉） |
| existing-logic | **是** | `docs/ai/existing-logic/<模块>.md` + `git-history.md`：**工步目标与验收行为的主本**；「不做」写明复用的 Manager/SDK |

## 输出

```text
plan/
  device-search-compose.md
```

## 文档头

主本放在 **Android 工程** `docs/ai/plan/<模块>-compose.md`（与代码同仓 commit）；Spec 仓库 `plan/` 为归档副本。

```markdown
# device-search — Compose 工步计划

- existing-logic：docs/ai/existing-logic/device-search.md（**行为主本**）
- 模块 spec：spec/modules/device-search.md（辅：页面/文案）
- git 回归：docs/ai/existing-logic/git-history.md
- 设计：design/bindings.md（DS-01 …）
- 验收 gate：docs/ai/gate/device-search.md
- 目标代码：`app/src/main/java/.../presentation/screen/<模块包名>/`（分层见 bv-compose-write）

## 进度

| 工步 | 状态 | Commit |
|------|------|--------|
| 1 … | 待做 | |

> 执行约定：见 **bv-compose-write** — 每工步自动「实现 → 编译 → **AT** → gate 自检 → commit」。
```

## 工步顺序（默认）

1. 模块骨架：`UiState` / `UiEvent` / `Route` / 空 `Screen`（**MVVM + UDF 形状**）
2. 配置/数据（若有 CFG 引用）
3. 纯 UI 块（按 DS-xx，**无状态 Composable** + `@Preview`）
4. ViewModel：`StateFlow<UiState>` + `onEvent(UiEvent)` + UseCase/Repository
5. Screen 串联 + Navigation + 副作用（`UiEffect`）
6. **屏幕适配**：`WindowLayoutUi` + Compact/Expanded（折叠屏双栏）
7. 埋点（EVT，ViewModel 层）
8. 联调与回归（gate 含 AT 全绿 + **MT 清单**交 QA）
9. **（贯穿）自动化测试**：工步 1 建 `test/` 骨架；ViewModel/UI 工步同步 AT（见 bv-compose-write → automated-testing.md）

## 工步模板

```markdown
## 工步 3 - 设备列表 UI

- **引用**：DS-01, I18N:airplay_search_empty
- **目标**：展示搜索结果列表
- **范围**：DeviceSearchScreen.kt, DeviceSearchUiState.Results
- **不做**：连接逻辑（工步 5）
- **依赖**：工步 1
- **编译**：`./gradlew :app:assembleDebug`
- **自动化**：`./gradlew :app:testNormalGpDebugUnitTest`；Screen AT 在 `androidTest/.../DeviceSearchScreenTest.kt`
- **验收**：AG-device-search-03 → AT-device-search-03-a
```

## 原则

- 一步只做一块；**预估文件数 ≤15（硬顶 20）**，否则拆成两个工步
- 每步至少一条 `AG-*`
- 屏幕适配独立工步
- **commit / tag**：每批一 commit；`refactor-batch-NN-start` / `-done`（bv-compose-write）
- plan 生成后标 **方案审核：待人工**，compose 不得在无人点头时开写
- 「仅 UI」与「接逻辑」分开；**UDF 形状在工步 1 确定，逻辑工步再填**
- 调试日志走全局 `AppLog`
- connect / mirror / cast 工步须按 **protocol-ext.md**：Port 注册表，禁止 VM 品牌 if 调 SDK

## 禁止

- **禁止把脏代码写进工步「要做」**：对照 known-gaps；PRD 未写但代码可走的路径必须有工步
- 不要一步写完「UI + 连接 + 埋点 + 配置」
- 不要无引用 ID 的模糊步骤

## 下一步

→ **bv-accept-gate**（生成/对齐 gate 条目）  
→ **等人方案审核**  
→ **bv-compose-write**（逐步执行；迁移对照 existing-logic）

## 完成时必须输出（handoff）

结束回复末尾 **必须** 含 [skill-handoff.md](../bv-refactor-pipeline/references/skill-handoff.md) 结构，至少包括：

1. 产物：`docs/ai/plan/<模块>-compose.md`、工步表摘要  
2. **下一命令**：`@bv-accept-gate 模块：<名>`（无 gate 时）或 `@bv-compose-write` 工步 1  
3. **提醒**：UI 工步已绑定 DS-xx；compose 前确认 Spec 仓 `design/cache/<模块>/` 已存在
