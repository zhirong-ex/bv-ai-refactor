---
name: bv-index
description: >-
  BoostVision Android Compose 重构 skill 目录：选哪个 @bv-*、阶段顺序、口径与产物路径。
  Use when @bv-index, bv skill, 重构 skill 列表, which skill, 流水线目录, or unsure which bv skill to run.
---

# bv-index — 重构 Skill 目录

完整表与口径：[bv-refactor-pipeline/references/catalog.md](../bv-refactor-pipeline/references/catalog.md)  
编排入口：`@bv-refactor-pipeline`  
写代码：`@bv-compose-write`（先读 `docs/ai/架构规则.md` + `docs/ai/路线图.md`）

## 怎么选

| 你要做的 | 调用 |
|----------|------|
| 跑整条或从某阶段接着跑 | `@bv-refactor-pipeline` |
| 只摸现网逻辑 | `@bv-existing-logic` |
| 墨刀导出 / 多版本合并 | `@bv-modao2prd` → `@bv-prd-reconcile` → `@bv-spec-canonical` |
| 飞书 CFG/EVT/I18N | `@bv-table-sync` |
| **飞书任务 → 单需求实现** | `@bv-feishu-task` |
| 蓝湖映射 | `@bv-design-bind` |
| 拆工步 | `@bv-work-plan` |
| 写验收项 | `@bv-accept-gate` |
| **写一批 Compose** | `@bv-compose-write`（一批就停） |
| 记踩坑 | `@bv-fix-record` |
| 重构收尾瘦文档 | `@bv-spec-lite` |
| 内部 Debug 控制台（非流水线） | `@bv-debug-console` |

**zhongnan 推荐** `startFrom: existing-logic`。不要从墨刀当行为主本。

## 阶段（Phase）

`1 modao2prd → 1.5 reconcile → 2 spec → 3 table-sync → 3.5 existing-logic → 4 design → 5 work-plan → 6 accept-gate → 7 compose-write（单批）→ 8 spec-lite`

## 口径（所有写码 skill 共用）

代码定行为；PRD/蓝湖/埋点/配置去脏；PRD 未写的现网路径仍做。  
Connect/Mirror：**Port + 注册表**。一批 ≤20 文件、改一点就编译、一 commit、两个 tag、人审方案/CR/冒烟。  
做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。
