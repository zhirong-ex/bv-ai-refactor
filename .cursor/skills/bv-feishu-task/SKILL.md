---
name: bv-feishu-task
description: >-
  从飞书任务 applink/guid 拉取产品 AI 写的需求（标题、描述、链接），在 Android 仓
  小步实现并编译验证。Use when @bv-feishu-task, 飞书任务, todo guid, 任务实现,
  产品分配任务, 非全量重构的单需求交付。
---

# bv-feishu-task — 飞书任务 → 直接实现

面向 **迭代需求**（产品用 AI 写 PRD/表链在任务里），不是 `@bv-refactor-pipeline` 全模块重构。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 与 bv-* 重构链的关系

| | 全量重构 | 本 skill |
|--|----------|----------|
| 需求主本 | existing-logic + spec/modules | **飞书任务**（描述 + 任务内链接） |
| 入口 | 路线图 / plan 工步 | **任务 applink 或 task_guid** |
| registry | Phase 3 必跑 | 任务里有三表链接时再 `@bv-table-sync` |
| 范围 | 整模块、多批 tag | **单任务最小 diff**，改完即编译 |
| 停点 | 每批 commit + 等人 CR | 任务完成 + 简要验收说明；commit 仅用户要求时 |

仍遵守 Android 仓 `docs/ai/架构规则.md`、MVVM + UDF、`@bv-compose-write` 的编译与分层习惯。

## 前置（一次性）

1. 本机 `lark-cli` 已安装；`lark-cli doctor` 通过 token。
2. **读任务**二选一（推荐 A）：
   - **A. 用户 OAuth**：`lark-cli auth login`，调用时 `--as user`（任务在「我的任务」里可见即可）。
   - **B. 应用 bot**：开放平台应用开通 `task:task:read`，并把该应用/机器人加为任务或清单的**可阅读成员**；`lark-cli task tasks get` 默认 bot 身份。
3. 若任务内链飞书**电子表格**：同一应用或用户身份需具备 sheets 读权限；同步用 `lark-cli sheets +read` 或 `@bv-table-sync`（写入 **Spec 仓** `registry/`，勿在 Android 仓建 `design/`）。

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| 任务链接或 guid | 是 | applink 中 `guid=` 后 36 位 UUID；`suite_entity_num=t…` 仅展示用 |
| Android 工程路径 | 默认当前仓 | zhongnan 等 |
| 是否同步 registry | 否 | 任务描述含三表 URL 时为是 |

### 解析 guid

```text
https://applink.feishu.cn/client/todo/detail?guid=<TASK_GUID>&suite_entity_num=t118238
→ task_guid = <TASK_GUID>
```

## 工作流

### 1. 拉任务

```bash
lark-cli task tasks get --as user --params '{"task_guid":"<TASK_GUID>"}'
```

失败对照：

| 现象 | 处理 |
|------|------|
| `need_user_authorization` | `lark-cli auth login` 后重试 `--as user` |
| `App scope not enabled: task:task:read` | 开放平台开通 scope，或改用户身份 |
| `1470403` 无读权限 | 把当前用户/应用加为任务成员 |

从响应取：`summary`（标题）、`description`（正文，常为 Markdown/HTML）、成员与截止时间。正文即 **需求主本**。

### 2. 解析任务正文中的链接

从 `description`（及用户补充的评论/截图）提取：

| 链接类型 | 动作 |
|----------|------|
| `feishu.cn/sheets/` | 识别配置/埋点/多语言（按标题或任务内标注）；跑 `@bv-table-sync` 或 CLI 读表 |
| 墨刀 sharing | `@bv-modao2prd` 仅当任务明确要求对照原型 |
| 蓝湖 | `@bv-design-bind`（Spec 仓 cache/bindings） |
| 飞书 doc/wiki | `lark-cli docs` / wiki 拉正文作 UI/文案辅本 |

任务未给表链接时：**不得**从代码反推补 registry（与 table-sync 一致）；缺数据则向用户确认。

### 3. 定范围（必做，可短）

1. 读任务标题+描述，列出 **验收点**（3～7 条 bullet）。
2. 在 Android 仓 `grep`/读 **`docs/ai/existing-logic/`** 中与任务相关的段落（只读相关模块，不整库梳理）。
3. 行为冲突：**现网代码 > 任务过时描述**；差异在回复里说明并建议产品改任务。

可选：改动跨多文件或 >1 模块时，写 `docs/ai/plan/task-<简短slug>.md`（半页即可），不必走完整 `@bv-work-plan`。

### 4. 实现

- 最小 diff；沿用仓内命名与 Port/注册表约定。
- 埋点/配置/文案以任务链接同步后的 registry 或任务正文为准。
- 每批改动后 **编译**（与 `@bv-compose-write` 相同命令习惯）。
- 不自动 commit；用户明确要求再提交。

### 5. 交付说明（回复用户）

- 任务 guid / 标题
- 改了哪些路径、对应哪条验收点
- registry 是否更新（Spec 仓路径）
- 建议手测步骤（3～5 步）
- 未决项（权限、任务描述歧义、缺表链）

## 对话入口示例

```text
@bv-feishu-task
https://applink.feishu.cn/client/todo/detail?guid=c700dd4b-69f9-4120-82d6-73d0fedca35e&suite_entity_num=t118238
```

或：

```text
@bv-feishu-task task_guid=c700dd4b-69f9-4120-82d6-73d0fedca35e
```

## 禁止

- 把任务 applink 当成 Sheets token；三表必须单独 URL 或 CLI 可读。
- 无任务正文时臆造需求。
- 在 Android 仓写入 Spec 专属的 `design/cache/`、`spec/modules/`（见 `.cursor/rules/bv-design-spec-paths.mdc`）。
- 用全量重构默认「每批必须 tag」约束小任务（除非用户要求对齐 refactor 批次规范）。

## 下一步

- 表已进 registry → 实现中引用 `CFG:` / `EVT:` / `I18N:` ID
- 踩坑 → `@bv-fix-record`
- 任务实为整模块重构 → 改走 `@bv-refactor-pipeline` + `@bv-work-plan`
