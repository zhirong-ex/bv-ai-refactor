# App Quality：内存优化与安全换机 /  onboarding

> **权威来源（会更新，须定期重读）**  
> 主文：[Elevating app quality: Reducing memory usage and improving device migration](https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html)（2026-08）  
> 内存深度：[Prioritizing Memory Efficiency: Essential Steps for Android 17](https://developer.android.com/blog/posts/prioritizing-memory-efficiency-essential-steps-for-android-17)  
> 内存总览：[Overview of memory management](https://developer.android.com/topic/performance/memory-overview)  
> 换机凭证：[DeviceSetupService](https://developer.android.com/reference/androidx/credentials/providerevents/service/DeviceSetupService)  
> Credential Manager：[Jetpack credentials](https://developer.android.com/jetpack/androidx/releases/credentials)

**本文件上次对齐**：2026-08-27（基于上述官方文档）。Google 会持续更新 Play / Android 17+ 质量要求；**写代码前若距上次同步较久，或用户再次给出博客链接，须重新抓取主文并更新本节**。

---

## 0. 文档同步纪律（硬规则）

| 时机 | Agent 动作 |
|------|------------|
| **`@bv-compose-write` 开工** | 快速扫读本文件 §1–§4；若 `last_synced` 超过 90 天或用户提示「政策更新」→ 重读**主文 URL** 与同系列 developer.android.com 文章， diff 后更新本 reference |
| **用户再次发送博客链接** | 视为强制同步：抓取 → 更新本文件 + `SKILL.md` 摘要 + 必要时 `gate/` 检查项 |
| **线上 MemoryLimiter / OOM** | 查 §5 ProfilingManager；修复后 `@bv-fix-record` 沉淀 |
| **涉及登录 / 凭证 / 换机** | 必读 §4 安全 onboarding 与换机 |

更新本文件时在文首改 **`last_synced: YYYY-MM-DD`**，并在 commit message 或 learn/ 记一句「对齐 Google App Quality 博客 yyyy-mm」。

---

## 1. 背景：Android 17+ 按设备 RAM 的 per-app 内存 限制

- 系统按**设备总 RAM** 为每个 app 设内存上限；超限可能被**压缩 swap**（变卡）或**直接杀进程**（可能**无 Java 堆栈**）。
- 字段诊断：`ApplicationExitInfo.getDescription()` 含 **`MemoryLimiter:AnonSwap`** 时，原因为 `REASON_OTHER` + 内存限制。
- 泄漏/大对象会拖累整机：LMK 杀其它 app 缓存 → 多任务冷启动、丢滚动位置与用户状态。
- **本工程要求**：Compose 重构不得比 legacy XML 版**更耗内存**；新模块 gate 须含内存相关自检（§6）。

---

## 2. 构建与字节码（R8）

**release 必须**（`app/build.gradle*`）：

```kotlin
buildTypes {
    release {
        isMinifyEnabled = true
        isShrinkResources = true
        proguardFiles(
            getDefaultProguardFile("proguard-android-optimize.txt"), // 勿用 proguard-android.txt
            "proguard-rules.pro"
        )
    }
}
```

**禁止**：

- `gradle.properties` 中 `android.enableR8.fullMode = false`
- 全局 `-dontoptimize` / `-dontshrink` / `-dontobfuscate`
- 过宽的 `-keep` 整包规则（用 R8 Configuration Analyzer 收窄）

库模块：`consumer-rules.pro` 只放消费者需要的 keep；内部规则放 `proguard-rules.pro`。

---

## 3. 运行时内存（Compose / Kotlin 必守）

### 3.1 图片与 Bitmap（最大常见内存源）

| 规则 | Compose 做法 |
|------|----------------|
| **用图片库** | **Coil** + `AsyncImage`；禁止手写 decode 大图 |
| **Downsample** | 尺寸匹配 UI；Coil 默认 downsample，勿 `size(Original)` 除非必要 |
| **格式** | 无透明用 `RGB_565`（Coil `bitmapConfig`） |
| **矢量优先** | 简单图标用 Vector / `Icon`，勿多密度 PNG 重复进堆 |
| **勿 letterbox 进文件** | 透明边用 `Modifier.padding` / `InsetDrawable`，勿 baked padding bitmap |
| **重复加载** | Profiler 查 Duplicate Bitmaps；Screen 级共享 `ImageLoader` |

### 3.2 列表与 UI 状态

- 长列表 **`LazyColumn` / `LazyRow`** + 稳定 **`key`**；禁止 `Column { items.forEach }` 一次性组合全量。
- **`UiState` 列表**：只持 UI 所需字段；大 payload（缩略图 bytes、全量日志）不进 StateFlow。
- **`derivedStateOf`** 派生滚动/FAB 等，避免高频 State 导致全树重组（见 [side-effects.md](side-effects.md)）。
- **Preview / 测试数据**：勿引用超大 mock 列表进主源码路径。

### 3.3 泄漏（与 Side Effects 联动）

| 反模式 | 正确做法 |
|--------|----------|
| `LocalContext.current` 进 ViewModel | Context 只在 UI 层；ViewModel 用 Application + DI |
| `DisposableEffect` 无 `onDispose` | 注册监听必须在 `onDispose` 反注册 |
| `AndroidView` 持有 legacy View 不释放 | 使用 `AndroidView` 的 **`update` / `onRelease`** 清理 |
| 静态/companion 持有 Activity / View | 禁止；用 WeakReference 仅作最后手段 |
| Route 内 `LaunchedEffect` 永不取消的 collect | keys 正确；离开 Composition 自动 cancel |
| 全局单例缓存无限增长 | LRU + `onTrimMemory` 释放（§3.4） |

开发期：Android Studio **LeakCanary profiler task** / Heap Dump 查泄漏。

### 3.4 `onTrimMemory`（主动释放）

在 **`Application`** 或主 Activity 实现 `ComponentCallbacks2`：

- **`TRIM_MEMORY_UI_HIDDEN`**：释放 UI 专属缓存（Bitmap 池、大动画资源、预览缓冲）。
- **`TRIM_MEMORY_BACKGROUND`**：释放可重建的后台缓存，延长 cached 进程寿命、减少冷启动。

> Android 14+ 仅关注上述两档；勿依赖已废弃的 legacy trim level。

### 3.5 其它

- **勿依赖 `android:largeHeap="true"`** 规避优化；应在限制内运行。
- **Native / SDK**：JNI buffer、MediaCodec 等在 `Repository`/SDK 层有明确 release；Compose 工步不新增无释放边界的 native 持有。
- **分配**：热路径少分配临时对象；Flow collect 用合适 `SharingStarted` 避免多份缓存。

---

## 4. 安全 Onboarding 与换机（Device Migration）

博客第二部分强调：**换机 / 系统 onboarding 时凭证与本地状态须可预期、可恢复、可重新绑定**。

### 4.1 凭证与身份

- 新账户 / 登录 / 高风险步骤：优先 **Credential Manager**（passkey、已验证邮箱等），减少 OTP 摩擦（见 Google 2026 Credential Manager 系列文）。
- **Passkey** 可跨设备同步；**硬件绑定 Keystore 密钥不可跨机迁移** — 设计须支持**新设备重新注册 / 登录**，勿假设本地密钥随 Backup 可用。

### 4.2 换机与 Backup

| 数据类型 | 规则 |
|----------|------|
| **Keystore / FIDO / 设备绑定 token** | **排除** Auto Backup / 设备迁移复制；换机后走重新登录或 server 侧解绑旧设备 |
| **SharedPreferences 中的「已注册」标记** | 若与 Keystore 成对，**勿**单独备份，否则新设备 metadata 与密钥不一致 → 初始化失败 |
| **用户内容 / 设置** | 可用 Backup 或自有云同步；须 idempotent，换机后合并而非盲覆盖 |
| **Credential Provider** | 若做 provider，实现 **`DeviceSetupService`** 响应系统换机/setup 的凭证导出/导入；服务**无 UI**、**短生命周期**、调用间**无状态**（进程可能被 LMK 杀） |

### 4.3 UX 与 spec

- spec 须写清：**换机 / 恢复备份 / 新设备** 下用户路径（重新登录？数据是否保留？）。
- 勿在**首次冷启动未展示价值前**强制设备绑定；绑定放在用户完成首次核心动作之后（降低流失）。
- 后端：支持**注销 stale 设备凭证**，避免换机多次后孤儿注册堆积。

> 本仓库若 spec 未涉及凭证模块，Compose 工步**不得**擅自增加 Keystore/Backup 逻辑；缺口记 `spec/gaps.md`。

---

## 5. 线上可观测：ProfilingManager

Android 15+ / 17 增强，用于**现场** OOM / 内存异常：

```kotlin
// Application.onCreate 或专用初始化（勿阻塞主线程）
val profilingManager = getSystemService(ProfilingManager::class.java)
val triggers = listOf(
    ProfilingTrigger.Builder(ProfilingTrigger.TRIGGER_TYPE_ANOMALY).build(),
    // TRIGGER_TYPE_OOM：OOM 时堆 dump，下次启动 registerForAllProfilingResults 交付
)
profilingManager.registerForAllProfilingResults(executor) { result ->
    if (result.errorCode == ProfilingResult.ERROR_NONE) {
        // 上传 result.resultFilePath 供 Perfetto / Heap Dump Explorer 分析
    }
}
profilingManager.addProfilingTriggers(triggers)
```

- **ANOMALY**：内存超阈值、binder  spam 等 → 杀进程前 heap dump。
- 分析：Perfetto **Heap Dump Explorer**；Duplicate Bitmaps、retained size、GC root 路径。

产品若已有 Crashlytics/自建上报，与上述 artifact 路径对接（Google 仍在完善 Play Console 现场指标）。

---

## 6. 本工程 Gate 自检（bv-compose-write 每模块至少一次）

工步涉及 **Screen / 列表 / 图片 / 登录** 时，在 `gate/<模块>.md` 或工步自检中核对：

- [ ] 无 `Column { list.forEach }` 全量组合；列表为 Lazy + key
- [ ] 网络/本地图片均经 **Coil**（或 spec 指定库），无裸 `BitmapFactory.decode` 进 UI
- [ ] ViewModel / UiState 无 Context、Activity、View 引用
- [ ] 监听 / Flow collect 有 Composition 或 lifecycle 边界；`DisposableEffect` 有 `onDispose`
- [ ] release 构建 R8 + shrinkResources 可编译；未加全局 disable optimize
- [ ] （若模块含 auth）Backup 规则与换机路径与 spec 一致；无「只备份 metadata 不备份密钥」组合

---

## 7. 与 MVVM + UDF 的分工

```text
内存敏感数据加载     → Repository + 分页/缓存策略 → ViewModel 暴露精简 UiState
Bitmap / 动画       → UI 层 Coil / 释放；trim 时清 UI 缓存
业务副作用          → UiEffect（不占持久堆）
换机 / 凭证         → spec + 独立 auth 模块；Compose 工步只接 Route，不_embed Keystore_
```

---

## 8. 参考链接（同步时一并检查是否改版）

- [App Quality 博客（主文）](https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html)
- [Android 17 内存效率步骤](https://developer.android.com/blog/posts/prioritizing-memory-efficiency-essential-steps-for-android-17)
- [Memory management overview](https://developer.android.com/topic/performance/memory-overview)
- [Inspect heap dumps](https://developer.android.com/studio/profile/inspect-memory)
- [Optimize images](https://developer.android.com/develop/ui/views/graphics/load-flags)
- [Compose load images (Coil)](https://developer.android.com/develop/ui/compose/graphics/images/loading)
- [ProfilingManager](https://developer.android.com/reference/android/os/ProfilingManager)
- [DeviceSetupService](https://developer.android.com/reference/androidx/credentials/providerevents/service/DeviceSetupService)
