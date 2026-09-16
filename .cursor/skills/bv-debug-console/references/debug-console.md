# Debug Console — 实现参考

> 仅 `BuildConfig.INTERNAL == true`。正式包 `normal` 不含调试台与飞书 Sync。

## 1. 目标

INTERNAL 测试通过 **全屏 Debug Console** 查看埋点、Firebase 测试配置、广告、订阅、分域日志；支持从飞书测试表 **运行时 Sync**，与 Jenkins 打包写入 `assets/test_firebase_configs` 使用 **同一 URL 与列配置**。

## 2. 入口

| 入口 | 行为 |
|------|------|
| TesterMenu → **App Info**（第一项） | 打开 Debug Console（**app 层接线**，platform 菜单文案不变） |
| TesterMenu → **Events** | platform `EventsListDialog` |
| TesterMenu → **Inspector** | Ad Inspector（app 追加） |

```kotlin
// AbstractBaseActivity — INTERNAL 接线示例
TesterMenu.FeedBack.APP_INFO -> DebugConsoleActivity.start(this)
```

## 3. 架构

```text
feature/debug/
  model/          DebugTab, ConfigDebugItem
  data/
    DebugEventNotifier      Statistics 写入后通知 Events 刷新
    DebugSnapshotRepository Config/Ads/Billing/System 快照
    FeishuTestConfigSyncRepository  飞书 API 拉表 → ConfigManager
  ui/
    DebugConsoleActivity
    DebugConsoleScreen
    tabs/           Events | Config | Ads | Billing | Logs | System
```

**已删除**：浮动 HUD（`DebugHudHost` / `DebugHudCard`），不再恢复。

## 4. 飞书测试配置 — 双通道

### 4.1 Jenkins 打包（build time）

```text
Jenkins 参数
  test_firebase_config_url
  test_firebase_config_key_column_tag
  test_firebase_config_value_column_tag
        ↓
scripts/build.py  -fu / -fkc / -fvc
        ↓
scripts/testFBconfigs.py  →  scripts/test_firebase_configs (JSON)
        ↓
app/src/main/assets/test_firebase_configs
        ↓
ConfigManager.tryToReadTestLocalConfigFromAsset()  （启动时加载）
```

同时 `build.py` 向 Gradle 传：

```text
-P FeishuTestSheetUrl=...
-P FeishuTestKeyColumn=...
-P FeishuTestValueColumn=...
```

### 4.2 App 内 Sync（runtime）

```text
Debug Console → Config → Sync from Feishu test sheet
        ↓
FeishuTestConfigSyncRepository（读 BuildConfig URL/列/凭证）
        ↓
ConfigManager.applyRuntimeTestConfigs(LinkedHashMap)
        ↓
立即生效；Config Tab 展示 getAll() 全部项
```

**禁止**在 Kotlin 硬编码 `B`/`F` 或固定表 URL；必须与 Jenkins 参数一致。

### 4.3 Jenkins 参数 ↔ BuildConfig

| Jenkins 参数 | build.py | Gradle `-P` | BuildConfig |
|--------------|----------|-------------|-------------|
| `test_firebase_config_url` | `-fu` | `FeishuTestSheetUrl` | `FEISHU_TEST_SHEET_URL` |
| `test_firebase_config_key_column_tag` | `-fkc` | `FeishuTestKeyColumn` | `FEISHU_TEST_KEY_COLUMN` |
| `test_firebase_config_value_column_tag` | `-fvc` | `FeishuTestValueColumn` | `FEISHU_TEST_VALUE_COLUMN` |

### 4.4 解析规则（Kotlin 与 Python 必须一致）

1. 读整表 grid → `A1:{末列}{末行}`
2. **跳过第 1 行**（表头，如 B 列「配置名」）
3. Key = keyColumn 单元格 **trim**；空 key 跳过
4. Value = valueColumn 单元格 trim；列不足 → 空串
5. 存入 **`LinkedHashMap`**，保持 **表格自上而下顺序**
6. 重复 key：后者覆盖前者（与 dict 行为一致）

**顺序踩坑（已修复，勿回退）**：

- `ConfigManager.testLocalConfigs` 必须用 `LinkedHashMap`，不可用 `HashMap`
- Gson 解析 assets JSON 时用 `LinkedHashMap<String, String>`
- Config Tab **禁止** `.sortedBy { it.key }`

## 5. 凭证（禁止进 Git）

| 变量 | 本地 | Jenkins |
|------|------|---------|
| App ID | `local.properties` → `feishu.test.app_id` | Credentials → `FEISHU_TEST_APP_ID` |
| App Secret | `local.properties` → `feishu.test.app_secret` | Credentials → `FEISHU_TEST_APP_SECRET` |

