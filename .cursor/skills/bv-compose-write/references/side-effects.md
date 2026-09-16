# Compose Side Effects 参考

官方文档：[Side-effects in Compose](https://developer.android.com/develop/ui/compose/side-effects?hl=zh-cn)  
进阶 Codelab：[Advanced State and Side Effects](https://developer.android.com/codelabs/jetpack-compose-advanced-state-side-effects)

**副作用（Side Effect）**：在 Composable 函数作用域之外，改变 app 状态的操作（导航、注册监听、启动协程、写 Analytics 等）。Compose 提供一组 **Composition 生命周期绑定** 的 API，进入 Composition 时启动、离开时取消，避免泄漏。

---

## 1. API 选型速查

| API | 何时用 | 离开 Composition | keys 变化 |
|-----|--------|------------------|-----------|
| **`LaunchedEffect(keys) { }`** | 进入 Composition 后**自动**跑 suspend 块；订阅 Flow、动画循环、收集 `UiEffect` | 取消协程 | 取消旧协程，重启 |
| **`rememberCoroutineScope()`** | **用户事件回调**里手动 `launch`（点击开 Drawer、`scrollToItem`） | 取消 scope 内协程 | scope 实例不变 |
| **`DisposableEffect(keys) { onDispose { } }`** | 需**清理**的副作用（注册 LifecycleObserver、Listener） | 先 `onDispose` 再离开 | 先 dispose 再重装 |
| **`rememberUpdatedState(value)`** | Effect 内引用**最新** lambda/参数，但**不因它重启** Effect | — | — |
| **`produceState(initial) { value = … }`** | 把非 Compose 异步结果转成 `State`（内部基于 `LaunchedEffect`） | 取消 | 重启 |
| **`derivedStateOf { }`** | 从其它 `State` **派生**布尔/简单值，减少无效重组 | — | 仅结果变化时重组 |
| **`snapshotFlow { }`** | 在 `LaunchedEffect` 内把 Compose `State` 当 `Flow` 用（filter/collect） | 随 LaunchedEffect | — |

### keys 与重启

```kotlin
LaunchedEffect(key1, key2) { /* block */ }
```

- keys **变** → 取消当前 effect，用新 block **重启**
- 只跑一次：`LaunchedEffect(Unit) { }`（勿把不稳定 lambda 当 key）
- lambda 参数会变、但 effect 不应重启 → `rememberUpdatedState(onTimeout)` + `LaunchedEffect(Unit)`

---

## 2. LaunchedEffect vs rememberCoroutineScope（官方强调）

| | LaunchedEffect | rememberCoroutineScope + launch |
|--|----------------|----------------------------------|
| **触发时机** | 调用**进入 Composition** 时 | 仅在**你调用 launch 的回调**里 |
| **典型场景** | 订阅 ViewModel、Splash 延时、动画循环 | Button/onClick、openDrawer |
| **反模式** | 在 Composable **函数体**直接 `scope.launch { }` 做「进入页就该跑」的逻辑 | 用 scope.launch **替代** LaunchedEffect 做首屏副作用（Compose 可能多次调用 Composable 但未入 Composition，会浪费且不可控） |

**本工程 Route 标准写法**（收集一次性业务副作用）：

```kotlin
@Composable
fun DeviceSearchRoute(viewModel: DeviceSearchViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(viewModel) {
        viewModel.uiEffect.collect { effect ->
            when (effect) {
                DeviceSearchUiEffect.NavigateBack -> onNavigateBack()
                // Toast、打开系统设置等
            }
        }
    }

    DeviceSearchScreen(state = state, onEvent = viewModel::onEvent)
}
```

回调会变时用 `rememberUpdatedState`：

```kotlin
val currentOnNavigateBack by rememberUpdatedState(onNavigateBack)
LaunchedEffect(viewModel) {
    viewModel.uiEffect.collect { /* 使用 currentOnNavigateBack() */ }
}
```

---

## 3. DisposableEffect

需要 **onDispose 清理** 时用：移除 Observer、unregister、释放 View 绑定。

```kotlin
DisposableEffect(lifecycleOwner) {
    val observer = LifecycleEventObserver { _, event -> /* … */ }
    lifecycleOwner.lifecycle.addObserver(observer)
    onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
}
```

- 与 `rememberUpdatedState` 配合：Observer 内读 `currentOnStart` / `currentOnStop`，**不要**把 lambda 本身当 DisposableEffect 的 key（应用 `lifecycleOwner` 等稳定 key）。

---

## 4. produceState / derivedStateOf

### produceState

- 将 suspend / 多线程结果推入 Compose `State`
- **本工程默认**：业务态由 **ViewModel `StateFlow`** 生产；**优先** `collectAsStateWithLifecycle()`，不在 Compose 层重复映射业务 UiState
- 仅当 **纯 UI 局部**、且 spec 明确不上升 ViewModel 时，才在 Composable 用 `produceState`

### derivedStateOf

- 从频繁变化的 `State`（如 `LazyListState.firstVisibleItemIndex`）派生**布尔/简单值**
- 必须 `remember { derivedStateOf { … } }`，避免每次重组都算一遍且导致子树频繁重组

```kotlin
val showScrollToTop by remember {
    derivedStateOf { listState.firstVisibleItemIndex > 0 }
}
```

---

## 5. snapshotFlow

在 Route/Stateful Composable 内，需要「State 变化 → 回调父级」且不想 hoist 整个 state holder 时：

```kotlin
LaunchedEffect(stateHolder) {
    snapshotFlow { stateHolder.text }
        .filter { !stateHolder.isHint }
        .collect { onTextChanged(it) }
}
```

业务事件仍优先 **`onEvent` → ViewModel**；snapshotFlow 仅用于 **UI 局部 state holder** 与父组件的桥接。

---

## 6. 与本工程 MVVM + UDF 的分工

```text
ViewModel StateFlow<UiState>     → collectAsStateWithLifecycle()（非 Side Effect API，是状态订阅）
ViewModel SharedFlow<UiEffect>   → Route 内 LaunchedEffect { collect }
Repository / 业务协程            → viewModelScope（不在 Composable 内）
UI 临时态（焦点、展开）           → remember / rememberSaveable
用户点击触发 suspend              → rememberCoroutineScope().launch { }
平台生命周期 / 监听 / 清理        → DisposableEffect
列表滚动派生 UI（FAB 显隐）       → derivedStateOf
页面可见性埋点                    → LifecycleEventEffect / ON_RESUME（非仅 Composition 存在）
```

| 层级 | 允许 Side Effect | 禁止 |
|------|------------------|------|
| **Route** | `LaunchedEffect` 收 `UiEffect`；`collectAsStateWithLifecycle` | 业务分支、Repository |
| **Screen** | 纯 UI 动画 `LaunchedEffect`；`derivedStateOf` | 收 UiEffect、调 SDK、埋点 |
| **ViewModel** | `viewModelScope`、emit `UiEffect` | 持有 Context、直接导航 |

**硬规则**：

1. **业务副作用**（导航、Toast、开系统页、模块埋点编排）→ ViewModel **`UiEffect`**，Route **`LaunchedEffect` 收集**，不放 Screen
2. **禁止**在 Composable 函数体用 `rememberCoroutineScope().launch { }` 替代 `LaunchedEffect` 做「进页自动执行」
3. **禁止**在 Composable 内 `viewModelScope` 或直接启动**业务** Repository 调用
4. Effect 的 **keys 审慎选择**：不稳定 lambda 不作 key；用 `rememberUpdatedState`
5. **HorizontalPager / 离屏预组合**：`LaunchedEffect` 只保证在 Composition 中，不保证用户可见；**页面曝光埋点**用 Lifecycle（`LifecycleEventEffect` 或 `DisposableEffect` + ON_RESUME），见 [coroutines + lifecycle](https://developer.android.com/topic/libraries/architecture/coroutines)

---

## 7. 官方文档链接

- [Side-effects in Compose](https://developer.android.com/develop/ui/compose/side-effects?hl=zh-cn)
- [Lifecycle of composables](https://developer.android.com/develop/ui/compose/lifecycle?hl=zh-cn)
- [State and Jetpack Compose](https://developer.android.com/develop/ui/compose/state?hl=zh-cn)
- [Advanced State and Side Effects Codelab](https://developer.android.com/codelabs/jetpack-compose-advanced-state-side-effects)
