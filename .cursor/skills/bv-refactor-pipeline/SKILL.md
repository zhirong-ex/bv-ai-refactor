---
name: bv-refactor-pipeline
description: >-
  编排 bv-modao2prd → … → bv-existing-logic → … → bv-compose-write。
  现网代码定行为；PRD/蓝湖/埋点/配置辅助去掉脏代码；PRD 未写的需求按代码做。
  Use when @bv-refactor-pipeline, 全自动化重构, end-to-end refactor, 从墨刀到代码,
  跑整条流水线, pipeline handoff.
  目录与口径见 references/catalog.md；选 skill 用 @bv-index。
---

# bv-refactor-pipeline — 现有逻辑为主的 Compose 重构编排

**Skill 目录**：[references/catalog.md](references/catalog.md) · 快捷入口 `@bv-index`。

编排器按序调用子 skill。**Phase 1–6** 可在一条消息里连续做到阻塞；**Phase 7 只跑一批 Compose 就停**（CR + 冒烟），下一批新开对话。不要把「连续至阻塞」理解成连写整个模块。

## 口径优先级（硬规则）

**现网代码定行为**；PRD / 蓝湖 / 埋点表 / 配置表用来 **识别并丢掉脏代码**。不是按墨刀重做产品。

| 来源 | 角色 |
|------|------|
| **代码** + `docs/ai/existing-logic/` + `git-history.md` | 主本。PRD **没写**的需求 → **按代码做**。线上修复不得简化。 |
| **墨刀 / spec** | 辅：页面结构、文案意向；对照代码找 **死路径 / 已下线功能**。墨刀有而代码无 → 默认 **不加**（新产品，记 gaps）。 |
| **蓝湖** | 辅：色值、间距、切图；某控件代码有、设计稿与 PRD 都没有且无 CFG/EVT → 疑似脏 UI，可迁时丢掉。 |
| **registry 埋点 EVT** | 辅：只迁 **仍会打的** 事件；已注释 / 表里没有且代码已注释 → 不迁。 |
| **registry 配置 CFG** | 辅：键仍被读取则保留；只定义从未读取、或 ChangeLog 已删功能残留 → 不迁。 |

### 脏代码（重构时不迁）

须同时或明显满足，并写入 `known-gaps.md`「脏代码」：

- 已注释、不可达、从未调用的方法/事件/SP
- `ChangeLog` / git-history 已明确删除（如 1.5.3 去掉 AINote/AITranslate）
- **PRD 无 + 蓝湖无对应控件 + 无有效 EVT/CFG 引用** 的死功能

### 不是脏代码（必须迁）

- 现网用户能走到，即使 PRD 漏写
- Remote Config 仍读取（默认关也算产品开关）
- 仍 `Statistics.logEvent` 的有效埋点
- git-history 里的时序/崩溃修复

拿不准 → 标「疑似脏代码」并 **先按代码迁**，或列 gaps 问用户；**禁止**仅因「PRD 没画」就删掉现网路径。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 前置（一次性）

