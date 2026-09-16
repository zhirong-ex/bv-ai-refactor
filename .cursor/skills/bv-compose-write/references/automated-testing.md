# 自动化测试 — AI 重构流水线

Compose 重构的验收 **默认走自动化**；仅当 AT 无法覆盖时，gate 才降级为 **MT（人工测试用例）** 交给 QA。

---

## 1. 三层验收模型

| 层级 | 编号 | 运行环境 | 谁执行 | 典型覆盖 |
|------|------|----------|--------|----------|
| **AT** Automated Test | `AT-<模块>-<序号>` | JVM / 模拟器 | Agent 每工步 | ViewModel 状态机、配置矩阵、无状态 Screen、编译 |
| **AG** Acceptance Gate | `AG-<模块>-<序号>` | 对照 spec | Agent 映射 AT + 静态核对 | 与 plan 工步 1:1 |
| **MT** Manual Test | `MT-<模块>-<序号>` | 真机 | QA / 负责人 | SDK 连接、广告、埋点线上、折叠真机 |

**硬规则**：

1. 每个 `AG-*` **必须**标注：`automated: AT-*` 或 `manual: MT-*（原因）`
2. **bv-compose-write** 工步闭环：`实现 → 编译 → AT → gate → commit`；**AT 失败不得 commit**
3. 能写 AT 的 **禁止**只写 MT；MT 须写清操作步骤与预期（给 QA 的用例）
4. 新模块 **工步 1** 须建测试目录骨架 + 首个 ViewModel/Screen 冒烟 AT

---

## 2. 测试目录（app 单模块）

```text
app/src/test/java/.../presentation/screen/<模块包名>/
  <Module>ViewModelTest.kt
app/src/test/java/.../data/repository/
app/src/test/java/.../domain/usecase/

app/src/androidTest/java/.../presentation/screen/<模块包名>/
  ui/<Module>ScreenTest.kt

docs/ai/testing.md                   # 本工程测试命令与 AT/MT 索引
docs/ai/gate/<模块>.md               # AG ↔ AT/MT 映射
```

**公共测试工具**（跨模块复用，全局一份）：

```text
app/src/test/java/.../testing/
  MainDispatcherRule.kt
```

---

## 3. 技术栈与 Gradle

### 3.1 依赖（`libs.versions.toml` + `app/build.gradle`）

| 用途 | 依赖 |
|------|------|
| JVM 单测 | JUnit4、`kotlinx-coroutines-test` |
| Fake / 断言 | MockK（按需） |
| Compose UI | `compose-ui-test-junit4`、`androidx-test-ext-junit`、`androidx-test-espresso-core` |
| Activity | `androidx-activity-compose`（androidTest） |

### 3.2 命令（默认 flavor：`normalGpDebug`）

| 命令 | 何时跑 |
|------|--------|
| `./gradlew :app:compileNormalGpDebugKotlin` | 每工步 |
| `./gradlew :app:testNormalGpDebugUnitTest` | 每工步（有 AT 后）；模块逻辑工步必跑 |
| `./gradlew :app:connectedNormalGpDebugAndroidTest` | Screen 工步后 / 模块收尾；**无设备时跳过但不替代 JVM AT** |

Agent 跑 Gradle 缺 Java/设备时用 `required_permissions: ["all"]`；无模拟器时 **connected 失败不阻塞** 工步 commit，但须在 plan/gate 标 `MT` 待跑，且 JVM AT 必须绿。

---

## 4. 写什么 AT（按 UDF 分层）

### 4.1 ViewModel（JVM，最高优先级）

- Repository **接口注入**；`Fake*Repository` 控制 CFG / 网络 / 设备列表
- `MainDispatcherRule` + `runTest` + `advanceTimeBy` 测计时（10s hint 等）
- 断言 `StateFlow` 与 `SharedFlow`（UiEffect）
- **对应 AG**：配置矩阵、搜索生命周期、连接状态机（mock repo 事件）

```kotlin
@Test
fun showNativeAd_falseWhenConfigOff() = runTest(dispatcher) {
    val repo = FakeDeviceSearchRepository(nativeAdEnabled = false, networkAvailable = true)
    val vm = DeviceSearchViewModel(repository = repo)
    advanceUntilIdle()
    assertFalse(vm.uiState.value.showNativeAd)
}
```

### 4.2 无状态 Screen（androidTest 或 Robolectric 可选）

- 直接 `DeviceSearchScreen(mockUiState, fakeOnEvent)`
- `onNodeWithText` / `testTag` 断言可见性与点击上抛 `UiEvent`
- **对应 AG**：NoWifi、列表条数、弹窗按钮

### 4.3 不自动化（写 MT）

