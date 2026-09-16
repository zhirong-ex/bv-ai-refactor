---
name: bv-spec-lite
description: >-
  Compose 全量重构完成后，将 spec 与 registry 收敛为少量 docs/ 供未来 Agent
  维护。Use when @bv-spec-lite, 文档瘦身, spec lite, or post-refactor doc
  consolidation when Modao/Feishu tables are no longer daily inputs.
---

# bv-spec-lite — 收敛为少量 MD

流水线**Phase 8 收尾**。未来产品 Agent 只维护 `docs/` + 代码，不再日常跑墨刀/飞书表。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 前置条件

- Compose 全模块 gate 通过
- `modao-output/`、`registry/` 已与现网对齐

## 目标输出

```text
docs/
  product.md           # 全 App 产品 spec（用户路径、商业规则）
  architecture.md      # 模块、Navigation、SDK 边界、gotchas
  modules/
    device-search.md   # 每域一页（从 spec/modules 精简）
    mirror-flow.md
  config.md            # 配置键语义 + 默认 JSON（从 registry 精简）
  analytics.md         # 事件字典
  changelog.md         # 版本变更摘要
```

## 收敛规则

| 来源 | 去向 |
|------|------|
| `spec/modules/*.md` | `docs/modules/*.md`（去版本溯源细节，保留状态机+规则） |
| `registry/config.json` | `docs/config.md` + 代码内 `AppConfig` 默认值 |
| `registry/analytics.json` | `docs/analytics.md` + `AnalyticsEvents.kt` |
| `registry/i18n.json` | `strings.xml` + 可选 `docs/i18n-keys.md` |
| `learn/gotchas.md` | `docs/architecture.md` §已知约束 |
| `modao-output/` | **Archive**，日常不读 |
| `design/bindings.md` | 视觉已进 Theme/组件后可 Archive |

## docs/modules 模板（精简）

```markdown
# device-search

## 状态机
（表格）

## 规则
（交互 + 配置 + 埋点要点）

## 代码入口
- presentation/screen/devicesearch/
- Route: DeviceSearchRoute

## 验收
（冒烟 3～5 条）
```

## 未来 Agent 工作流

```
用户改需求 → 改 docs/product.md 或 docs/modules/*.md
→ bv-work-plan（可选，大改时）
→ bv-compose-write
→ 更新 changelog.md
```

不再依赖：墨刀、飞书配置/埋点/多语言表（除非大改版）。

## 工作流

1. 逐模块从 `spec/modules` 精简到 `docs/modules`
2. 合并 registry 到 config.md / analytics.md
3. 写 architecture.md（模块图 + Navigation + native 边界）
4. 写 product.md（产品级叙述）
5. 标记 `spec/`、`plan/`、`gate/` 为 Archive（可保留只读）

## 禁止

- 未验收完就删除 spec/gate（先 Archive 再删）
- docs 与 `presentation/screen/` 目录不同名
