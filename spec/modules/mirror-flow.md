# mirror-flow — Cast / Mirror / 教程

> 行为主本：Android 仓 `docs/ai/existing-logic/mirror-flow.md`（待梳理）  
> 产品：墨刀 v1.4.0+ 镜像教程 / 开始镜像；v1.3.0 GoogleCast；v1.2.0 LG/Fire 参数页  
> Compose：`presentation/screen/mirrorflow/`

## 设计引用

| alias | DS | 场景 |
|-------|-----|------|
| DS:mirror-flow-tutorial | DS-01 | 镜像教程（折叠） |
| DS:mirror-flow-tutorial-unfold | DS-01-unfold | 教程展开 |
| DS:mirror-flow-prep-generic | DS-02 | 参数选择 / Start（Chromecast 等） |
| DS:mirror-flow-prep-lg | DS-03 | LG webOS 参数页 |
| DS:mirror-flow-prep-lg-touch | DS-03-alt-touch | LG touch 变体 |
| DS:mirror-flow-prep-fire | DS-04 | Fire TV 参数页 |
| DS:mirror-flow-prep-fire-gray | DS-04-alt-gray | Fire Start 不可用 |
| DS:mirror-flow-active-web | DS-05 | 镜像中（WebMirror 控制） |
| DS:mirror-flow-active-web-volume | DS-05-alt-volume | Web 音量 overlay |
| DS:mirror-flow-loading | DS-06 | 开始镜像 loading |
| DS:mirror-flow-dialog-lg-switch | DS-07 | LG 切换镜像弹窗 |
| DS:mirror-flow-dialog-fire | DS-08 | Fire TV 弹窗 |
| DS:mirror-flow-dialog-download | DS-09 | Receiver 下载提示 |
| DS:mirror-flow-record-remind | DS-10 | 录屏/录音权限提醒 |
| DS:mirror-flow-native-tutorial | DS-11 | 教程页 Native |
| DS:mirror-flow-native-lg | DS-12 | LG 参数页 Native |
| DS:mirror-flow-native-fire | DS-13 | Fire 参数页 Native |
| DS:mirror-flow-native-cast-start | DS-14 | Google Cast Start + Native |
| DS:mirror-flow-native-cast-stop | DS-15 | Google Cast Stop + Native |

缓存：`design/cache/mirror-flow/`（见 `design/bindings.md`）

## 页面（概要，待 canonical 补全）

- **BeforeMirror**：按协议展示教程 → 参数选择（画质 / 音量开关）→ Start Mirroring
- **MirrorActivity**：镜像中控制（WebMirror 等）；通知栏回前台
- **弹窗**：LG 切换镜像、Fire 下载/配对、Receiver 下载提示、录屏权限

## 配置（CFG，节选）

- `miracast_enable_mirror_tutorial_native_ad`
- `miracast_enable_mirror_page_native_ad`
- `miracast_enable_stop_mirroring_interstitial_ad`

完整键见 `registry/`（待 table-sync）
