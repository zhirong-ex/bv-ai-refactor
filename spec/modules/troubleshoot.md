# troubleshoot — 本地排障 / 远程浏览器

> 行为主本：Android 仓 `docs/ai/existing-logic/troubleshoot.md` + `docs/ai/diff/troubleshoot.md`  
> Compose：`presentation/screen/troubleshoot/`  
> CFG：`universal_mirror_troubleshoot_website`（JSON `url`）

## 设计引用

| alias | DS | 场景 |
|-------|-----|------|
| DS:troubleshoot-main | DS-01 | 手风琴列表全折叠 + 顶栏 |
| DS:troubleshoot-expanded | DS-02 | 单主题展开 |
| DS:troubleshoot-expanded-rich | DS-03 | 图文步骤 / 长滚动展开 |

缓存：`design/cache/troubleshoot/`（见 `design/bindings.md`）

**信息架构**：Topic 顺序与子项文案以现网 `activity_troubleshoot.xml` / `no_need_translate_strings.xml` 为准；蓝湖 v1.4.6 结构不覆盖 Diff 拍板。

## 页面（概要）

- **TroubleshootScreen**：本地 WebView 替代 — 手风琴 + Contact Us（预填表单 URL）
- **入口**：settings 点击 → URL 非空浏览器 / 空 URL 进本地页

## 埋点

- `click_setting_troubleshoot`（settings 入口，本模块不重复）
