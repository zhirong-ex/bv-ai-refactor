# AGENTS.md — Boostvision AI 重构流水线

本仓库 skill 统一使用 **`bv-*`** 前缀。实现代码时只读 `spec/`、`registry/`、`design/bindings.md`，不读 `modao-output` 单版本 PRD。

**给人看的完整说明**：[docs/bv-skills-guide.md](docs/bv-skills-guide.md)（各 Skill 职责、用法、场景 walkthrough）

## Skill 索引

| Skill | 阶段 | 产物 |
|-------|------|------|
| **bv-modao2prd** | 1 需求 Archive | `modao-output/` |
| **bv-prd-reconcile** | 1.5 Archive 对齐 | `modao-output/_reconciled/` |
| **bv-spec-canonical** | 2 模块当前态 | `spec/modules/*.md` |
| **bv-table-sync** | 3 飞书表快照 | `registry/*.json` |
| **bv-design-bind** | 4 蓝湖映射 | `design/bindings.md` |
| **bv-work-plan** | 5 工步计划 | `plan/*-compose.md` |
| **bv-compose-write** | 6 Compose 实现 | Android `app/.../feature/<模块包名>/` |
| **bv-accept-gate** | 7 验收 | `gate/<模块>.md` |
| **bv-fix-record** | 横切 bug 沉淀 | `learn/` |
| **bv-debug-console** | 横切 INTERNAL 调试台 | Android `feature/debug/` |
| **bv-spec-lite** | 收尾文档瘦身 | `docs/` |
| **bv-refactor-pipeline** | 全链路编排 | `registry/projects/*.json` |

## 流水线顺序

```
bv-modao2prd → bv-prd-reconcile → bv-spec-canonical → bv-table-sync → bv-design-bind
  → bv-work-plan → bv-compose-write（逐步）→ bv-accept-gate
```

修 bug：**bv-fix-record**；行为变更回写 `spec/modules/`。  
INTERNAL 调试台 / 飞书测试配置 Sync：**bv-debug-console**。  
重构完成后：**bv-spec-lite** 收敛为少量 `docs/`，日常 Agent 只维护 docs + 代码。

**全自动化（一条消息）**：`@bv-refactor-pipeline <projectId>`，配置见 `registry/projects/<id>.json`；须 Multi-root 工作区 + Run Everything。

## 输入源分工

| 来源 | 管什么 | Skill |
|------|--------|-------|
| 墨刀 | 流程、状态、交互批注 | bv-modao2prd → bv-prd-reconcile → bv-spec-canonical |
| **Git ChangeLog** | 无墨刀版本的更新说明 | bv-prd-reconcile |
| 蓝湖 | 视觉、布局、切图 | bv-design-bind |
| 飞书配置表 | 远程开关、SKU、JSON | bv-table-sync |
| 飞书埋点表 | 事件、参数、时机 | bv-table-sync |
| 飞书多语言表 | 文案 key | bv-table-sync |

## 硬规则

- **禁止反查代码**：写 spec / registry 引用 / plan / gate / design 时，**不得**读 Android 工程（`src/`、`res/`、`build.gradle*` 等）推断或补全产品行为、配置键、埋点、文案、默认值；信息不足 → 记入 `spec/gaps.md` 并请用户确认。仅 **bv-compose-write** 可读既有代码做迁移与接线，且**需求口径仍以 spec/registry/design 为准**
- UI 以蓝湖为准；流程/状态以 `spec/modules/` 为准
- 文案/配置/埋点以 `registry/` 为准
- `spec/modules/<名>.md` 与 Android `app/.../feature/<模块包名>/` **同名**（包路径，非 Gradle module）
- Compose 重构：**MVVM + 单向数据流（UDF）**；状态向下、事件向上；详见 `bv-compose-write`
- **公共代码**：可复用工具 / Compose 通用块放 **`compose/`**、**`utils/`**，全局只一份；**Theme / Color / Typography** 集中在 **`compose/theme/`**（`AppTheme` 唯一入口），禁止在 feature 重复
- **App Quality / 内存**：Compose 实现须遵守 `bv-compose-write` → [app-quality-memory.md](.cursor/skills/bv-compose-write/references/app-quality-memory.md)；[Google 博客](https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html) 会更新，Agent 须按该 reference §0 定期重读
- 屏幕适配：**WindowSizeClass + Material3 Adaptive**（手机/平板/折叠屏）；不写折叠专用 Activity
- 一步一编译，一步一 gate；未过 gate 不开下一工步
- **bv-compose-write**：自动「实现 → 编译 → **自动化测试(AT)** → gate 自检 → commit → 下一工步」；**每工步 gate 通过后 commit 一次**；commit 前 **`git add` 整个 `feature/<模块包名>/`**（**含新建 untracked `.kt`**）、**`compose/`/`utils/`**（若动）、**`test/`/`androidTest/`**；**新建项目文件自动 add，无需用户逐项授权**；Shell 用 `git_write`/`all` **直接执行**；**默认不 push**；若 push **仅当前个人分支**（如 `zhirong/**`），**禁止** push 到 develop/main/master（AI 重构期 CI 亦只挂个人分支，见 automated-testing.md §8）
- 其他 skill：**不自动** commit / push，除非用户明确要求

## 触发示例

```
@bv-modao2prd 墨刀：https://modao.cc/proto/.../sharing?view_mode=read_only
@bv-prd-reconcile 配置：modao-output/miracast.reconcile.json
@bv-spec-canonical 合并模块 device-search、settings
@bv-work-plan device-search
@bv-compose-write 执行 plan/device-search-compose 工步 1
@bv-debug-console 接入 Debug Console 与 Jenkins 飞书 Sync
```

各 skill 详见 `.cursor/skills/bv-<name>/SKILL.md`（墨刀导出：`.cursor/skills/bv-modao2prd/SKILL.md`）。
