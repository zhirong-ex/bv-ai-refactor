---
name: bv-design-bind
description: >-
  维护蓝湖设计稿与模块、`presentation/screen/` 路径的映射；通过 Lanhu MCP 或脚本从项目链接
  自动拉取预览图、标注与切图到 design/cache/。Use when @bv-design-bind, 蓝湖映射,
  lanhu bindings, or before Compose UI implementation.
---

# bv-design-bind — 蓝湖 ↔ 模块 ↔ 代码

流水线 **Phase 4**。**视觉以蓝湖为准**；**行为以 existing-logic 为准**。墨刀不管像素；设计稿 **不得**改连接/广告/Billing 规则。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 设计原则（与 bv-modao2prd 对齐）

| 墨刀流水线 | 蓝湖流水线 |
|------------|------------|
| 分享链接 → MCP/脚本 | 项目 stage 链接 → **Lanhu MCP**（首选）或 Cookie 脚本 |
| `modao-output/.exports/` 截图 | `design/cache/<模块>/DS-xx/` 预览 + schema + 切图 |
| `urls_codex` 画布清单 | `design/cache/<模块>/urls_codex` 画板清单 |
| 人只给链接，Agent 拉取 | **人只给项目链接 + 模块名**，Agent 列树、映射、缓存 |

**用户日常输入**（理想态）：

```text
@bv-design-bind
模块：device-search
蓝湖：https://lanhuapp.com/web/#/item/project/stage?pid=...&teamId=...
版本文件夹：1.4.6
```

Agent 负责：列画板 → 对齐 spec → 拉预览/标注 → 写 `design/bindings.md`。

---

## 前置条件（一次性配置）

**必须**具备 Lanhu MCP。安装步骤见 **[docs/bv-skills-guide.md](../../../docs/bv-skills-guide.md) §5「蓝湖 MCP 安装」**；故障排查见 [references/lanhu-mcp-setup.md](references/lanhu-mcp-setup.md)。

### 链接格式（重要）

蓝湖 MCP 只认 **`tid`**，不认 `teamId`。请把浏览器里的链接改成：

```text
https://lanhuapp.com/web/#/item/project/stage?pid=<pid>&tid=<teamId>
```

例：`...&pid=537f6e5a-6555-4108-8771-28d5f167d8ae&tid=7e6fd821-1dab-4f48-8c32-80325d496c49`

### MCP 工具（namespace: `user-lanhu`）

| 工具 | 用途 |
|------|------|
| `lanhu_login` | 首次/过期登录（Cookie → `~/.lanhu-mcp/cookie.json`） |
| `lanhu_resolve_link` | 解析 pid / tid |
| `lanhu_get_design` | **无 image_id** → 返回项目全部画板列表；**有 image_id** → 图层 schema |
| `lanhu_get_screenshot` | 预览图 |
| `lanhu_download_slices` | 切图 |

列画板：对 stage URL 调用 `lanhu_get_design`（不传 image_id）即可，无需人工逐页复制链接。

---

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| 蓝湖链接 | 是 | **项目 stage URL** 即可（含 `pid`）；单画板 URL 用于补拉某一 DS |
| 模块名 | 是 | 与 `spec/modules/<名>.md` 一致 |
| Compose 路径 | 否 | 默认 `app/.../presentation/screen/<模块包名>/` |
| 版本文件夹 | 否 | 如 `1.4.6`；省略则取 spec 当前 UI 基准版本或最新含该模块的文件夹 |
| binding id | 否 | 自动生成 `DS-01` |

---

## 输出

### 1. `design/bindings.md`

```markdown
| id | 模块 | 名称 | 蓝湖链接 | 缓存 | 代码路径 | 状态 |
| DS-01 | device-search | device- 新增设备 | https://lanhuapp.com/.../detailDetach?... | cache/device-search/DS-01/ | presentation/screen/devicesearch/ | todo |
```

- **蓝湖链接**：尽量为**单画板 deep link**（MCP `resolve_link` 或列树后写入）
- **缓存**：指向 `design/cache/` 下目录（见 [references/cache-layout.md](references/cache-layout.md)）
- 状态：`todo` | `doing` | `done`

### 2. `design/cache/<模块>/`

每个 `DS-xx` 目录至少含：

| 文件 | 来源 |
|------|------|
| `preview.png` | MCP `get_screenshot` / `get_screen_image` |
| `schema.json` | MCP `get_design` / `get_design_schema`（图层、尺寸、色值、字号） |
| `slices/` | MCP `download_slices` / `export_asset`（按需） |
| `meta.json` | 画板 id、名称、拉取时间、源 URL |

### 3. `design/cache/<模块>/urls_codex`