- Gradle `internal` flavor 注入 `BuildConfig.FEISHU_TEST_APP_ID/SECRET`
- `normal` flavor 恒为空字符串
- `scripts/testFBconfigs.py` 读环境变量，**禁止**脚本内明文
- `local.properties.example` 仅空占位符
- 修改凭证后须 **重编 internal 包**

### Jenkins Freestyle 配置步骤

1. **Credentials** 建两条 Secret text：`feishu-test-app-id`、`feishu-test-app-secret`
2. Job → **Environment** → 勾选 **Use secret text(s) or file(s)**
3. 绑定变量名 **`FEISHU_TEST_APP_ID`**、**`FEISHU_TEST_APP_SECRET`**
4. **不要**放在 General 参数化 String Parameter（会泄露）

表 URL / 列号放在 Jenkins **General 参数**（非 secret）即可。

## 6. Gradle（app/build.gradle 要点）

```groovy
// 凭证：local.properties → env
def feishuTestAppId = loadLocalOrEnvProperty('feishu.test.app_id', 'FEISHU_TEST_APP_ID')
def feishuTestAppSecret = loadLocalOrEnvProperty('feishu.test.app_secret', 'FEISHU_TEST_APP_SECRET')

// 表 URL/列：Gradle -P → local.properties → env
def feishuTestSheetUrl = loadGradleOrLocalProperty('FeishuTestSheetUrl', 'feishu.test.sheet_url', 'FEISHU_TEST_SHEET_URL')
// ...

productFlavors {
    internal {
        buildConfigField "boolean", "INTERNAL", "true"
        buildConfigField "String", "FEISHU_TEST_SHEET_URL", "\"${escapeBuildConfigString(feishuTestSheetUrl)}\""
        // ...
    }
    normal {
        buildConfigField "boolean", "INTERNAL", "false"
        // FEISHU_* 保持 defaultConfig 空字符串
    }
}
```

## 7. local.properties.example（本地调试 Sync）

```properties
feishu.test.app_id=
feishu.test.app_secret=
feishu.test.sheet_url=
feishu.test.key_column=
feishu.test.value_column=
```

本地未配 URL/列时，Sync 应失败并提示「与 Jenkins -fu/-fkc/-fvc 对齐」。

## 8. ConfigManager（market.android）

```kotlin
private var testLocalConfigs: LinkedHashMap<String, String>? = null

fun applyRuntimeTestConfigs(configs: Map<String, String>): Boolean
fun clearRuntimeTestConfigs()
fun isConfigFromLocalTestFile(): Boolean
fun getAll(): Map<String, String>
```

有本地测试配置时，`getBoolean/getLong/getString` 优先读 `testLocalConfigs`。

## 9. Tab 能力

| Tab | 能力 |
|-----|------|
| Events | EventCache 列表、搜索、清空；Statistics 写入后刷新 |
| Config | 显示 BuildConfig URL/列；Feishu Sync；Clear override & refresh Firebase；**全表 key 列表（行序）** |
| Ads | AdManager 状态、AppLog、test device、Inspector |
| Billing | VIP / SKU / IAP log |
| Logs | AppLog 分域导出 |
| System | 设备 / GDPR / 配置头信息 |

## 10. AppLog

- 路径：`app/.../utils/AppLog.kt`
- INTERNAL 才写 Logcat（`MC/<Domain>`）
- GDPR / Ad / 通用 debug 统一入口；**不改** platform `Logger.kt`

## 11. 单元测试

`app/src/test/.../FeishuTestConfigSyncRepositoryTest.kt`：

- `parseSheetUrl` 解析 spreadsheetToken / worksheetToken
- `parseConfigRows` 跳过表头、列映射、**行序保留**

## 12. 验收清单

- [ ] INTERNAL：App Info → 全屏 6 Tab
- [ ] Config 页 URL/列与 Jenkins 参数一致
- [ ] Sync 后 key、value、顺序与飞书表一致（跳过表头）
- [ ] Clear override 后回 Firebase Remote Config
- [ ] Events 实时刷新
- [ ] 仓库无 secret 明文；normal 包无 Sync
- [ ] `compileInternalGpDebugKotlin` + `testInternalGpDebugUnitTest` 通过

## 13. 禁止事项

- 硬编码飞书 `app_secret` 或固定 B/F 列
- 修改 platform `TesterMenu` 菜单文案为「Debug Console」
- Config 列表按 key 字母排序
- 使用 `HashMap` 存测试配置（丢顺序）
- 在正式包启用 Sync 或写入凭证
