---
name: bv-table-sync
description: >-
  同步飞书配置表、埋点表、多语言表到本地 registry JSON。Use when
  @bv-table-sync, 飞书表同步, registry, or refreshing config/analytics/i18n
  snapshots for Android refactor.
---

# bv-table-sync — 飞书三表 → Registry

流水线 **Phase 3**。替代口头约定；实现阶段读 `registry/`，不直接读飞书。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 目标

将飞书电子表格同步为固定 schema 的 JSON，供 bv-work-plan / bv-compose-write 引用。

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| 配置表 URL | 是 | 飞书 sheets 链接 |
| 埋点表 URL | 是 | |
| 多语言表 URL | 是 | |
| App 当前版本 | 建议 | 写入 `registry/meta.json` |

同步方式：优先 `lark-cli sheets +read`；或用户导出 CSV 后手工转换。

## 输出

```text
registry/
  config.json
  analytics.json
  i18n.json
  meta.json
```

### meta.json

```json
{
  "app_version": "1.5.3",
  "synced_at": "2026-08-24T12:00:00+08:00",
  "sources": {
    "config": "https://.../sheets/...",
    "analytics": "https://.../sheets/...",
    "i18n": "https://.../sheets/..."
  }
}
```

## Schema（行对象字段）

### config.json — 数组

| 字段 | 必填 | 说明 |
|------|------|------|
| key | 是 | 远程配置键 |
| type | 是 | string / number / boolean / json / string[] |
| since | 是 | 引入版本 |
| default | 否 | 本地默认值 |
| fallback | 否 | 解析失败策略 |
| note | 否 | 语义说明 |

引用 ID：`CFG:<key>`

### analytics.json — 数组

| 字段 | 必填 | 说明 |
|------|------|------|
| event | 是 | 事件名 |
| params | 否 | 参数对象说明 |
| trigger | 是 | 采集时机（口径写清） |
| since | 是 | 加入版本 |
| note | 否 | |

引用 ID：`EVT:<event>`

### i18n.json — 数组

| 字段 | 必填 | 说明 |
|------|------|------|
| key | 是 | strings.xml 资源名 |
| zh | 是 | 简体中文（`locales['zh-rCN']` 别名，兼容引用） |
| en | 否 | 英文（`locales.en` 别名） |
| locales | 是 | 全语言 map；**表头有几列语言就解析几列**（14/16… 因项目而异），key 为 Android `values-*` 后缀 |
| since | 是 | 取自表头「版本/加入版本」；**无版本列或空单元格时默认 `v1.0.0`**；后续新增/改文案填真实版本号 |
| screens | 否 | 使用页面（表头识别，不进 locales） |
| note | 否 | |

**i18n 表头约定**

- 资源名列：`Key` / `资源名` / `文案key`
- 版本列（可选）：`版本` / `加入版本` / `since` / `version`
- 语言列：其余非元数据列；`values`→`en`，`values-zh-rCN`→`zh-rCN`，或直接 `de`、`fr` 等
- 元数据列（跳过）：`screens`、`页面`、`note`、`备注`、`说明`、`changelog`

引用 ID：`I18N:<key>`

## 工作流

1. 读取三表（或 CSV）
2. 校验必填列、去重 key/event
3. 写入四个 JSON 文件
4. 输出本版 delta 摘要：`since == 当前版本` 的行

## 实现约定（交给 bv-compose-write）

- 重构期：代码读 registry 或生成的常量
- 稳定后：bv-spec-lite 收到 `docs/config.md` + 代码内默认值

## 禁止

- **禁止反查代码**：配置键、埋点事件、文案 key 只来自飞书表（或用户提供的 CSV）；**不得**从 Android `strings.xml`、Analytics 调用、RemoteConfig 读数补 registry
- 表与 Archive/spec 不一致 → 以飞书表为准写入 JSON，差异记入 `spec/gaps.md`，不读代码消歧

## 下一步

→ **bv-existing-logic**（用 registry 的 CFG/EVT ID 标注遗留读取点）  
→ **bv-design-bind** / **bv-work-plan**

→ **bv-design-bind** → **bv-work-plan**
