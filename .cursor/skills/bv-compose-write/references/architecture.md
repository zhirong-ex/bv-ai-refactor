# Compose 架构参考 — MVVM + UDF + app 包内分层

`bv-compose-write` 写代码时必须遵循。与 Android 官方架构指南及 [MVVM + UDF（掘金）](https://juejin.cn/post/7582857981894148137) 对齐。

**工程形态**：**app 单模块 + Clean 分层包**（`domain` / `data` / `presentation` / `di` / `core`）。**不要** `feature/` 包。`docs/compose-mvvm-udf.md` 与代码同步。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

---

## 0. app 目录总览

```text
app/src/main/java/<applicationId>/
  domain/
    model/                 # 业务实体（非 UiState）
    repository/            # 接口
    protocol/              # BrandRouting、ConnectPort、MirrorPort 接口
  data/
    protocol/              # ConnectPort / MirrorPort 实现 + Registry
    repository/
    local/ remote/ cache/
  presentation/
    screen/devicesearch/   # spec device-search：Screen + Route + VM + UiState
    common/theme/          # AppTheme
    common/SystemBars.kt
  di/
  core/
    navigation/
    core/utils/AppLog.kt
  ui/                      # 遗留 XML
```

依赖：`presentation → domain ← data`；**domain 零 Android**。UseCase 非必须。

**调用深度**：默认 `Screen → ViewModel → RepositoryImpl → Manager`。  
Connect/Cast/Mirror 允许 **多一次查表**：`VM → ProtocolRegistry.resolve(brand) → Port → Manager`（见 [protocol-ext.md](protocol-ext.md)）。禁止再套 Facade/空 UseCase。

| 放哪里 | 判据 |
|--------|------|
| `presentation/common/`、`core/` | 两屏以上或与 spec 模块无关 |
| `presentation/common/theme/` | Color / Type / AppTheme |
| `presentation/screen/<模块>/` | 该 spec 的 UI 状态机与私有组件 |
| `domain/` | 实体、仓库接口、UseCase |
| `data/` | 对遗留单例 / SDK 的实现 |

**禁止**再建 `feature/`；新增前先搜 `common/`、`core/`、`domain/`。

---

## 1. 总体架构：MVVM + 单向数据流（UDF）

```text
User Action
    ↓  UiEvent
ViewModel.onEvent()
    ↓  Repository / UseCase
ViewModel 更新 StateFlow<UiState>（copy 不可变）
    ↓  collectAsStateWithLifecycle()
Route → Screen(state, onEvent)   ← Screen 无业务逻辑
    ↓
Stateless Composable 树
```

一次性副作用：ViewModel emit **UiEffect** → Route 内 **LaunchedEffect** 收集 → 导航 / Toast / 打开系统页。

### 分层职责

| 层 | 职责 | 禁止 |
|----|------|------|
| **Route** | 订阅 `uiState`、收集 `uiEffect`、转发 `onEvent` | 业务判断、直接调 Repository |
| **Screen / Composable** | 纯展示：`state` 入、`onEvent` 出 | 持有 ViewModel、读 SP、打埋点 |
| **ViewModel** | `UiState` 唯一来源；`onEvent` 唯一入口；调 UseCase 或 Repository | 持有 Context、引用 Composable |
| **UseCase（可选）** | 跨屏或复杂流程 | UI 相关 |
| **Repository 接口** | `domain/repository` | Android 类型 |
| **Repository 实现** | `data/repository`：既有 Manager / native | 暴露给 Composable |

### 状态分类

| 类型 | 示例 | 存放 |
|------|------|------|
| 业务状态 | 搜索中、设备列表、弹窗类型 | `model/UiState` + ViewModel StateFlow |
| UI 临时状态 | Pin 输入焦点、局部展开 | Composable `remember` |
| 副作用 | 返回、Go Wi‑Fi 设置 | `model/UiEffect` + SharedFlow |

### UiState / UiEvent 约定

```kotlin
// presentation/screen/devicesearch/DeviceSearchUiState.kt
@Immutable
data class DeviceSearchUiState(
    val search: SearchState = SearchState.Searching,
    val overlay: DeviceSearchOverlay? = null,
    // ...
)

// model/DeviceSearchUiEvent.kt
sealed interface DeviceSearchUiEvent {
    data object BackClicked : DeviceSearchUiEvent
}

// ViewModel — 工步初期可用 viewModel()；后续可换 Hilt
class DeviceSearchViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(DeviceSearchUiState())
    val uiState: StateFlow<DeviceSearchUiState> = _uiState.asStateFlow()
    private val _uiEffect = MutableSharedFlow<DeviceSearchUiEffect>(extraBufferCapacity = 1)
    val uiEffect: SharedFlow<DeviceSearchUiEffect> = _uiEffect.asSharedFlow()

    fun onEvent(event: DeviceSearchUiEvent) { /* 唯一入口 */ }
}

// presentation/screen/devicesearch/DeviceSearchRoute.kt
@Composable
fun DeviceSearchRoute(
    onNavigateBack: () -> Unit = {},
    viewModel: DeviceSearchViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(viewModel) {
        viewModel.uiEffect.collect { /* NavigateBack 等 */ }
    }
    DeviceSearchScreen(state = state, onEvent = viewModel::onEvent)
}
```

**硬规则**：

- 状态**向下**、事件**向上**；禁止 Composable 直接改 ViewModel 内部字段
- 一次性副作用用 **UiEffect**，不与持久 `UiState` 混放
- 不用 `LiveData`；统一 `StateFlow` + `collectAsStateWithLifecycle()`
- **禁止**新建 Gradle `:feature:*` module

---

## 2. Compose 设计原理

### 状态提升与无状态 UI

- 叶子 Composable **无状态**（或仅本地瞬时 UI 态，如展开/焦点）
- 列表项、对话框等可复用块：`item: ItemUi` + `onClick: () -> Unit`
- Preview 必须可写：`@Preview` 传 mock `UiState`

### 重组与性能

- `UiState` 用 `@Immutable` / `@Stable` 标注（合适时）
- 列表用 `LazyColumn` + `key`；避免在 Composable 内 `remember { heavy() }` 无 key
- 不在 Composable 内启动协程做业务；业务在 ViewModel `viewModelScope`
- Side Effect API 选型与 UDF 分工 → [side-effects.md](side-effects.md)
- 内存 / App Quality（Android 17+ 限制、R8、Coil、泄漏、换机）→ [app-quality-memory.md](app-quality-memory.md)

### 主题与 Design System

**集中管理**：`presentation/common/theme/` 下 **`Color.kt`**、**`Type.kt`**、**`Theme.kt`**（`AppTheme`）。

| 层级 | 规则 |
|------|------|
| **定义** | 色值、字号只在 `presentation/common/theme/` |
| **入口** | Activity / Route：`AppTheme { content }` |
| **消费** | Screen 用 `MaterialTheme.*`；禁止 `Color(0xFF…)` |
| **Preview** | `@Preview` 外包 `AppTheme` |

- 间距/圆角可增 `presentation/common/theme/Shape.kt`、`Spacing.kt`
- 禁止 Composable 内硬编码色值；与 `bv-design-bind` 一致

### Navigation

- **单 Activity** + Navigation Compose
- 每模块 `<Module>Route.kt` 注册；深层链接与 spec 跳转一致
- ViewModel scope 按 **NavBackStackEntry**（`hiltViewModel()` 默认）

---

## 3. 屏幕适配（手机 / 平板 / 折叠屏）

采用 Google 官方 **Material 3 自适应布局**，稳定且主流。

### 依赖（模块 build.gradle.kts）

```kotlin
implementation(libs.androidx.compose.material3.adaptive)
implementation(libs.androidx.compose.material3.adaptive.layout)
implementation(libs.androidx.compose.material3.window.size) // WindowSizeClass
```

### WindowSizeClass + Posture

```kotlin
@Composable
fun rememberWindowLayout(): WindowLayoutUi {
    val windowSizeClass = currentWindowAdaptiveInfo().windowSizeClass
    val foldingFeature = LocalLayoutDirection.current // 配合 WindowInfoTracker 读折叠态
    return WindowLayoutUi.from(windowSizeClass, foldingFeature)
}

enum class WindowLayoutUi {
    Compact,      // 手机竖屏
    Medium,       // 小平板 / 折叠外屏
    Expanded,     // 大平板 / 折叠内屏
    DualPane,     // 折叠双屏 / 宽屏两栏
}
```

- 在 **Screen 层** 读取 `WindowLayoutUi`，写入 `UiState.windowLayout` 或作为 Screen 参数
- ViewModel **不**依赖像素；只消费抽象 layout enum（便于测试）

### 布局策略

| 场景 | 做法 |
|------|------|
| 手机 | 单栏全屏；BottomSheet / Dialog 弹层 |
| 平板竖屏 | 可选加宽 content max width（`Modifier.widthIn(max = 600.dp)`） |
| 平板横屏 / 折叠展开 | `ListDetailPaneScaffold` 或自定义 **双栏**（列表 + 详情） |
| 折叠态切换 | 监听 `WindowInfoTracker`，布局切换时 **保留 ViewModel 状态**（不重建 Nav） |
| 横竖屏 | 优先 WindowSizeClass，**不**单独写 `screenOrientation` 分支地狱 |

### 触控与输入

- 最小触控目标 48.dp
- 平板/折叠宽屏：考虑 **Rail / PermanentNavigationDrawer**（若 App 有主导航）

### 验收（写入 gate）

- 手机（Compact）与平板（Expanded）各测一条 AG-* 
- 折叠屏：折叠 ↔ 展开状态不丢数据（ViewModel 存活）
- 字体缩放 / 大字体不截断关键 CTA

### 系统栏与安全区（状态栏 / 导航栏）

Compose 页默认 **edge-to-edge** 时，系统栏区域与内容 **重叠**；必须在布局阶段计入 inset，与设计稿安全区对齐。

```kotlin
// Screen 根布局 — presentation/common/SystemBars.kt
Column(
    modifier = Modifier
        .fillMaxSize()
        .safeStatusBarsPadding()
        .navigationBarsPadding(),
) { /* … */ }

// LazyColumn 末项 / 底部固定广告
val navBottom = rememberNavigationBarBottomPadding()
LazyColumn(contentPadding = PaddingValues(bottom = navBottom + 10.dp))
```

| 要点 | 说明 |
|------|------|
| 设计 | 蓝湖标注全屏时，实现仍加 inset；顶栏高度 = 设计顶栏 + 状态栏 inset |
| Activity | 宿主 **继承 `ImmersiveComponentActivity`**（`SystemBars.applyImmersive`）；**不要**裸 `ComponentActivity` 或各页重复配置；**不要**在 Activity 里写死 margin，统一在 Compose |
| 项目常量 | 对照 `UniversalConstant.window*`；**新代码用 `presentation/common/SystemBars.kt`** |
| Preview | `@Preview` 无系统 inset 正常；**gate 以真机/模拟器为准**，不单靠 Preview |
| 对话框 | `Dialog` / 全屏 Overlay 内按钮区加 `navigationBarsPadding()` |

gate 补充项（可写入模块 `gate/<模块>.md` layout 段）：

- 顶栏返回/标题/刷新可点击，不与状态栏重叠
- 底部 native / 主按钮完整可见，不与手势条或三键导航重叠

---

## 4. 依赖注入与测试

- 工程当前 **无 Hilt**：`di/` 先手动组装；加 Hilt 单独工步
- ViewModel 单测：Fake `domain.repository` 或 Fake UseCase
- Composable 单测：mock state，不测 ViewModel

---

## 5. 与旧代码迁移

| 旧（XML 期） | 新（Compose 期） |
|-------------|-----------------|
| Activity 内逻辑 | 迁到 ViewModel + UiState |
| LiveData | StateFlow |
| DataBinding 双向绑定 | UDF：事件上行 |
| 多 Activity | 单 Activity + Route |
| SDK/native 调用 | **保留**在 Repository/Manager，ViewModel 编排 |

AirPlay、录屏、Firebase 等 **不重写 native**；只改 Kotlin 编排层与 UI。

调试日志迁到 **`core/utils/AppLog`**，见 [logging.md](logging.md)。

---

## 6. 工步与架构对齐（bv-work-plan）

| 工步 | 架构产出 |
|------|----------|
| 1 骨架 | `presentation/screen/<模块>/`：UiState / Route / 空 Screen；必要时 `domain` 接口空实现 |
| 2 配置 | ViewModel 读 CFG，不改变 UDF 形状 |
| 3–4 UI | Stateless Composable + Preview |
| 5 ViewModel | `onEvent` 完整 + UseCase 接入 |
| 6 串联 | Navigation + 副作用通道 |
| 7 适配 | `WindowLayoutUi` + 双栏/单栏布局分支 |
| 8 埋点 | ViewModel 或 UiEffect 层，不在 Composable |
| （横切）日志 | `core/utils/AppLog`；逻辑工步关键路径按域打 `BV-*` tag |
| 9 联调 | gate 含 Compact + Expanded |

---

## 7. 禁止反模式

- Composable 内 `viewModel()` 又在子 Composable 再 `viewModel()`（scope 混乱）
- 在 `UiState` 里放 `Context`、Composable lambda、MutableState
- 用 `rememberSaveable` 存业务态（应回 ViewModel）
- 折叠屏单独写一套 Activity
- 为了「快」跳过 WindowSizeClass，写死 `sw600dp` 资源目录
