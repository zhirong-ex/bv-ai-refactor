---
name: bv-modao2prd
description: >-
  将墨刀 project 分享链接转为结构化 PRD Markdown（Archive）：生成 urls_codex、
  逐画布导出截图与批注、按版本合并 .md。Use when converting Modao prototypes,
  @bv-modao2prd, or exporting 墨刀需求文档 for bv refactor pipeline.
---

# bv-modao2prd — 墨刀原型 → Archive PRD

流水线 **Phase 1**。产物供 **bv-spec-canonical** 合并，**不**直接用于写 Compose 代码。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 目标

把墨刀 project 分享链接（`/proto/<token>/sharing`）完整转换为按版本分组的 PRD Markdown 文档。

**端到端流程（三步，必须按序执行）：**

1. **生成 `urls_codex`** — 解析项目节点树，列出各版本文件夹下的画布 URL
2. **逐画布导出** — 对每个画布 URL 单独抓取页面截图与批注
3. **合并 PRD** — 每个版本文件夹输出一个 `<版本名>.md`

## 触发场景

- 用户提供墨刀 project 分享链接，要求转 PRD / 需求 Archive
- 全版本重构前批量导出
- 需要生成或更新 `urls_codex`

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| 墨刀分享链接 | 是 | `https://modao.cc/proto/.../sharing?view_mode=read_only` |
| 输出目录 | 否 | 默认 `modao-output/<项目名>__<access_token>/` |
| 版本筛选 | 否 | `--version v2.1.1`；可重复；省略则全部版本 |

## V7 → V8（产品必须先转化）

- **V7 旧工程**（如 `【已上线V7】`、链接为 `/app/<token>`）：`generate_urls_codex` 常 403 `P_PREVIEW_FORBIDDEN_WITH_RESTRICTED`，**不要**强行跑本 skill。
- **正确做法**：产品把 V7 里**每个版本文件夹**依次在墨刀里 **叠加 / 一键转化成 V8 合集**（如 `【合集V8】Miracast_GP`），再用 `/proto/<token>/sharing?view_mode=read_only` 链接。
- 人眼在 V7 分享里能看全页 ≠ API 可导出；V8 转化后链接才对。
- 给人看的完整说明：[docs/bv-skills-guide.md](../../../docs/bv-skills-guide.md) § bv-modao2prd「墨刀 V7 → V8」。

## 输出目录约定

```text
modao-output/
  <项目名>__<access_token>/
    sharing_url.txt
    urls_codex
    .exports/
    v1.4.6 接入新AirPlay SDK.md
```

## Step 1：生成 urls_codex

脚本：`.cursor/skills/bv-modao2prd/generate_urls_codex.js`

```bash
node .cursor/skills/bv-modao2prd/generate_urls_codex.js "<分享链接>" [输出目录]
```

## Step 2：逐画布导出

单画布：

```bash
node scripts/export_single_canvas.mjs "<画布URL>" "<导出目录>" --timeout-ms 90000
```

批量：

```bash
bash scripts/export_all_from_urls_codex.sh "<输出目录>" [--version NAME ...]
```

可选 MCP：`user-modao-prototype` → `export_modao_prototype`（仍须逐画布 URL）。

## Step 3：合并 PRD

```bash
node scripts/build_prd.mjs [urls_codex] [.exports] [output_dir] [--version NAME ...]
```

文档结构：`# 画布` → `## 页面/子画布` → `### 页面布局` + `### 说明`；批注 HTML 格式见原规范。

## 一键流程

```bash
bash scripts/run_bv_modao2prd.sh "https://modao.cc/proto/<token>/sharing?view_mode=read_only"
bash scripts/run_bv_modao2prd.sh "<url>" --version v1.4.6
```

## 耗时统计（重构方法评估）

每次跑完会在输出目录生成：

| 文件 | 说明 |
|------|------|
| `run-stats.json` | 历次运行明细（追加），含各阶段秒数、画布数、逐画布耗时 |
| `run-stats.latest.txt` | 最近一次运行的人类可读摘要 |

```bash
# 查看某项目历次耗时
node scripts/bv_modao_run_stats.mjs summary modao-output/<项目>__<token>/
```

`run-stats.json` 单次 run 字段示例：`elapsed_min`、`phases_sec.urls_codex/export/build_prd`、`canvases.exported/skipped/failed`、`avg_exported_canvas_sec`、`per_canvas[]`。

## 下一步

Archive 完成后 → **@bv-prd-reconcile**（多源/重复版本/ChangeLog 补缺）→ **@bv-spec-canonical**。

## 质量检查

1. 每个版本文件夹下所有画布已导出
2. **无画布的版本文件夹**也会生成 `<版本名>.md`，正文标题即文件夹名（需求描述）
3. 画布拆分到页面层级
4. 二级嵌套子画布已在 urls_codex 并完成导出
5. 批注与图片路径可预览
