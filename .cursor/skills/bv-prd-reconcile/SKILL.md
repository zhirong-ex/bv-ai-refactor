---
name: bv-prd-reconcile
description: >-
  合并多源 modao-output Archive：墨刀重复版本以新覆盖旧，缺失版本从 Git
  ChangeLog 补充。Use when @bv-prd-reconcile, PRD 对齐, Archive 去重, or
  supplementing missing Modao versions before bv-spec-canonical.
---

# bv-prd-reconcile — Archive 对齐与去重

流水线 **Phase 1.5**（在 `bv-modao2prd` 之后、`bv-spec-canonical` 之前）。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 目标

当 Miracast 等老项目有**多个墨刀 V8 工程**（如 v1.0–v1.1.8、v1.2–v1.3.2、v1.4+ 各导一次）时：

1. **扫描**全部 `modao-output/*__token/` 来源
2. **去重**：同一 semver（如 `v1.3.0`）在多个来源出现时，**后列 `--source` 覆盖前列**（新版本工程优先）
3. **补缺**：Git `ChangeLog` 中有、墨刀 Archive 无的版本 → 生成补充 PRD
4. 产出**单一 reconciled Archive**，供 `bv-spec-canonical` 读取

**不**手动合并三个 modao-output 目录；**不**逐页人工验收全部 PRD。

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| `--project` | 是 | 项目 slug，如 `miracast` |
| `--source` | 是，可重复 | modao-output 子目录，**按时间从旧到新排列** |
| `--output` | 是 | 输出目录，如 `modao-output/_reconciled/miracast` |
| `--git-url` | 建议 | Android 工程 Git 地址（读 `ChangeLog`） |
| `--git-repo` | 二选一 | 本地已 clone 的仓库路径 |
| `--git-branch` | 否 | 默认 `main` |
| `--changelog-path` | 否 | 默认仓库根 `ChangeLog` |
| `--exclude` | 否 | 排除文件夹，默认 `待排期` |
| `--min-version` / `--max-version` | 否 | 限定版本范围 |

也可用 JSON 配置文件（推荐）：

```text
modao-output/miracast.reconcile.json
```

## 输出

```text
modao-output/_reconciled/miracast/
  manifest.json              # 机器可读：来源、去重决策、补缺列表
  report.md                  # 人工 Gate 清单
  versions/                  # 去重后的全版本 PRD（墨刀 + ChangeLog 补充）
    v1.3.0（GoogleCast协议镜像）.md
    v1.5.1.md                # 若仅 ChangeLog 有
  changelog-supplements/     # 纯 ChangeLog 补充原文
    v1.5.1.md
```

`versions/` 中墨刀来源的 `.md` 为**符号链接**回原 Archive，保留 `.exports/` 图片相对路径。

## 去重规则

1. 从文件夹名解析 semver：`v1.3.0（GoogleCast…）` → `1.3.0`
2. 同一 semver 多来源 → **`--source` 列表中后者胜出**
3. 同优先级时：画布数多者优先 → PRD 体积大者优先
4. `待排期` 等 `--exclude` 名称不进 reconciled

## ChangeLog 补充规则

Git 仓库根目录 `ChangeLog` 格式（Boostvision 惯例）：

```text
v1.5.1
    * Banner 调整
    * fix crash

v1.5.0
    * 新增设置页引流
```

- ChangeLog 有、墨刀无 → 生成 `changelog-supplements/vX.Y.Z.md`
- 补充 PRD **不含截图**，标记 `来源：ChangeLog（Git 补充）`
- `bv-spec-canonical` 合并时：墨刀批注 > ChangeLog 补充 > gaps

## 工作流

1. 确认各来源 `bv-modao2prd` 已完成（`failed: 0`）
2. 填写 `modao-output/<project>.reconcile.json` 中的 `git_url`
3. 运行 reconcile
4. 阅读 `report.md`，确认去重与补缺合理
5. 通过后 → `@bv-spec-canonical` 读 `_reconciled/<project>/`

## 命令

```bash
# 推荐：配置文件
bash scripts/run_bv_prd_reconcile.sh modao-output/miracast.reconcile.json

# 或命令行
node scripts/bv_prd_reconcile.mjs \
  --project miracast \
  --output modao-output/_reconciled/miracast \
  --source modao-output/【已上线V8】v1.0.0-v1.1.8__Ljt2Zpbutk9liqJyVlZSOt \
  --source modao-output/【已上线V8】v1.2.0-v1.3.2__71koi256sd5cg2jHyZX6p3 \
  --source modao-output/【合集V8】Miracast_GP__k2a0Owfvsd3xbucI4UGL \
  --git-url https://gitlab.example.com/group/miracast.git \
  --exclude 待排期
```

本地已有仓库时：

```bash
node scripts/bv_prd_reconcile.mjs ... --git-repo /path/to/miracast-android
```

## Gate（进 spec-canonical 前）

- [ ] `manifest.json` → `duplicates` 覆盖策略符合预期（如 v1.3.0 以 folder 2 为准）
- [ ] `changelog_supplements` 条目人工扫一眼
- [ ] `missing_in_modao` / `extra_in_modao` 已知晓，记入后续 `spec/gaps.md`
- [ ] `report.md` 全部勾选

## 禁止

- 不要手动 copy 合并三个 modao-output 目录
- 不要把 ChangeLog 补充当作 UI 规格（无墨刀截图）
- 不要跳过本步直接 `@bv-spec-canonical` 读多个散目录（易漏去重）

## 下一步

→ **@bv-spec-canonical**（输入：`modao-output/_reconciled/<project>/`）