1. **Multi-root 工作区**：`zhongnan-refactor.code-workspace`（Android + Spec 双根）
2. **Run Mode**：Settings → Agents → **Run Everything**
3. **项目配置**：`registry/projects/<projectId>.json`（见下节）
4. **MCP**（按需）：`user-modao-prototype`、`user-lanhu`、飞书 lark-* skill
5. **Android CLI**（compose 阶段）：`command -v android`；Apple 芯片安装见 [download](https://developer.android.com/tools/agents/android-cli/download)；PATH 含 `~/.local/bin`；已 `android init`。用法见 **bv-compose-write** `references/android-cli.md`

## 触发

```text
@bv-refactor-pipeline
项目：zhongnan
```

或带阶段：

```text
@bv-refactor-pipeline zhongnan 从 compose 继续
@bv-refactor-pipeline zhongnan 仅模块 mirror-flow
```

## 配置文件

路径：`registry/projects/<projectId>.json`；若存在同目录 **`<projectId>.local.json`**（gitignore），**优先读 local**（本机绝对路径，见 `docs/demo-zhongnan.md`）。

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 项目标识，与文件名一致 |
| `specRepo` | 是 | AI Spec 仓库绝对路径 |
| `androidProject` | 是 | Android 工程绝对路径 |
| `gitBranch` | 是 | compose 阶段 checkout 目标分支 |
| `modules` | 是 | 模块名数组，对应 `spec/modules/<名>.md` |
| `startFrom` | 否 | 从哪一阶段开始（见下表）；配置默认 `modao`；**zhongnan / 现网重构用 `existing-logic`** |
| `modao` | 条件 | `sharingUrls[]`、`reconcile` 路径 |
| `feishu` | 条件 | 三表 URL + `appVersion`；可省略若 registry 已同步 |
| `lanhu` | 条件 | `stageUrl`；可省略若 bindings 已维护 |
| `compose` | 否 | `autoCommit`（默认 true）、`push`（默认 false）、`pushBranchPattern` |
| `finishWith` | 否 | 全部模块完成后是否跑 `bv-spec-lite` |

### 阶段枚举 `startFrom`

| 值 | 首步 skill | 跳过 |
|----|-----------|------|
| `modao` | bv-modao2prd | — |
| `reconcile` | bv-prd-reconcile | modao |
| `spec` | bv-spec-canonical | modao、reconcile |
| `table-sync` | bv-table-sync | 上列 + spec |
| `existing-logic` | bv-existing-logic | 上列 + table-sync |
| `design` | bv-design-bind | 上列 + table-sync + existing-logic |
| `work-plan` | bv-work-plan | 上列 + design |
| `compose` | bv-compose-write | 上列 + work-plan（plan/gate 若无则补） |
| `spec-lite` | bv-spec-lite | 仅收尾 |

## 执行纪律（硬规则）

1. **写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。
2. **批次执行**：compose **一次一批然后停**（见 bv-compose-write `references/batch.md`）。方案审核 / CR / 冒烟 **必须等人**。
3. **子 skill 只读各自 SKILL.md**：每阶段开工前读对应 skill，按其子流程执行。
4. **禁止现场翻 Android 补 spec 视觉/文案**（阶段 1–5、7 写 gate 时）。**行为**只引用 `docs/ai/existing-logic/`（由 Phase 3.5 写好）。compose 可读代码做迁移，行为仍以 existing-logic 为准。墨刀/spec 只辅助 UI。
5. **工作区**：所有写操作优先落在 `androidProject` 与 `specRepo` 内（Multi-root 已覆盖）。
6. **git**：compose 工步 gate 通过后自动 commit；push 仅当 `compose.push: true` 且分支匹配 `pushBranchPattern`。
7. **进度**：每阶段/每模块完成时在 Android `docs/ai/README.md` 或 plan 进度表更新状态（可选 commit spec 仓归档副本）。
8. **Handoff**：每个子 skill 结束时 **必须** 输出 [references/skill-handoff.md](references/skill-handoff.md) 规定的收尾块（产物、下一命令、路径纪律、MT/设计对照提醒），禁止只写一行「下一步 → xxx」。

### 唯一暂停条件

- `docs/ai/existing-logic/` 缺失或与当前代码明显过期（须先跑 bv-existing-logic）
- 墨刀与代码冲突：现网仍可达 → **跟代码**；已标脏代码 → **不迁**。均不因 gaps 暂停 compose。仅当用户要求「按墨刀改产品」时暂停
- Modao V7 / API 403（需产品转 V8）— 仅影响辅本导出，不阻塞 already 有 existing-logic 的 compose
- 编译或 AT 连续失败且无法在本轮修复
- gate 项需真机 MT 且阻塞下一工步逻辑
- 人工三关未过：方案未审、CR 未过、冒烟未做 → **不准开下一批**

暂停时输出：**阻塞原因 + 已完成阶段 + 建议用户操作 + 恢复命令**（如 `@bv-refactor-pipeline zhongnan 从 compose 继续`）。

## 流水线（按序）

```text
Phase 1    bv-modao2prd          modao.sharingUrls → modao-output/
Phase 1.5  bv-prd-reconcile      modao.reconcile JSON → _reconciled/
Phase 2    bv-spec-canonical     → spec/modules/*.md（墨刀辅本；与 existing-logic 的 diff 进 gaps，不覆盖代码行为）
Phase 3    bv-table-sync         → registry/*.json
Phase 3.5  bv-existing-logic     → androidProject/docs/ai/existing-logic/（行为主本；可先于墨刀）
Phase 4    bv-design-bind        每模块补 bindings + cache（lanhu.stageUrl）
Phase 5    bv-work-plan          → androidProject/docs/ai/plan/<模块>-compose.md
Phase 6    bv-accept-gate        → androidProject/docs/ai/gate/<模块>.md（若不存在）
Phase 7    bv-compose-write      **每次一批**（编译节奏 + tag）；停下等人 CR+冒烟；下一批新对话
Phase 8    bv-spec-lite          finishWith 为 true 且全部模块 ✅ 时
```

Phase 2 与 3.5：**推荐先 existing-logic（行为主本）**；有飞书则 table-sync 给 CFG/EVT 打 ID。墨刀可后补。用户只跑重构：`startFrom: existing-logic`。

Phase 5–7：plan 须 **人工方案审核** 后再 compose。Phase 7 **只跑当前一批**然后停（CR + 冒烟），不在同一次 pipeline 里把模块跑完。

### Phase 7 单批

1. 读路线图 NN 与 plan 下一未完成工步
2. 无 plan / gate → 先 Phase 5–6（plan 仍等人审）
3. **bv-compose-write 一批**：start tag → 编译节奏 → commit → done tag
4. 输出粘贴包；**等用户新开对话** 再跑 NN+1

### 路径约定

| 产物 | 主本位置 |
|------|----------|
| plan | `{androidProject}/docs/ai/plan/` |
| gate | `{androidProject}/docs/ai/gate/` |
| existing-logic | `{androidProject}/docs/ai/existing-logic/`（Spec 仓 `spec/existing-logic/` 为副本） |
| spec / registry / design | `{specRepo}/spec/`、`registry/`、`design/` |
| 代码 | `{androidProject}/app/.../presentation/screen/<模块包名>/` + `domain/` `data/` `core/` |

## 启动检查清单

执行前 Agent 自行核对（不向用户逐项确认）：

- [ ] `registry/projects/<id>.json` 存在且 JSON 合法
- [ ] `specRepo`、`androidProject` 目录存在
- [ ] 若 `startFrom` ≥ design：`docs/ai/existing-logic/README.md` 存在（否则先跑 bv-existing-logic）
- [ ] 若 `startFrom` ≥ compose：目标模块的 spec 文件存在
- [ ] 当前 git 分支 = `gitBranch`（compose 阶段；不对则 checkout）
- [ ] Run Mode 已为 Run Everything（无法检测则继续，遇 Run 弹窗记入阻塞说明）

## 恢复与增量

| 场景 | `startFrom` | 备注 |
|------|-------------|------|
| 新 App 从零 | `modao` | 填全 modao + feishu + lanhu |
| spec 已有，开始写代码 | `compose` | plan/gate 已有时可跳；**缺 existing-logic 必须先补** |
| 以现网逻辑重构（推荐） | `existing-logic` | 墨刀/设计可后补 |
| 只梳理现有逻辑 | `existing-logic` | 写 `docs/ai/existing-logic/`，不改业务代码 |
| 只跑一个模块 | 同左 + 消息「仅模块 X」 | 临时把 `modules` 缩为 `[X]` |
| 飞书表更新 | `table-sync` | 然后 `design` 或 `compose` |
| 全 App Compose 完成 | `spec-lite` | — |

## 与 Cursor Automation 配合（可选）

在 Automations 中创建 **手动触发**（不建议 Webhook 连跑 Phase 7）：

```text
@bv-refactor-pipeline
项目：zhongnan
从 compose 继续；只做当前一批；不要跳过方案审核 / CR / 冒烟。
```

Automation 须使用 **Multi-root 工作区** 同一仓库路径。Phase 7 **禁止无人值守连跑多批**。

## 示例：zhongnan 从代码阶段继续

配置见 `registry/projects/zhongnan.json`。用户消息：

```text
@bv-refactor-pipeline zhongnan
```

Agent 行为：读配置 → `startFrom: compose` → 按 modules 顺序对每个未完成模块连续 bv-compose-write → 遇 gaps/编译失败则暂停并报告。
