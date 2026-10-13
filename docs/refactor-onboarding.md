# 老项目 Compose 重构 — 同事上手指南

> **目标**：Clone 本仓（`bv-ai-refactor`）后，用同一套 `@bv-*` 流水线重构 **任意** Android 老项目，不限于 `zhongnan`。  
> **示范实例**： [demo-zhongnan.md](demo-zhongnan.md) · **Skill 详解**： [bv-skills-guide.md](bv-skills-guide.md) · **Agent 规则**： [AGENTS.md](../AGENTS.md)

---

## 1. 你需要准备什么

| 项 | 说明 |
|----|------|
| **本 Spec 仓** | `git clone` [bv-ai-refactor](https://github.com/zhirong-ex/bv-ai-refactor) |
| **Android 老项目仓** | 公司 GitLab/GitHub 上的 App 工程（独立仓库） |
| **Cursor** | Desktop；Agents → **Run Everything** |
| **磁盘布局** | 两仓并列（路径任意，见 §3） |
| **可选 MCP** | 墨刀 `user-modao-prototype`、蓝湖 `user-lanhu`、飞书 `lark-cli` / `@bv-table-sync` |
| **GitHub 访问** | 若 push 本 Spec 仓超时，见 [README.md](../README.md) § Git / network（常见本机代理 `127.0.0.1:7890`） |

**一次性的本机步骤（每个开发者只做一次）：**

```bash
cd /path/to/bv-ai-refactor
./scripts/link-bv-skills.sh
```

之后在 Cursor 里 `@bv-index`、`@bv-refactor-pipeline` 等才会识别 Skill。

---

## 2. 双仓分工（所有项目相同）

| 仓库 | 维护什么 | 不要做什么 |
|------|----------|------------|
| **bv-ai-refactor（本仓）** | `.cursor/skills/bv-*`、`spec/modules/`、`registry/`、`design/`、`modao-output/`、`registry/projects/*.json` | 不要在这里放 Android `app/` 源码 |
| **Android 工程仓** | `app/…` 代码、`docs/ai/`（`existing-logic/`、`plan/`、`gate/`、`架构规则.md`、`路线图.md`） | **不要**新建 `design/`、`design/cache/` |

行为主本：**现网代码** → Android `docs/ai/existing-logic/`；墨刀/spec/蓝湖/registry **辅本去脏**。

---

## 3. 为新项目接流水线（约 30 分钟）

假设新项目代号为 **`myapp`**（内部代号，不要翻译成中文产品名）。

### 3.1 注册项目配置

```bash
cp registry/projects/_template.local.json.example registry/projects/myapp.local.json
# 编辑 myapp.local.json：specRepo、androidProject、workspace、gitBranch、modules、链接等
```

- 共享模板字段说明见 **`registry/projects/_template.local.json.example`**
- **`*.local.json` 已 gitignore**，只放本机路径，勿改别人的 `zhongnan.json`
- 模块名与 **`spec/modules/<名>.md`** 一致（连字符命名，如 `device-search`）

### 3.2 Multi-root 工作区

复制并改名：

```bash
cp zhongnan-refactor.code-workspace myapp-refactor.code-workspace
```

编辑 `folders` 里 Android 路径指向 **你的工程**；Spec 根保持 `"path": "."`。

Cursor：**File → Open Workspace from File** → 选该 `.code-workspace`。

### 3.3 Android 仓最小文档

在 **Android 仓** 创建（可参考 zhongnan 的 `docs/ai/`，按项目改包名/模块）：

```text
docs/ai/
  架构规则.md      # 分层、UDF、批次纪律（给 Agent 新对话粘贴）
  路线图.md        # 当前批次 / tag / 模块进度
  existing-logic/  # @bv-existing-logic 产出
  plan/            # @bv-work-plan 产出
  gate/            # @bv-accept-gate 产出
```

Android 仓根目录建议有 **README**，链到本文件与 Spec 仓。

### 3.4 选入口阶段 `startFrom`

| 场景 | `startFrom` | 先做 |
|------|-------------|------|
| **老 App，以现网为准重构（推荐）** | `existing-logic` | `@bv-existing-logic` → 再 table-sync / design / work-plan |
| spec/registry 已有，开始写 UI | `compose` | 确认 `docs/ai/plan/` 已有或 `@bv-work-plan` |
| 全新需求从墨刀建档 | `modao` | `@bv-modao2prd` 起完整链 |
| 只同步飞书表 | `table-sync` | `@bv-table-sync` |

老项目 **不要** 假设已有 zhongnan 的 `spec/modules/` 内容，需为本项目新建或 `@bv-spec-canonical`。

---

## 4. 推荐第一次对话（验证环境）

**环境自检：**

```text
@bv-index
项目：myapp（新接流水线），说明应从哪一 Phase 开始。
```

**梳理现网（老项目必做）：**

```text
@bv-existing-logic
Android 工程：<绝对路径>
模块：<模块名列表，可先 1 个试点模块>
```

**拆工步（人审 plan 后再 compose）：**

```text
@bv-work-plan <模块名>
```

**写一批 Compose（每批新对话 + 贴 架构规则 + 路线图）：**

```text
@bv-compose-write
<Android 仓 docs/ai/架构规则.md 与 路线图.md 全文>
模块：<名> 工步：<N>
```

**整条编排（可选）：**

```text
@bv-refactor-pipeline
项目：myapp
从 existing-logic 开始；仅模块 <试点模块名>。
```

Pipeline 会读 **`registry/projects/myapp.local.json`**（若存在），否则读 `myapp.json`（需团队共享一份不含本机路径的 `myapp.json` 时再提交）。

---

## 5. 仓库里建议提交 vs 仅本机

| 提交到 Spec 仓（团队共享） | 仅本机 / gitignore |
|----------------------------|---------------------|
| `spec/modules/`、`registry/*.json`（无密钥）、`design/`、`modao-output/` | `registry/projects/*.local.json` |
| `registry/projects/<id>.json`（无绝对路径或占位路径） | 个人 MCP token |
| `.cursor/skills/` 变更、docs、scripts | |
| 项目 workspace 示例（相对路径） | |

| 提交到 Android 仓 | |
|-------------------|--|
| `docs/ai/`、`app/` 重构代码 | |

---

## 6. 与 zhongnan 示范的关系

| 内容 | 能否直接 copy |
|------|----------------|
| Skill、脚本、流水线顺序 | ✅ 共用本仓 |
| `zhongnan.json` / zhongnan 的 spec、plan、gate | ❌ 仅参考结构 |
| [demo-zhongnan.md](demo-zhongnan.md) | ✅ 当「填好配置的样例」 |

---

## 7. 常见问题

**Q：只 Clone AI 仓、不 Clone Android 可以吗？**  
A：只能维护 spec/skill，**不能**跑 compose。必须双仓 + workspace。

**Q：多个 App 共用一个 bv-ai-refactor？**  
A：可以。每个 App 一个 `registry/projects/<id>.json` + 各自 Android 仓 + `spec/modules/` 按模块区分。

**Q：同事改了 Skill，我要做什么？**  
A：`git pull` Spec 仓；已 symlink 的无需重跑 link 脚本（指向本仓 `.cursor/skills`）。

**Q：plan 在 AI 仓还是 Android 仓？**  
A：**主本在 Android `docs/ai/plan/`**；Agent 写 Compose 以 Android 仓为准（见 AGENTS / pipeline catalog）。

**Q：飞书小需求，不走整模块重构？**  
A：Android 仓 `@bv-feishu-task` + `docs/ai/plan/feishu-task-playbook.md`（zhongnan 已有 playbook，其他项目可复制改路径）。

---

## 8. 文档地图

```text
README.md                 → 仓概览、目录、代理 push
refactor-onboarding.md    → 本文（任意老项目接入）
bv-skills-guide.md        → 每个 @bv-* 做什么
demo-zhongnan.md          → 已配置好的示范
AGENTS.md                 → Agent 硬规则与索引
```

接入新项目时：**先读完 §1–§3，再跑 `@bv-existing-logic`**。
