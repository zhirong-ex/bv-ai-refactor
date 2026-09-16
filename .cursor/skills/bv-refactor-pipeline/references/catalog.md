# bv-* Skill 目录

路径：`~/.cursor/skills/bv-*` → 本仓 `AI/.cursor/skills/`。  
总入口：`@bv-index` 或 `@bv-refactor-pipeline`。

---

## 口径（全局）

| | |
|--|--|
| 行为主本 | 现网代码 → `docs/ai/existing-logic/` + `git-history.md` |
| 辅本去脏 | 墨刀 spec、蓝湖、registry EVT/CFG、ChangeLog |
| PRD 没写 | **按代码做** |
| 墨刀多出 | 默认不加 |
| 连接/镜像 | `domain/protocol` + `data/protocol` Port 注册表，见 compose-write `protocol-ext.md` |
| 写码批次 | ≤20 文件；改一点就编译；一批一 commit；`refactor-batch-NN-start/done`；下一批新对话 |
| 人工 | 方案审核、CR、冒烟 |
| 写法 | 做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述 |

不要把这些 skill 做成 MCP 函数；继续 `@skill`。

---

## 流水线

```text
Phase 1      bv-modao2prd         墨刀分享链 → Archive PRD
Phase 1.5    bv-prd-reconcile     多 Archive 去重 + ChangeLog 补缺
Phase 2      bv-spec-canonical    Archive → spec/modules（UI 辅本，不覆盖代码行为）
Phase 3      bv-table-sync        飞书 → registry CFG/EVT/I18N
Phase 3.5    bv-existing-logic    Android 反查 → docs/ai/existing-logic/（行为主本）
Phase 4      bv-design-bind       蓝湖 → design/bindings.md + cache
Phase 5      bv-work-plan         → docs/ai/plan/<模块>-compose.md
Phase 6      bv-accept-gate       → docs/ai/gate/<模块>.md
Phase 7      bv-compose-write     仅一批 Compose；停等人
Phase 8      bv-spec-lite         全量 Compose 后瘦文档
横切         bv-fix-record        修 bug 写入 learn/
旁路         bv-debug-console     INTERNAL Debug 控制台（不在主链）
```

**zhongnan**：`startFrom: existing-logic`。Phase 2 可后补。

---

## 各 skill

| Skill | 读什么 | 写什么 | 不做什么 |
|-------|--------|--------|----------|
| **bv-modao2prd** | 墨刀 sharing URL | `modao-output/` | 不读 Android 定产品 |
| **bv-prd-reconcile** | 多个 Archive + ChangeLog | `_reconciled/` | 不写代码 |
| **bv-spec-canonical** | Archive + existing-logic 对照 | `spec/modules/`、`gaps.md` | 不现场翻 Android；行为不覆盖 existing-logic |
| **bv-table-sync** | 飞书三表 | `registry/*.json` | 不从代码补 registry |
| **bv-existing-logic** | `app/src/main` 业务 Kotlin/Manifest/配置 xml | `docs/ai/existing-logic/` | 不改业务代码；不读 NDK/.so |
| **bv-design-bind** | 蓝湖 | `design/bindings.md`、cache | 不从 XML 反推色值；不改连接/广告规则 |
| **bv-work-plan** | existing-logic + spec 辅 + registry + bindings | `docs/ai/plan/` | 工步 >20 文件必须拆；脏代码不进「要做」 |
| **bv-accept-gate** | plan + existing-logic + 蓝湖 | `docs/ai/gate/` | 行为预期跟现网，不跟墨刀否定代码 |
| **bv-compose-write** | 上列 + 代码迁移 | `presentation/` `domain/` `data/` `core/`；tag+commit | 一批就停；不攒编译；VM 不品牌 if 调 SDK |
| **bv-fix-record** | 事故 | `learn/`、回写 spec/gaps | — |
| **bv-spec-lite** | 全模块完成后 | 精简 `docs/` | 未验收完不删 spec |
| **bv-debug-console** | Debug 需求 | Debug UI | 不进主重构链 |
| **bv-index** | — | — | 只导航 |

### bv-compose-write 参考文件

| 文件 | 用途 |
|------|------|
| `architecture.md` | 分层、UDF、WindowSizeClass |
| `protocol-ext.md` | Connect/Cast/Mirror Port |
| `batch.md` | 编译节奏、tag、人工三关 |
| `logging.md` | `AppLog` / `BV-*` |
| `android-cli.md` | 官方 `android` CLI |
| `side-effects.md` | UiEffect |
| `app-quality-memory.md` | 内存 |
| `automated-testing.md` | AT/MT |

给人贴：`{android}/docs/ai/架构规则.md`、`路线图.md`。

---

## 工程产物（Android 仓）

```text
docs/ai/
  existing-logic/     # 行为主本
  架构规则.md         # 新对话必贴
  路线图.md           # 批次 NN / tag
  plan/  gate/        # 工步与验收
```

代码：`app/.../domain|data|presentation|di|core`，**不要** `feature/` 包。

---

## 典型对话

```text
@bv-existing-logic          # 已做过可跳过
@bv-work-plan 模块 device-search
# 人：方案审核
# 新开对话：
@bv-compose-write
贴 路线图.md + 架构规则.md
批次 01 / 工步 1
```
