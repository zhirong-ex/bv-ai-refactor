---
name: bv-compose-write
description: >-
  按 bv-work-plan 工步编写 Jetpack Compose 代码。Use when @bv-compose-write,
  Compose 实现, feature module implementation, or XML to Compose refactor step.
  必须遵循 MVVM + UDF、浅调用、每批必编译；单批 ≤20 文件；一批一 commit + tag；结束后等人 CR/冒烟。
  默认只做一批就停，下一批新开对话并贴 路线图.md / 架构规则.md。
---

# bv-compose-write — 工步 → Compose 代码

流水线 **Phase 7**。每次只执行 **plan 中的一个工步 / 一批**。目录：`@bv-index`。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

**架构必读**：[references/architecture.md](references/architecture.md)（MVVM + UDF、浅调用）  
**协议扩展**：[references/protocol-ext.md](references/protocol-ext.md)（Connect / Cast / Mirror：Port + 注册表）  
**批次边界**：[references/batch.md](references/batch.md)（每批必编译、≤20 文件、tag、人工三关）  
**给人贴的两页**：Android `docs/ai/架构规则.md`、`docs/ai/路线图.md`  
**Side Effects**：[references/side-effects.md](references/side-effects.md)（[官方文档](https://developer.android.com/develop/ui/compose/side-effects?hl=zh-cn) + 本工程 Route/UiEffect 用法）  
**App Quality / 内存**：[references/app-quality-memory.md](references/app-quality-memory.md)（[Google 博客](https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html) — **会更新，开工前须对齐 §0 同步纪律**）  
**自动化测试**：[references/automated-testing.md](references/automated-testing.md)（**AT 优先，MT 仅兜底**；每工步 `testNormalGpDebugUnitTest`）  
**业务日志**：[references/logging.md](references/logging.md)（`AppLog` + `BV-Ad` / `BV-Mirror` / `BV-Cast` 等固定 tag，方便 logcat 过滤）  
**Android CLI**：[references/android-cli.md](references/android-cli.md)（官方 `android`：文档库、模拟器、layout/截图、安装；不替代 Gradle 与 bv 产品纪律）

## 输入

| 字段 | 必填 | 说明 |
|------|------|------|
| plan 文件 | 是 | Android 工程 `docs/ai/plan/<模块>-compose.md`（主本）；或 Spec 仓库 `plan/` 归档副本 |
| 工步编号 | 是 | 如「工步 3」 |
| Android 工程路径 | 是 | 含 `app/src/main/java/<applicationId>/` 的目标工程（分层见「目录约定」） |

## 读取范围（Android 纪律）

**行为主本**：`docs/ai/existing-logic/` + `git-history.md`。PRD **没写**的现网路径 **照做**。Manager 进 data Repository。

**辅本清脏**：spec、蓝湖、registry EVT/CFG。`known-gaps` 标为脏代码的 **不迁**。墨刀有代码无 → 默认不加。

**registry**：给仍存活的 CFG/EVT 打 ID；已注释事件不接。

**可读代码**（迁移，行为以 existing-logic 为准）：

- `**/src/main/java/**`、`**/src/main/kotlin/**`
- `AndroidManifest.xml`、模块 `build.gradle*`
- 小型 `res/values/**`、`layout/**`
- **不读** NDK、`.so`、`build/`、`.gradle/`（除非用户明确提 native）
- **不读** `modao-output` 全文（只读已合并 spec；行为不跟墨刀）

## 工程形态（硬规则）

- **app 单模块**：Compose 重构写在 `app/` 内；**禁止**新建 Gradle `:feature:*` module，也**禁止**再建 `feature/` **包目录**（易与 Gradle feature 混淆，且把 UI/数据揉在同一模块夹里）。
- spec 模块名 → **`presentation/screen/<模块包名>/`**（连字符去掉，如 `device-search` → `devicesearch`）。**不是** `feature/<模块>/`。
- Android 工程根维护 **`docs/`**（如 `docs/compose-mvvm-udf.md`）；架构变更与代码一并 git add。

## 目录约定（app 包内 · Clean 分层）

```text
app/src/main/java/<applicationId>/
  domain/                         # 纯业务，零 Android / Compose / SDK 实现
    model/                        # 业务实体（非 UiState）
    repository/                   # Repository **接口**
    usecase/                      # 可选；跨屏复用或复杂流程再抽
  data/                           # 实现层：包现有 Manager / SDK / SP
    repository/                   # 接口实现
    local/                        # DataStore / SP / Room（新持久化）
    remote/                       # 若有 Retrofit/WS；多数镜像走 SDK 则薄封装
    cache/                        # 内存缓存（若有）
  presentation/                   # 仅 Compose UI + ViewModel
    screen/                       # 按 spec 模块分包（与 plan 1:1）
      devicesearch/
        DeviceSearchScreen.kt
        DeviceSearchRoute.kt
        DeviceSearchViewModel.kt
        DeviceSearchUiState.kt    # 可拆 *UiEvent.kt / *UiEffect.kt
        DeviceListItem.kt         # 仅本屏私有组件
    common/                       # 跨屏 UI
      theme/                      # Color.kt Type.kt Theme.kt（AppTheme 唯一入口）
      SystemBars.kt
      ImmersiveComponentActivity.kt  # Compose 宿主基类（edge-to-edge）
      （按钮、对话框壳等）
  di/                             # 组装：Repository 绑定、日后 Hilt Module
  core/                           # 基础设施
    network/                      # 拦截器、错误（若有）
    navigation/                   # NavHost / 路由图
    utils/                        # AppLog、与 UI 无关的工具
  ui/                             # 遗留 XML Activity（只迁出、不往里加新业务）
  ads/ billing/ …                 # 遗留 Manager，由 data/repository 调用，不在 Composable 直调
docs/
```

依赖方向（硬规则）：

```text
presentation → domain ← data
     ↓              ↑
    core           可依赖 Android / 既有 SDK
domain 不得 import android.*、Compose、AdManager、MirrorManager
```

参考：[MVVM + UDF](https://juejin.cn/post/7582857981894148137)。UseCase **不强制**：ViewModel 调一个 Repository 即可；两个 Screen 共用同一流程或状态机变厚再进 `domain/usecase/`。

本工程 **尚未接 Hilt**：`di/` 先放手动组装（如 `RepositoryModule` 对象 / 工厂）。引入 Hilt 须单独工步（依赖 + Application），不要为分层在首屏强行加 Dagger。

### 公共代码唯一归属（全局一份）

| 代码性质 | 归属 |
|----------|------|
| Color / Type / AppTheme、Insets、通用 Composable | **`presentation/common/`**（主题在 **`common/theme/`**） |
| AppLog、格式化、无 UI 工具 | **`core/utils/`**（遗留 `utils/CommonUtils` 过渡期可并存，新代码不往旧包加） |
| 导航 | **`core/navigation/`** |
| 业务实体、仓库接口、UseCase | **`domain/`** |
| Manager/SDK/SP 实现 | **`data/`** |
| 一屏的 Screen / VM / UiState / 私有小组件 | **`presentation/screen/<模块>/`** |
| Hilt/工厂 | **`di/`** |

**新建文件前自检**：

1. 另一屏也会用？→ `presentation/common/` 或 `core/` 或 `domain/`，不要放进某个 `screen/`
2. 公共目录是否已有同类？→ 扩展，不复制
3. 带屏幕前缀但逻辑通用？→ 去掉前缀迁公共目录并删旧文件
4. **禁止**再创建 `…/feature/` 包

**迁移**：旧 skill 若已写出 `feature/` 或根目录 `compose/`，工步内迁到上表路径，不要两套并行加新文件。

### Compose Theme 集中管理（Color / Type / Theme）

**硬规则**：颜色、字体（Typography）、Material 主题入口 — **全局只维护一份**，放在 **`presentation/common/theme/`**；**禁止**在 `presentation/screen/` 内另建 Theme/Color，也**禁止**在 Composable 内散落 `Color(0xFF…)`、硬编码字号。

**标准文件**（首模块开工或首次 Compose 页时建立；后续模块只引用、不复制）：

| 文件 | 职责 |
|------|------|
| **`presentation/common/theme/Color.kt`** | `ColorScheme` / 语义色（primary、surface、onSurface…）；色值对齐蓝湖 DS-xx 与 `design/bindings.md`；legacy `colors.xml` 迁移时在此映射，Screen 不引用 `R.color` |
| **`presentation/common/theme/Type.kt`** | `Typography`（titleLarge、bodyMedium…）；字号/字重/行高集中定义 |
| **`presentation/common/theme/Theme.kt`** | `@Composable fun AppTheme(content: @Composable () -> Unit)` — **全工程唯一** `MaterialTheme(...)` 包装入口 |

**使用约定**：

1. **Activity / Route 根**：`setContent { AppTheme { … } }`，不用裸 `MaterialTheme { }` 作生产入口
2. **Screen / 子 Composable**：读 `MaterialTheme.colorScheme.*`、`MaterialTheme.typography.*`；局部样式用 `.copy(...)` 时**不得**再写死色值/字号
3. **`@Preview`**：包一层 `AppTheme { … }`，与真机一致
4. **新增 DS token**：先加到 `presentation/common/theme/`，再给 Screen 引用；禁止先在某个 Screen 写死
5. **首工步检查**：若工程尚无 `presentation/common/theme/Theme.kt`，须先建 theme；若尚无 `core/utils/AppLog.kt`，同一工步先建 AppLog（见 [logging.md](references/logging.md)）

**gate 自检（Theme）**：`presentation/screen/` 内无 `Color(` 字面量（theme 包除外）；无各屏私有 Theme 文件。

## 架构纪律（硬规则）

### MVVM + 单向数据流（UDF）

```text
Data → Repository → ViewModel → UI
UI 触发 UiEvent ↑              ↓ StateFlow<UiState> 驱动重组
```

1. **状态向下、事件向上**；Composable 不直接改 ViewModel 状态
2. **ViewModel** 是 `UiState` 唯一来源；业务 / Repository 只在 ViewModel 及以下
3. **Route** 负责 `collectAsStateWithLifecycle()`、收集 `UiEffect`（`LaunchedEffect`）；**Screen** 仅 `(state, onEvent)`
4. 一次性副作用（导航、Toast、打开系统设置）→ **`UiEffect` + SharedFlow**，不塞进持久 `UiState`
5. UI 临时态（输入框内容、局部展开）→ Composable 内 `remember`；业务态 → ViewModel
6. 新代码统一 **StateFlow** + **`copy` 不可变更新**，不用 LiveData

### Compose 设计原理

1. **单 Activity + Navigation Compose**（工步 10 接线）
2. 叶子 Composable **无状态**；可复用块 `(state, onEvent)` 入参
3. 每个主要 Screen 提供 `@Preview` + mock `UiState`
4. 主题/色值/字号 → **`presentation/common/theme/`**（`AppTheme` + `MaterialTheme.*`）；Composable 内不硬编码
5. Composable **不**调用 Repository、**不**直接 `logEvent`、**不**打 `AppLog` / `Log.d`（日志在 ViewModel / Repository，见 [logging.md](references/logging.md)）
6. **Side Effects** 遵循 [references/side-effects.md](references/side-effects.md)：`UiEffect` 在 Route `LaunchedEffect` 收集；用户点击 suspend 用 `rememberCoroutineScope`；禁止在 Composable 函数体 `scope.launch` 替代 `LaunchedEffect`
7. **内存与 App Quality** 遵循 [references/app-quality-memory.md](references/app-quality-memory.md)：Lazy 列表、Coil 图片、无 Context 进 ViewModel、`onTrimMemory`、R8 release；文档会更新 → 距 `last_synced` 过久或用户给链接时须重读主文

### 屏幕适配（手机 / 平板 / 折叠屏）

1. 使用 **WindowSizeClass** + Material3 **Adaptive**（`ListDetailPaneScaffold` 等）
2. `domain/model/WindowLayoutUi`（或 Screen 参数；Compact / Medium / Expanded / DualPane）
3. 宽屏/折叠展开：列表+详情双栏；窄屏：单栏 + 导航
4. 折叠态切换 **不重建 ViewModel**；gate 须覆盖 Compact + Expanded
5. 详情见 [references/architecture.md](references/architecture.md) §3

### 系统栏与安全区（状态栏 / 导航栏）

**硬规则**：顶栏（返回、标题、刷新）、底部固定区（native 广告、主 CTA、列表末项）**不得**被状态栏或导航栏遮挡；设计稿按 **安全区内** 排版，实现时预留 inset 高度。

| 阶段 | 要求 |
|------|------|
| **设计对齐** | 读蓝湖 DS-xx 时确认内容区起止线；若稿图为全屏出血，实现仍须加 **状态栏 + 导航栏** inset，不得按稿图 0 边距贴边 |
| **Activity** | 新 Compose 宿主 **继承 `ImmersiveComponentActivity`**（内部走 `SystemBars.applyImmersive`）；**禁止**裸 `ComponentActivity` 或各页重复开 edge-to-edge；**inset 由 Screen 消费** |
| **Screen / 根布局** | 根 `Column`/`Scaffold` 加 **`Modifier.safeStatusBarsPadding()`**（`presentation/common/SystemBars.kt`）与 **`Modifier.navigationBarsPadding()`**（底栏）；或 LazyColumn **`contentPadding`** 含底部 inset |
| **局部固定块** | 仅顶栏：`safeStatusBarsPadding`；仅底部广告/按钮：`navigationBarsPadding`；`LazyColumn` 用 **`contentPadding`** 含底部 inset，避免末项滚入导航栏下 |
| **Dialog / Overlay** | 全屏遮罩仍须 respect 安全区；居中弹窗限高时正文可滚动，**主按钮**不被导航栏挡住 |
| **迁移对照** | 遗留 XML 页常用 `UniversalConstant.windowStatusBarHeight` / `windowNavigationBarHeight`（MainActivity 写入）；Compose **优先 `presentation/common/SystemBars.kt` 的 WindowInsets API**，仅在 inset 未就绪时可作 fallback，**禁止**写死 24dp/48dp |
| **gate 自检** | 每模块 Screen 工步：Compact 真机/模拟器目检顶栏可点、底栏 CTA/广告完整可见；折叠/手势导航机型再测一轮 |
| **billing 购买页** | 任意屏高内容过长时，首帧 focus 后按**最小 scroll** 使**最后一个 CTA** 完整可见（含阴影与 nav inset），重点突出末位购买钮；**不**无脑滚到底；多 CTA 取末位；FUNNY 底栏加 `navigationBarsPadding` |

**禁止**：`enableEdgeToEdge` 后不加 inset、全屏 `fillMaxSize` 从 (0,0) 画顶栏/底栏、Preview 无 inset 却当作真机验收通过。

### 其他

- 配置：registry `CFG:<key>` 或项目 ConfigManager
- 埋点：`AppAnalytics` / Statistics，在 ViewModel 或 UiEffect（**不是**调试日志）
- **调试日志**：只走 **`core/utils/AppLog` + `AppLogDomain`**（`BV-Ad` / `BV-Mirror` / `BV-Cast`…）；见 [references/logging.md](references/logging.md)
- 文案：`strings.xml` ↔ registry `I18N:<key>`
- UI 视觉：蓝湖 + `design/bindings.md` DS-xx（**只辅助外观**）
- 行为：**existing-logic**，不跟墨刀改状态机

## UiState 对齐

existing-logic 状态机每个状态 → `UiState` variant。墨刀子画布若多出分支：仅当 existing-logic 也有才做枚举；否则 gaps、本工步不做。

## 批次推进（默认：做完一批就停）

**不要**在同一对话里连续跑完整模块。细节见 [batch.md](references/batch.md)。

```text
方案清单（等人审）→ tag refactor-batch-NN-start
→ 改 1～3 文件就 compile → AT → gate
→ 更新 docs/ai/路线图.md → commit 一次 → tag refactor-batch-NN-done
→ 停：等人 CR + 冒烟；下一批新开对话并贴 路线图 + 架构规则
```

| 环节 | Agent |
|------|--------|
| **方案审核** | 动手前列出本批文件（≤20）与行为点；**未获人同意不改代码**（本对话已明确「按方案写 NN」可视为同意） |
| **编译** | 每改一小撮文件就 `./gradlew :app:compileNormalGpDebugKotlin`。**禁止**攒完再修编译。红了只修编译；两轮仍红则停 |
| **文件数** | 本批涉及文件 **≤15，硬顶 20**；超出拆批 |
| **AT / gate** | 同前；AT 失败不 commit |
| **commit** | **一批一次**；含新建 `.kt` |
| **tag** | 开始 `refactor-batch-NN-start`，成功后 `refactor-batch-NN-done` |
| **停** | 给 CR 摘要、冒烟项、下一批粘贴包。**不自动开 NN+1** |

用户写明「本窗口继续下一批」才可在同对话做下一批（仍要先 tag、仍要编译节奏）。

## 工步执行

1. 读 `docs/ai/路线图.md` 当前 NN + plan 工步；列出本批文件，等人方案审核（若尚未同意）
2. `git tag refactor-batch-NN-start`
3. 读 existing-logic / 代码入口；**浅调用**（VM → RepositoryImpl → Manager）
4. 实现：**每改 1～3 个 kt 就 compile**；红则只修编译
5. 文件将超 20 → 停下，把剩余退回下一批
6. AT → 系统栏/layout（若本批含 Screen）→ AppLog 抽查 → gate
7. 更新路线图与 plan 进度
8. **一个 commit**（含 `docs/ai/路线图.md`、`架构规则.md` 若有改）
9. `git tag refactor-batch-NN-done` → 输出 CR/冒烟/粘贴包 → **停**

## Git commit 约定

- **粒度**：**每批恰好一个 commit**（通常 = 一个 plan 工步；工步过大则拆批仍各一 commit）
- **范围**：本批源码 + `docs/ai/plan/` + `docs/ai/路线图.md`
- git add 另加：`docs/ai/路线图.md` `docs/ai/架构规则.md`
- **不提交**：`.env`、密钥、本地 Cookie、`.kotlin/`、`build/`；Spec 仓库 `spec/` 仅在需求变更时另 commit
- **message 格式**：

```text
<模块名>: compose 工步 <N> — <plan 工步标题短句>

例：device-search: compose 工步 2 — 配置读取（showNativeAd）
```

- **push**：默认不 push；用户说「push / 提 PR」时再执行
- 用户明确要求「整模块一次 commit」时方可合并提交（例外，需记录原因）

### 暂存（必须纳入新建 `.kt` / `.java`）

工步常会 **新建** `ViewModel`、`Repository`、`ui/*Screen.kt` 等文件；**禁止**只 `git add -u` 或只 add 已修改文件，否则新文件会留在 untracked、commit 漏代码。

**commit 前流程**（编译已绿之后）：Agent **自动** `git add` / `commit` / 打 `*-done` tag；**不 push**。CR 与冒烟仍等人。

1. **检查**：`git status` + `git diff --stat`（看清 modified 与 untracked）
2. **暂存本工步源码**（`<模块包名>` 如 `devicesearch`）：

```bash
git add app/src/main/java/com/boost/mirror/sender/presentation/screen/<模块包名>/
git add app/src/main/java/com/boost/mirror/sender/domain/
git add app/src/main/java/com/boost/mirror/sender/data/
git add app/src/main/java/com/boost/mirror/sender/presentation/common/
git add app/src/main/java/com/boost/mirror/sender/di/
git add app/src/main/java/com/boost/mirror/sender/core/

git add app/src/main/AndroidManifest.xml
git add app/build.gradle app/build.gradle.kts gradle/libs.versions.toml

git add docs/ai/plan/ docs/ai/gate/ docs/ai/testing.md docs/ai/路线图.md docs/ai/架构规则.md

git add app/src/test/java/com/boost/mirror/sender/presentation/screen/<模块包名>/
git add app/src/test/java/com/boost/mirror/sender/domain/
git add app/src/test/java/com/boost/mirror/sender/data/
git add app/src/test/java/com/boost/mirror/sender/core/
git add app/src/androidTest/java/com/boost/mirror/sender/presentation/screen/<模块包名>/
```

3. **复核**：再跑 `git status` — 本工步范围内 **不应再有** `Untracked` 的 `.kt` / `.java`；若有则补 `git add` 后再 commit
4. **提交**：`git commit`（message 见上）；成功后 `git status` 确认干净（除刻意不提交的生成物）

**禁止**：工步 commit 后 `git status` 仍显示本模块新建 `.kt` 未跟踪。

## native 边界

AirPlay、录屏、JNI 等：**默认保留** native/SDK，只重写 Kotlin 编排层与 Compose UI；Repository 封装既有 Manager/SDK。

## 禁止

- **禁止为包装而包装**：无故 UseCase/Facade。Connect/Mirror 只用 **Registry + Port**，不要再深一层
- **禁止在 ViewModel 里按品牌 if/when 调 SDK**（须走 BrandRouting + Port；系统 Miracast 也是 Port）
- **禁止攒改动再修编译**：必须改一点编一点；编译红不准继续加功能
- **禁止单批超过 20 个文件**；禁止一批多个 commit 或一个 commit 塞多批
- **禁止同一对话默认连跑下一批**；禁止跳过方案审核 / 把 AT 当成冒烟过关
- **禁止**新建 Gradle `:feature:*` module，也**禁止**新建 `feature/` Kotlin 包
- **禁止**用 `android create` 覆盖或另起工程替代本仓库
- **禁止把脏代码迁进 Compose**：`known-gaps` 脏代码、已注释埋点、ChangeLog 已删功能
- **禁止因 PRD 没写就删现网路径**：漏写的需求以代码为准
- **禁止用墨刀覆盖仍存活的状态机/广告/连接**（除非用户要改产品）
- 跨工步一次改完整个模块
- Composable 内业务分支地狱 / 直接调 SDK / 直接调遗留 Manager
- 硬编码中文（应用 I18N key）
- LiveData 新代码、DataBinding 双向绑定
- 折叠屏单独 Activity；写死 sw600dp 替代 WindowSizeClass
- **`enableEdgeToEdge` 后顶栏/底栏不加 WindowInsets padding**
- **在 `presentation/screen/` 内重复实现** 应收口到 `presentation/common/` / `core/` / `domain/` 的代码
- **在 Screen 包内定义 Theme / Color / Typography**，或硬编码 `Color(0x…)` / 字号
- 生产代码根节点使用裸 **`MaterialTheme { }`** 而非常规 **`AppTheme { }`**
- **domain 依赖 Android / Compose / AdManager 等 SDK**
- **新代码用 `Log.d` / Activity `TAG` / 再往 `CommonUtils` 加日志 buffer**（应走 **`core/utils/AppLog`**）
- **长列表 `Column + forEach` 全量组合**、裸 **`BitmapFactory.decode`** 大图、**ViewModel 持有 Context/Activity/View**
- **release 关闭 R8 优化**（`fullMode=false`、全局 `-dontoptimize`）或 **`largeHeap` 规避内存优化**
- **Backup/换机** 备份与 Keystore 绑定的 metadata 不一致（见 app-quality-memory §4）

## 下一步

本批：compile 绿 → gate AT → commit → `*-done` tag → **停，等人 CR + 冒烟**  
下一批：**新开对话**，贴 `docs/ai/路线图.md` + `docs/ai/架构规则.md` + plan 下一工步

## 完成时必须输出（handoff）

每批结束回复末尾 **必须** 含 [skill-handoff.md](../bv-refactor-pipeline/references/skill-handoff.md) 结构，至少包括：

1. 本批改动文件、tag 名、通过的 `AG-*` / `AT-*`  
2. **对照设计**：本批涉及的 DS-xx 是否已读 `preview.png` / `schema.json`；色值是否进 `Color.kt`  
3. **下一命令**：同模块下一工步 `@bv-compose-write`（新对话）或模块末 **MT 清单**  
4. **模块末**：提醒跑 gate 全部 **MT** → Spec 仓 bindings `done` → 下一模块从 `@bv-design-bind`