TSV/文本：版本文件夹、画板名、蓝湖 URL、映射 DS-xx（供增量更新）。

### 4. 回写 spec

`spec/modules/<模块>.md` 的「设计引用」使用 `DS-01…`（与 bindings 一致）。

---

## 工作流

### Step 0 — 检查 Lanhu 通道

1. `GetDynamicTools` 命名空间 **`user-lanhu`**（Cursor 中对应 `mcp.json` 的 `lanhu` server）
2. 链接须含 **`tid=`**（非 `teamId=`）
3. 不可用 → 见 [references/lanhu-mcp-setup.md](references/lanhu-mcp-setup.md)；记 `spec/gaps.md`

### Step 1 — 解析项目链接

- MCP：`lanhu_resolve_link`（stage URL，`tid` + `pid`）

### Step 2 — 列画板

- MCP：`lanhu_get_design`（同一 URL，**不传 image_id**）→ 返回 `designs[]`（id、name）
- 写入 `design/cache/<模块>/urls_codex`
- 注：返回为**项目级**列表；按画板名 + spec 版本基准（如 v1.4.6 命名）筛选，勿全量绑定

### Step 3 — 映射 DS-xx

1. 读 `spec/modules/<模块>.md` 的「设计引用」与状态机
2. 按画板名启发式映射（可人工 override）：

| 蓝湖画板名关键词 | DS-xx |
|------------------|-------|
| 新增设备 / search / 设备搜索 | DS-01 main |
| no wifi / 无网络 | DS-02 |
| 找不到 / don't see | DS-03 |
| pin / PIN | DS-04 |
| Apple tv提示 / Apple TV | DS-05 |
| Mac提示 | DS-06 |
| 密码 / password / 需 | DS-07 |
| Samsung / 配对 | DS-08 |
| native / 广告 | DS-09 |
| banner | DS-10 |
| troubleshoot | **非本模块** → 跳过或记入 gaps |

无法自动映射 → `spec/gaps.md` 列出待确认项，**不要猜**。

### Step 4 — 拉取并缓存（逐 DS-xx）

对每个已映射画板：

1. 获取单页 deep link
2. 下载 `preview.png`
3. 下载 `schema.json`（标注/CSS/图层树）
4. 若有切图页或 MCP `list_assets` → 写入 `slices/` 或 `design/assets/<模块>/`

失败单页：记 `meta.json` 的 `error`，不阻塞其他画板。

### Step 5 — 写 bindings + 更新 gaps

- 更新 `design/bindings.md`
- UI 工步 gate 通过后，对应 DS 标 `done`

---

## 与下游 skill 的分工

| Skill | 读什么 |
|-------|--------|
| **bv-design-bind** | 蓝湖 → `design/cache/` + `bindings.md` |
| **bv-compose-write** | **优先** `design/cache/<模块>/DS-xx/schema.json` + `preview.png`；其次 MCP 实时拉；**禁止**反查 Android layout |
| **bv-accept-gate** | 对照 `preview.png` + schema 验收像素 |

---

## 禁止

- **禁止反查代码**：不得从 Android layout/XML/Compose 反推色值、间距填 bindings
- 从墨刀截图推断色值、字号、间距
- 无 binding、无 cache 批量写 Compose 页面
- 无 Lanhu 通道时伪造 schema/预览

---

## 触发示例

```text
@bv-design-bind
模块：device-search
蓝湖：https://lanhuapp.com/web/#/item/project/stage?pid=537f6e5a-6555-4108-8771-28d5f167d8ae&teamId=7e6fd821-1dab-4f48-8c32-80325d496c49
版本：1.4.6
```

```text
@bv-design-bind 仅补拉 DS-05
模块：device-search
画板链接：<单页 URL>
```

---

## 下一步

→ **bv-work-plan** → **bv-accept-gate** → **bv-compose-write**

## 完成时必须输出（handoff）

Skill 结束回复末尾 **必须** 含 [skill-handoff.md](../bv-refactor-pipeline/references/skill-handoff.md) 结构，至少包括：

1. 本步产物：`design/bindings.md`、`design/cache/<模块>/` 路径列表  
2. **下一命令**：`@bv-work-plan 模块：<名>`（未拆 plan 时）  
3. **纪律提醒**：design 只在 Spec 仓；**禁止** 在 Android 仓写 UI 直到 bind 完成  
4. **视觉下游**：compose 每批读 `DS-xx/preview.png` + `schema.json`，色值进 `Color.kt`，模块末做 gate **MT**

## 延伸阅读

- [references/lanhu-mcp-setup.md](references/lanhu-mcp-setup.md) — 一次性 MCP/Cookie 配置
- [references/cache-layout.md](references/cache-layout.md) — 缓存目录与 meta 字段
