---
name: bv-spec-canonical
description: >-
  将 modao-output 全版本 Archive PRD 合并为按模块的当前态 spec。Use when
  @bv-spec-canonical, 全版本合并, canonical spec, or preparing Compose refactor
  module specs from Modao archives.
---

# bv-spec-canonical — 全版本 → 模块当前态 Spec

流水线 **Phase 2**。输入 **Archive**，输出 **UI/信息架构辅本**（与 `modao-output` 单版本 PRD 分离）。**行为主本是 existing-logic，不是本 spec。**

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 目标

把 `modao-output/...` 全版本 `.md` 合并为 `spec/modules/<模块名>.md`，作为 **UI/信息架构辅本**。  
**现网行为主本是** Android `docs/ai/existing-logic/`，不是本 spec。

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| modao-output 目录 | 是 | 优先 `modao-output/_reconciled/<project>/`（bv-prd-reconcile 产物）；否则 bv-modao2prd 产物根 |
| 模块列表 | 是 | 如 `device-search`、`settings`、`mirror-flow` |
| existing-logic 笔记 | 否 | `spec/existing-logic/` 或 Android `docs/ai/existing-logic/`（由 **bv-existing-logic** 生成；本 skill **不得**现场反查 Android 补写） |

## 输出

```text
spec/
  modules/
    device-search.md
    settings.md
  existing-logic/          # 可选
  gaps.md         # Archive vs existing-logic vs registry 差异清单
```

## 合并规则

1. **按模块合并，不按版本堆叠**输出给 AI
2. 同一模块多处改动：**最新版本墨刀批注**优先
3. 配置/埋点/文案：只写 **registry 引用 ID**（key / event），不写具体值
4. 墨刀子画布 → spec 里一个 **state** 或 **分支**
5. Archive 有、registry 无 → 记入 `gaps.md`；**禁止**读 Android 代码补 spec 或「兼容保留」
6. Archive 缺项、registry 缺项 → 记入 `gaps.md`，等用户确认；**不得**用代码行为兜底

## 模块 Spec 模板

```markdown
# <模块名>

> 对应 Android：`presentation/screen/<模块名>/`

## 状态机

| state | 说明 | 墨刀溯源 |
|-------|------|----------|
| Loading | … | v1.4.0 |
| Empty | … | v1.4.6 |

## 交互

- 触发 / 跳转 / 异常分支

## 配置引用

- `CFG:<key>` — 简述

## 埋点引用

- `EVT:<event>` — trigger 简述

## 文案引用

- `I18N:<key>`

## 设计引用

- `DS:<bindings.md 中的 id>`

## 验收要点

- 模块级要点（细项由 bv-accept-gate 展开）

## 版本溯源

- v1.4.0 引入 …；v1.4.6 修改 …
```

## 工作流

1. 列出 reconciled Archive 的 `versions/` 下全部 `.md`（或 `modao-output` 根下各版本 `.md`）
2. 按模块名映射墨刀画布（设备搜索、设置、镜像…）
3. 自旧到新合并状态机与交互
4. 若有 existing-logic，diff 写入 `gaps.md`。spec **不覆盖**现网行为。标出墨刀无而代码有（**漏写，仍要做**）与代码死、辅本均无（**脏，不迁**）
5. 无 existing-logic 且即将 compose → **先跑 bv-existing-logic**
6. 墨刀多出的能力默认不进 compose

## 禁止

- **禁止反查代码**：不读 Android 工程推断流程、状态、配置键、埋点、文案或默认值；不以 `strings.xml` / 老 Activity / ViewModel 行为作为 spec 依据。对照用 **bv-existing-logic 产物**，需要刷新时调用该 skill，不要在本步现场翻代码
- 不要把 20 个版本 PRD 原样交给 bv-compose-write
- 不要在 spec 里写色值/间距（交给 bv-design-bind + 蓝湖）
- 不要现场生成 `spec/existing-logic/`（若需对照，由人工维护后再 diff）

## 下一步

→ **bv-table-sync**（若 registry 未就绪）  
→ **bv-existing-logic**（若 `docs/ai/existing-logic/` 缺失或过期）  
→ **bv-design-bind**  
→ **bv-work-plan**
