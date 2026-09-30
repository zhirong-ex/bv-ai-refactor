# app-update — Play FLEXIBLE 应用内更新

> 行为主本：Android 仓 `docs/ai/existing-logic/app-update.md` + `docs/ai/diff/app-update.md`  
> Compose：`presentation/screen/appupdate/` + 首页宿主 `MainActivity` / `mainhome`

## 设计引用

| alias | DS | 场景 |
|-------|-----|------|
| DS:app-update-restart-bar | DS-01 | 下载完成底栏 + RESTART |
| DS:app-update-with-home-native | DS-02 | 更新条与 Home Native 同屏 |

缓存：`design/cache/app-update/`（见 `design/bindings.md`）

## 行为（概要）

- 开屏结束后进程内一次 `checkUpdate`；FLEXIBLE；每 `versionCode` 提示一次
- 系统更新面板走 `AppPopQueue` priority **10**
- DOWNLOADED 后展示更新条；**无**点击空白/返回收起（Diff 拍板）

## 文案

- `string_in_app_update_notice_message`
- RESTART：`no_trans_string_install`（与现网一致）
