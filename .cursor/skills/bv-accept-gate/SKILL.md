---
name: bv-accept-gate
description: >-
  为模块与工步生成验收门禁清单。Use when @bv-accept-gate, 验收, acceptance
  gate, or verifying Compose refactor steps before proceeding.
  bv-compose-write 每工步完成后自动对照 AG 自检，通过后再 commit。
---

# bv-accept-gate — 验收门禁

流水线 **Phase 6**。与 bv-work-plan 工步一一对应。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

## 目标

输出 `gate/<模块名>.md`：可执行的手工验收（+ 可选编译/测试），未通过不开下一工步。

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| 模块名 | 是 | |
| spec | 是 | `spec/modules/<模块>.md` |
| plan | 是 | `plan/<模块>-compose.md` |
| learn | 否 | `learn/incidents/` 回归项 |

## 输出

```markdown
# device-search — 验收 Gate

## AG-device-search-01 模块骨架
- **操作**：编译 `:app:assembleDebug`
- **预期**：成功，Route 可导航进入空态

## AG-device-search-03 设备列表 UI
- **操作**：进入搜索页，mock 2 台设备
- **预期**：列表 2 条；文案 key `airplay_search_title`
- **回归**：INC-2024-042（若有）

## 配置矩阵（若涉及 CFG）
| 组合 | 操作 | 预期 |

## 屏幕适配（Compose 模块必含）

| 编号 | 场景 | 操作 | 预期 |
|------|------|------|------|
| AG-*-layout-compact | 手机竖屏 | 进入模块主屏 | 单栏布局；关键 CTA 可见 |
| AG-*-layout-expanded | 平板/折叠展开 | 同路径进入 | 双栏或 max-width 布局；状态与 Compact 一致 |
| AG-*-layout-fold | 折叠切换 | 折叠↔展开切换 | ViewModel 状态不丢失；无重复导航 |

## App Quality / 内存（Compose 模块建议含）

> 依据 [app-quality-memory.md](../bv-compose-write/references/app-quality-memory.md) 与 [Google 博客](https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html)

| 编号 | 场景 | 操作 | 预期 |
|------|------|------|------|
| AG-*-mem-list | 长列表 | 进入含设备/条目列表的屏 | 使用 LazyColumn/LazyRow + key；无全量 Column 组合 |
| AG-*-mem-image | 图片 | 列表含图标/封面 | Coil/AsyncImage；无裸 BitmapFactory 大图 decode |
| AG-*-mem-leak | 生命周期 | 进入屏 → 返回 ×3 | 无 DisposableEffect 空 onDispose；ViewModel 无 Context |

## 业务日志（Compose 逻辑工步必含）

> 依据 [logging.md](../bv-compose-write/references/logging.md)

| 编号 | 场景 | 操作 | 预期 |
|------|------|------|------|
| AG-*-log-domain | 本工步关键路径 | 复现加载/连接/镜像/广告等 | logcat 出现对应 `BV-Ad` / `BV-Mirror` / `BV-Cast` 等，无新的 Activity TAG / 裸 `Log.d` |

## 埋点（若涉及 EVT）
| 事件 | 操作 | 预期触发 |
|------|------|----------|
```

## 编号规则

`AG-<模块名>-<两位序号>`，与 plan 工步「验收」字段一致。

## 验收类型

1. **编译**：assembleDebug / 模块惯用命令
2. **人工**：操作步骤 → 预期（必须具体）
3. **UI**：对照蓝湖 DS-xx（说明看哪些点）
4. **配置矩阵**：至少 2～3 组组合（若有 CFG）
5. **埋点**：按 registry `trigger` 字段 walkthrough（若有 EVT）
6. **回归**：关联 `learn/incidents/` 中 INC 编号
7. **App Quality / 内存**：含列表/图片的模块至少 AG-*-mem-list、AG-*-mem-image（见上表）；auth 模块加换机/Backup 对照 spec
8. **业务日志**：含 SDK/广告/连接/镜像的工步加 AG-*-log-domain；新代码走 `AppLog`
8. **自动化优先**：每条 AG 标注 `automated: AT-*` 或 `manual: MT-*`；见 [automated-testing.md](../bv-compose-write/references/automated-testing.md)

## 规则

- **行为**：existing-logic 现网路径（含 PRD 未写）；**不迁** known-gaps 脏代码；**视觉**蓝湖 DS-xx
- 禁止「测试通过」类空验收
- plan 每工步至少一条 AG
- gate 失败 → bv-fix-record（若需记录）→ 修复 → 重跑同一 AG

## 工步内自检（bv-compose-write 调用）

`bv-compose-write` 每完成一工步后**自动**读本 skill，**不等用户手动跑 gate**：

1. 打开 Android 工程 `docs/ai/gate/<模块>.md`（主本）或 Spec 仓库 `gate/<模块>.md`
2. 定位 plan 当前工步对应的 `AG-<模块>-<序号>`
3. **先跑 AT**：`./gradlew :app:testNormalGpDebugUnitTest`（及 plan 要求的 connected）；失败 → 修复 → 不重跑 gate 通过项
4. 按 AG「操作 → 预期」自检：
   - **编译类**：Agent 直接跑 Gradle，以 BUILD SUCCESSFUL 为准
   - **AT 类**：对应 `AT-*` 单测/UI 测已绿
   - **UI/状态类**（无 AT 时）：`@Preview`、mock `UiState`、代码与 spec 对照
   - **配置矩阵**：Repository/ViewModel 逻辑与 registry 默认值一致
   - **MT 类**（真机/SDK/广告/线上埋点）：标注「待 QA」，**不阻塞** commit，模块末工步须全部 MT 有责任人
5. **全部 AT + 可静态验证项通过** → 视为当前工步 gate 通过 → 触发 **bv-compose-write** 的 commit → 下一工步
6. **失败** → 修复本工步 → 重跑同一 AG/AT，**禁止**开下一工步

## Git commit 与 gate 的关系

- **每工步 gate 通过后 commit 一次**（由 bv-compose-write 执行，非本 skill 单独 commit）
- commit message 含模块名 + 工步编号，便于与 `AG-*` 一一对应、git bisect
- 模块全部 AG 通过 ≠ 额外再 commit；最后工步 commit 即包含联调结果

## 模块完成

该模块所有 AG 通过 + bindings 对应 DS 标 `done` → 可进入下一模块。

## 下一步

工步内：compose-write 自检通过 → commit → 下一工步  
模块全部完成 → 跑完 **MT** → bindings DS 标 `done` → 下一模块；全 App 完成 → **bv-spec-lite**

## 完成时必须输出（handoff）

结束回复末尾 **必须** 含 [skill-handoff.md](../bv-refactor-pipeline/references/skill-handoff.md) 结构，至少包括：

1. 产物：`docs/ai/gate/<模块>.md`、本模块 MT 清单（`MT-*` 编号列表）  
2. **下一命令**：`@bv-compose-write` + plan 工步 1（方案已审时）  
3. **提醒**：AT 阻塞 commit；**MT 对照** `design/cache/<模块>/DS-xx/preview.png`，模块末必须验
