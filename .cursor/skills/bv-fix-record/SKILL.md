---
name: bv-fix-record
description: >-
  将 bug 修复与踩坑经验结构化写入 learn/，并回写 spec。Use when @bv-fix-record,
  bug 记录, incident, gotchas, or documenting fixes during Android refactor.
---

# bv-fix-record — Bug / 经验沉淀

横切 skill（不占 Phase 号）。重构期 bug 多，**写进仓库**供未来 Agent 读取；不依赖对话记忆。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 目标

1. 记录单次 incident
2. 抽象可复用 gotcha
3. 行为变更时回写 `spec/modules/`

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| 现象 | 是 | 用户可见行为 |
| 根因 | 是 | 技术原因 |
| 修复 | 是 | 改动摘要 |
| 模块 | 建议 | 对应 spec 模块名 |

## 输出

```text
learn/
  incidents/
    INC-2026-001-镜像5s超时.md
  gotchas.md
```

### incident 模板

```markdown
# INC-2026-001 镜像开始 5s 超时断开

## 现象
…

## 根因
…

## 修复
…

## 回归
- …

## 关联
- spec/modules/mirror-flow.md §超时
- gate: AG-mirror-flow-07
```

### gotchas.md 条目（简短）

```markdown
- **镜像超时 Job**：连接成功必须 cancel timeout；见 INC-2026-001
- **Paywall 空 list**：禁止 `get(0)`；配置解析需单元测试
```

## 规则

1. 值得回归的 bug 才写 incident；琐碎 typo 可省略
2. 若改变产品行为 → **必须**更新 `spec/modules/` 相关节（按用户确认的预期写，**不得**「代码现状即 spec」）
3. bv-accept-gate 的 AG 项可引用 `INC-*` 作回归
4. 不自动 commit

## 与 bv-spec-lite

重构收尾时，高频 gotcha 可并入 `docs/architecture.md` 或 `docs/product.md` 的「已知约束」节。
