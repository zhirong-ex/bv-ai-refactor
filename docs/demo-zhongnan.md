# 示范项目：zhongnan（中南 Miracast GP）

本文说明如何把 **bv-ai-refactor（Spec 仓）** + **zhongnan1.5.3（Android 仓）** 作为团队培训与录屏的固定样例。

完整 Skill 说明见 [bv-skills-guide.md](bv-skills-guide.md)；Agent 总规则见仓库根 [AGENTS.md](../AGENTS.md)。

---

## 1. 推荐磁盘布局

```text
<clone-root>/
  otherBoostvision/AI/          ← 本仓库（bv-ai-refactor）
  zhongnan/zhongnan1.5.3/       ← Android 工程
```

工作区文件在本仓根目录：**`zhongnan-refactor.code-workspace`**。  
其中 Android 路径默认为 `../../zhongnan/zhongnan1.5.3`（相对本 workspace 文件）。若你的目录不同，用 Cursor 打开 workspace 后改 `folders[].path`，或只改 `registry/projects/zhongnan.local.json` 里的绝对路径。

---

## 2. 新人 30 分钟

| 步 | 动作 |
|----|------|
| 1 | Clone Spec 仓 + Android 仓到上表结构 |
| 2 | `./scripts/link-bv-skills.sh`（把 `bv-*` 链到 `~/.cursor/skills`） |
| 3 | Cursor → **Open Workspace from File** → 本仓 `zhongnan-refactor.code-workspace` |
| 4 | Settings → Agents → **Run Everything** |
| 5 | 复制 `registry/projects/zhongnan.local.json.example` → `zhongnan.local.json`，改本机 `specRepo` / `androidProject` / `workspace` |
| 6 | （可选）配 MCP：`user-modao-prototype`、`user-lanhu`；飞书任务用 `lark-cli` + `@bv-feishu-task` |
| 7 | 验证：`@bv-index`；写码时贴 Android 仓 `docs/ai/架构规则.md` + `docs/ai/路线图.md` |

`registry/projects/zhongnan.json` 为**共享模板**（含示例绝对路径）；本机路径勿改共享文件，用 **`zhongnan.local.json`**（已 gitignore）。

---

## 3. 两仓各管什么

| 仓 | 内容 |
|----|------|
| **Spec（本仓）** | `.cursor/skills/bv-*`、`spec/`、`registry/`、`design/`、`modao-output/` |
| **Android** | `app/...`、`docs/ai/`（existing-logic、plan、gate、路线图、架构规则） |

禁止在 Android 仓创建 `design/`（见 Android 仓 `.cursor/rules/bv-design-spec-paths.mdc`）。

---

## 4. 示范对话（培训 / 录屏）

**A — 流水线目录（只读）**

```text
@bv-index
项目示范：zhongnan，说明 Spec 仓与 Android 仓各管什么。
```

**B — 从 compose 继续一批（重构主路径）**

```text
@bv-refactor-pipeline
项目：zhongnan
从 compose 继续；只做当前一批；不要跳过 CR / 冒烟。
```

（若本机有 `zhongnan.local.json`，Agent 应优先读 local 配置；否则读 `zhongnan.json` 并提示改路径。）

**C — 文档对齐走读（给产品 / 测试）**

```text
请只读 zhongnan-android 下 docs/ai/existing-logic/mirror-flow.md、
plan/mirror-flow-compose.md、gate/mirror-flow.md，
说明行为主本、工步、验收如何对齐。
```

**D — 飞书小需求**

```text
@bv-feishu-task
<飞书任务 applink>
```

Playbook：Android 仓 `docs/ai/plan/feishu-task-playbook.md`。

---

## 5. 复制到新 App

1. 复制 `registry/projects/zhongnan.json` → `registry/projects/<新 id>.json`
2. 改 `id`、`androidProject`、`modules`、`startFrom`（新 App 从 `modao`；老 App 重构从 `existing-logic` 或 `compose`）
3. Android 仓新建 `docs/ai/架构规则.md`、`docs/ai/路线图.md`
4. **Skill 不复制**，全员共用本仓 `bv-*`

---

## 6. 示范锚点（可选）

培训材料可固定一对 Git 引用，避免「文档新、代码旧」：

- Spec 仓 tag / commit
- Android 仓 tag / commit（与 `docs/ai/路线图.md` 分支一致，当前示范分支：`zhirong/v1.5.5_ai`）

---

## 7. 常见问题

**Q：只打开 zhongnan1.5.3 单仓可以吗？**  
A：可以改代码，但跑 `@bv-design-bind`、写 registry/spec 时 Agent 容易写错仓；请用本 workspace。

**Q：`link-bv-skills.sh` 要每次 clone 都跑吗？**  
A：是。每个开发者本机一次；更新 Skill 后 pull Spec 仓即可（symlink 自动指向新内容）。

**Q：工作区里 Android 文件夹显示找不到？**  
A：改 `zhongnan-refactor.code-workspace` 里 `zhongnan-android.path`，或调整 clone 目录与 §1 一致。