| 场景 | 原因 |
|------|------|
| 真实 AirPlay / Connect SDK 连接 | 需物理设备与 TV |
| 广告 SDK 填充与展示 | 外部网络与 Mediation |
| Firebase/线上埋点校验 | 需 Analytics DebugView |
| 折叠屏物理切换 | 无 API 稳定模拟时 MT |
| 系统栏真机 inset | 可 AT 部分逻辑，最终 MT 抽检 |

---

## 5. plan / gate 模板

### plan 工步追加字段

```markdown
- **编译**：`./gradlew :app:compileNormalGpDebugKotlin`
- **自动化**：`./gradlew :app:testNormalGpDebugUnitTest`（+ 可选 connected）
- **验收**：AG-device-search-02 → AT-device-search-02-a,b
```

### gate 条目格式

```markdown
## AG-device-search-02 配置读取

- **automated**：AT-device-search-02-a（native off）、AT-device-search-02-b（无网）
- **manual**：无
- **操作（AT）**：FakeRepository 矩阵 → 断言 UiState.showNativeAd / network
- **预期**：见 spec + registry CFG
```

```markdown
## MT-device-search-09 真机连接

- **原因**：Connect SDK / Pin 弹窗依赖真实设备
- **操作**：…
- **预期**：…
```

---

## 6. bv-compose-write 工步闭环（更新）

```text
读 plan 工步
  → 实现（Repository 可测性：接口 + 构造注入）
  → 编译
  → 编写/更新 AT（本工步范围）
  → testNormalGpDebugUnitTest（+ connected 若 plan 要求且有设备）
  → gate：AG 映射的 AT 全绿；MT 仅记录不阻塞
  → commit（含 test/ androidTest/）
  → 下一工步
```

**commit 暂存**须含：

```bash
git add app/src/test/java/.../presentation/screen/<模块包名>/
git add app/src/androidTest/java/.../presentation/screen/<模块包名>/   # 若有
git add docs/ai/testing.md docs/ai/gate/
```

---

## 7. bv-work-plan 默认工步（测试相关）

在模块 plan 中 **显式**包含：

| 工步 | 内容 |
|------|------|
| 1 骨架 | `test/` 目录 + FakeRepository 占位 + ViewModel 构造注入确认 |
| 4 ViewModel | 每新增状态分支 → 同步 AT |
| 3–7 UI | Screen AT（androidTest）或 Preview + testTag |
| 末步联调 | `testing.md` 更新；gate 标清全部 MT；跑全量 unitTest |

---

## 8. CI（AI 重构阶段：仅个人分支）

**原则**：Compose AI 重构在**负责人个人分支**（如 `zhirong/**`）上迭代；**不**在 `develop` / `main` / `master` 上挂 CI 或自动 push，避免干扰主开发线。

| 阶段 | CI 触发 | Agent / 人工 |
|------|---------|--------------|
| **AI 重构进行中** | **仅** `zhirong/**` push / PR | 本地 + 个人分支 push 跑 AT；**禁止** Agent 默认 push 到 develop/main |
| **模块验收合并前** | 仍只在个人分支绿 | 负责人 review 后 **手动** 提 PR 合入 develop |
| **全 App 重构完成后** | 再议：可扩到 develop PR gate | 与团队对齐后改 workflow |

仓库 workflow：**`.github/workflows/android-unit-test.yml`**

```yaml
on:
  push:
    branches: ['zhirong/**']
  pull_request:
    branches: ['zhirong/**']
  # main / master / develop — 重构期不触发
```

**硬规则**：

- Agent **默认不 push**；用户明确要求时才 push，且 **只 push 当前 feature 分支**（如 `zhirong/1.5.4`）
- **禁止** Agent 向 `develop` / `main` / `master` push 或开自动 merge
- 合并主分支前：个人分支 `testNormalGpDebugUnitTest` 全绿 + MT 清单交 QA

```yaml
# 任务内容
- run: ./gradlew :app:compileNormalGpDebugKotlin :app:testNormalGpDebugUnitTest
# 后续：connectedAndroidTest（Firebase Test Lab / 自建模拟器，仍在个人分支）
```

---

## 8.5 Android CLI / Journeys（有设备时）

有 `android` CLI 且有模拟器/真机时，Screen 工步可用 `android layout` 代替「只看 Preview」做 inset/CTA 核验（见 [android-cli.md](android-cli.md)）。

模块主路径可加 `docs/ai/journeys/<模块>.xml`（自然语言 `<action>`），按 `~/.cursor/skills/android-cli/references/journeys.md` 逐步点选；失败则工步不标 UI 已验收。无设备不阻塞 JVM AT。

---

## 9. 参考

- [Test Compose UI](https://developer.android.com/develop/ui/compose/testing)
- [Test ViewModel](https://developer.android.com/codelabs/advanced-android-kotlin-training-testing-basics)
- [kotlinx-coroutines-test](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-test/)
