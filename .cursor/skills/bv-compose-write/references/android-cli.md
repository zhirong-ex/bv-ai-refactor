# Android CLI — 接到 AI Compose 重构

官方工具：[Android CLI](https://developer.android.com/tools/agents/android-cli)（本机已 `android init`，Cursor skill：`~/.cursor/skills/android-cli`）。  
官方文档会更新：**以本机 `android help` 为准**，不要凭记忆用过期 flag。

**产品/接线仍走 bv-\***：行为 = existing-logic；外观 = 蓝湖；`AppLog`、工步 commit。Android CLI 负责环境、文档、设备、布局核验。

---

## 0. Agent 每次开工

```bash
export PATH="$HOME/.local/bin:$PATH"
command -v android >/dev/null || {
  echo "Android CLI missing; install Apple Silicon:"
  echo "curl -fsSL https://dl.google.com/android/cli/latest/darwin_arm64/install.sh | bash"
  exit 1
}
android --no-metrics info
```

- 安装路径常见：`~/.local/bin/android`（user 安装，不进当前 Cursor 默认 PATH，**必须 export**）。
- 指标：默认可 `--no-metrics`。
- 更新：隔一段时间 `android update`（当前 1.0.x）。
- 可选：`android skills add --all --agent=cursor`（从 GitHub 拉 Compose / edge-to-edge 等官方 skill；网络失败则跳过，不阻塞工步）。

`.androidrc`（`~/.androidrc`）可固定 `--sdk=<Android SDK 路径>`。

---

## 1. 和 bv-compose-write 怎么配合

| 工步环节 | 用 Android CLI | 仍用原命令 |
|----------|----------------|------------|
| 不确定官方 API（Insets、WindowSizeClass、NextGen Ads） | `android docs search '…'` → `android docs fetch kb://…` | 不要只靠训练数据 |
| 编译 / JVM AT | — | `./gradlew :app:compileNormalGpDebugKotlin`、`testNormalGpDebugUnitTest` |
| 描述产物路径 | `android describe --project_dir=.` 找 APK | `assemble` 产出 |
| 装到设备 | `android run` / `android install --apks=…`（增量安装） | flavor APK：`normalGpDebug` |
| Compact UI 核验 | 模拟器 + `android layout --pretty`；变了用 `--diff` | Preview 不够当真机 inset 验收 |
| 系统栏遮挡 / 广告条 | `layout` 看 bounds；WebView 用 `android screen capture -o /tmp/bv-ui.png` 并 **Read 图片** | — |
| Studio 开着且支持 `studio` | `android studio check` → `render-compose-preview` / `analyze-file` | 无 Studio 则跳过，不阻塞 commit |
| 主路径冒烟 | `docs/ai/journeys/<模块>.xml` + `~/.cursor/skills/android-cli/references/journeys.md` | 无设备 → MT，JVM AT 仍须绿 |

`android run` **会 build+安装+启动**（以本机 help 为准）。本工程有 **多 flavor**（`normalGp` 等）时，若 `android run` 打错 variant，改回 Gradle assemble 再 `android install --apks=<assemble 产出的 apk>`。

**禁止**：用 `android create` 建新工程替换仓库；用 CLI 改 native/SDK 边界。

---

## 2. 设备（屏幕适配工步必用）

```bash
android emulator list
android emulator create          # 默认 medium_phone；宽屏再 create 大屏 profile
android emulator start medium_phone   # 等到就绪再返回
# 无设备且要做 layout 核验时才 start；用完可 android emulator stop emulator-5554
```

Compact + Expanded：两个 AVD 或一折叠/平板 profile。无模拟器权限时记录 MT，不假装 Preview 已验 inset。

设备交互细节见官方 skill `android-cli` 的 `references/interact.md`：先 `layout`，失败再截图。

---

## 3. 日志（与 AppLog 一起）

装上 app 后看域 tag：

```bash
adb logcat -s BV-Ad:D BV-Mirror:D BV-Cast:D BV-Connect:D
```

`android` 本身不替代 `AppLog`。

---

## 4. Studio 命令（可选）

需 **Android Studio Quail 2 Canary+** 且 Gemini 已登录。`android studio check` 非 READY 则整组跳过。

有用项：`analyze-file`（工步后 lint）、`render-compose-preview`（Screen Preview PNG + `--print-semantics`）、`find-declaration` / `find-usages`（迁移符号）。

---

## 5. 失败策略

| 情况 | 行为 |
|------|------|
| `android` 不在 PATH | export `~/.local/bin`；仍无则按 §0 安装 |
| `docs` / `skills add` 网络失败 | 继续工步；API 以现有 compose-write 参考 + existing-logic |
| 无模拟器 | JVM AT 必须绿；layout/journey 标 MT |
| `layout` 失败（动画/WebView） | `screen capture` 并看图 |
| 与 Gradle flavor 冲突 | 以 Gradle 为准 |
