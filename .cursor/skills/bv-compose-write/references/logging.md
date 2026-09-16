# 业务日志统一管理（AppLog）

`bv-compose-write` 写新代码时必须走 **`core/utils/AppLog`**，按域打固定 logcat tag，方便过滤 ad / mirror / cast。

**不是埋点。** `Statistics` / `AppAnalytics` 上报产品事件；`AppLog` 只给开发/INTERNAL 看。禁止把 `logEvent` 当调试日志，也禁止用 `AppLog` 替代埋点。

底层仍用 `remote.common.utils.Logger`（`d` 仅 INTERNAL；`e`/`w` 可进正式包）。不要在 `presentation/screen/` 里再 `Log.d` 或自造 TAG。

---

## 1. 文件位置（全局一份）

```text
app/src/main/java/<applicationId>/core/utils/
  AppLog.kt           # AppLog + AppLogDomain
```

首个 Compose 工步若还没有 `AppLog.kt`：**先建此文件**。禁止每个 Screen 各写一套 TAG。

遗留 `CommonUtils.logCommon` / `appendNativeAdLogInfo` / `appendMirrorLogInfo` / `logAppOpenAd` 仅 XML Activity 过渡期使用；**新 Kotlin（ViewModel / Repository / Compose 编排）一律 `AppLog`**。迁移某页时把该页的 CommonUtils 日志改过来，不要两套并行加新调用。

---

## 2. 域与 logcat tag（硬规则）

tag 前缀 **`BV-`**，长度 ≤ 23。**禁止**用 Activity 名、`CommonUtils`、随机字符串当新代码 TAG。

| `AppLogDomain` | tag | 用途 |
|----------------|-----|------|
| `Ad` | `BV-Ad` | 广告总闸、enableAd / VIP / 位开关 |
| `AdOpen` | `BV-AdOpen` | App Open、开屏 loading、前后台 |
| `AdNative` | `BV-AdNative` | Native 加载/销毁/consume、横竖模板 |
| `AdInt` | `BV-AdInt` | 插屏、前置 loading、弹窗队列交叉 |
| `AdBanner` | `BV-AdBanner` | Banner 尺寸/刷新/无网 |
| `Mirror` | `BV-Mirror` | 镜像会话总状态、录屏、质量、超时 |
| `Cast` | `BV-Cast` | Chromecast / Google Sender |
| `AirPlay` | `BV-AirPlay` | AirPlay PIN/断连/帧率 |
| `WebMirror` | `BV-WebMirror` | LG WebOS Web Mirror |
| `Fire` | `BV-Fire` | FireTV 镜像 |
| `Connect` | `BV-Connect` | 搜索、连接、5s 超时、虚/真连接 |
| `Billing` | `BV-Billing` | IAP、SKU 空列表、VIP |
| `Config` | `BV-Config` | Remote Config 读取 |
| `Popup` | `BV-Popup` | 弹窗队列优先级 |
| `IoT` | `BV-IoT` | 家居扫描（非投屏列表） |
| `Splash` | `BV-Splash` | 闪屏/GDPR 时序 |
| `App` | `BV-App` | 启动、导航、Deeplink；套不进上表时才用 |

一条日志只打 **一个域**。Cast 镜像失败：`Cast`（或会话总览用 `Mirror` 再加一句 `Cast`），不要 `Logger.d("MirrorActivity", …)`。

---

## 3. API（实现时对齐）

```kotlin
enum class AppLogDomain(val tag: String) {
    Ad("BV-Ad"),
    AdOpen("BV-AdOpen"),
    AdNative("BV-AdNative"),
    AdInt("BV-AdInt"),
    AdBanner("BV-AdBanner"),
    Mirror("BV-Mirror"),
    Cast("BV-Cast"),
    AirPlay("BV-AirPlay"),
    WebMirror("BV-WebMirror"),
    Fire("BV-Fire"),
    Connect("BV-Connect"),
    Billing("BV-Billing"),
    Config("BV-Config"),
    Popup("BV-Popup"),
    IoT("BV-IoT"),
    Splash("BV-Splash"),
    App("BV-App"),
}

object AppLog {
    fun d(domain: AppLogDomain, msg: String) { Logger.d(domain.tag, msg) }
    fun i(domain: AppLogDomain, msg: String) { Logger.i(domain.tag, msg) }
    fun w(domain: AppLogDomain, msg: String) { Logger.w(domain.tag, msg) }
    fun e(domain: AppLogDomain, msg: String, t: Throwable? = null) { Logger.e(domain.tag, msg, t as? Exception) }
}
```

`Logger.e` 现签名是 `Exception?`：非 `Exception` 的 Throwable 包一层或只打 `t.message`，不要改 platform 模块。

**调用**：`AppLog.d(AppLogDomain.AdNative, "consume id=${nativeAd.hashCode()} ratio=$ratio")`  
消息写清 **动作 + 关键 id/状态**，不要只打 `"click"`。

---

## 4. 谁可以打、谁不能打

| 层 | AppLog |
|----|--------|
| Repository / Manager 编排 / ViewModel | **要**（状态变化、SDK 回调、超时、失败） |
| Route | 仅 UiEffect 处理失败等少量表 |
| Screen / 无状态 Composable | **禁止**（同禁止 `logEvent`） |
| Preview | 禁止 |

Release：`d` 随 `Logger` 在非 INTERNAL 关闭；失败路径用 `e`/`w`。

**禁止**打：token、广告请求完整 URL、邮箱、精确位置、购买 token。设备可用 brand + **截断** id。

---

## 5. 怎么查看（给人和 Agent）

```bash
# 广告全家桶
adb logcat -s BV-Ad:D BV-AdOpen:D BV-AdNative:D BV-AdInt:D BV-AdBanner:D

# 镜像 + Cast + AirPlay
adb logcat -s BV-Mirror:D BV-Cast:D BV-AirPlay:D BV-WebMirror:D BV-Fire:D

# 连接
adb logcat -s BV-Connect:D

# 全部 BV- 前缀（macOS/Linux）
adb logcat | grep --line-buffered ' BV-'
```

Android Studio Logcat 过滤器：`tag:BV-Ad | tag:BV-Mirror | tag:BV-Cast`  
或 tag 正则 `^BV-`。

联调某工步时，在回复里写清用了哪组 tag，便于对照 `git-history.md` 时序。

---

## 6. 工步与 gate

- 工程无 `AppLog.kt` → 当前模块**第一个写 Kotlin 的工步**先落地 `core/utils/AppLog.kt`（可与 theme 骨架同一工步）。
- 逻辑工步（连接、镜像、广告、Billing）：关键路径必须有 `AppLog`，不能只靠埋点。
- **gate**：新 `presentation/` / `data/` 代码无裸 `Log.d` / 无新的 Activity TAG

---

## 7. 与旧缓冲

`CommonUtils` 里 StringBuilder 是 INTERNAL 调试页用的。新 `AppLog` **先只管 logcat 域 tag**。若 Debug 页仍要整段 dump，再在 `AppLog` 内按 domain 环形缓冲，**不要**再往 `CommonUtils` 加 buffer。
