# Connect / Cast / Mirror 协议扩展

现网是 **品牌集合 + 少数真协议**（见 `device-search.md` / `mirror-flow.md`）。重构要能加品牌、加协议，但 **调用深度仍是中等偏下**（禁止再套 Facade）。

**主文**：`docs/ai/existing-logic/`；本页只定 **怎么分包、怎么注册**。

---

## 1. 品牌 ≠ 协议

| 概念 | 现网例子 | 加东西时改哪 |
|------|----------|----------------|
| **品牌** | Samsung、Roku、DLNA、Amazon… | 多半只改 `BrandProtocolMap` + CFG 列表 |
| **连接协议** | 真连（Amazon/LG）、虚连、AirPlay connect | 新连接方式 → 新 `ConnectPort` |
| **镜像协议** | Fire / WebOS / Cast send / AirPlay mirror / **系统 Miracast** | 新投屏方式 → 新 `MirrorPort` |
| **发现** | `UniversalDeviceControl` + Cast SDK | 新发现通道 → 新 `DiscoveryPort`（可与连接同 SDK） |

Cast **搜索** 和 Cast **镜像发送**（`GoogleCastSenderManager` IP）是两条能力，不要合成一个上帝类。ReceiverId 只认 Manifest 的 **`C0868879`**。

---

## 2. 目录（app 包内）

```text
domain/protocol/
  Brand.kt                  # 现网品牌枚举 + Unspecified
  ConnectKind.kt            # Real / Virtual / AirPlay / None
  MirrorKind.kt             # Fire / Web / Cast / AirPlay / SystemMiracast
  ConnectPort.kt            # 接口：connect / disconnect / submitPin …
  MirrorPort.kt             # 接口：start / stop / setQuality / events
  DiscoveryPort.kt          # 可选：若发现与连接分裂
domain/protocol/map/
  BrandRouting.kt           # Brand → ConnectKind + MirrorKind（纯函数，零 Android）

data/protocol/
  connect/
    RealConnectPort.kt      # UniversalDeviceControl，仅 Amazon / LG_WEBOS
    VirtualConnectPort.kt
    AirPlayConnectPort.kt
  mirror/
    FireMirrorPort.kt
    WebOsMirrorPort.kt
    CastMirrorPort.kt       # GoogleCastSenderManager
    AirPlayMirrorPort.kt
    SystemMiracastPort.kt   # MiracastController.goToMiracastSetting（一等公民）
  BrandRoutingSource.kt     # 读 UniversalConstant.enable* 填 BrandRouting
  ProtocolRegistry.kt       # kind → Port；启动注册一次
```

ViewModel **只依赖** `ConnectPort`/`MirrorPort` 的 **Registry + BrandRouting**，不 `when (brand)` 调四个 Manager。

屏幕仍在 `presentation/screen/devicesearch|mirrorflow/`。协议包 **跨屏复用**，不要复制进两个 screen。

---

## 3. 调用链（允许的深度）

```text
Screen → ViewModel → ProtocolRegistry.resolve(brand) → XxxPort → 既有 Manager/SDK
```

- Registry 是 **查表**，不是业务 UseCase。
- **禁止**：VM → MirrorFacade → MirrorUseCase → Registry → Port → XxxHelper → Manager。
- 新增协议：`data/protocol/.../NewPort.kt` + `ProtocolRegistry` **一行注册** + `BrandRouting` 映射。不改 Screen，尽量不改 VM（只认接口事件）。

---

## 4. 现网必须先挂上的 Port（第一批就要有，禁止先写死 if）

**连接**

- `RealConnectPort` ← `needRealConnectDeviceBrands`（Amazon、LG_WEBOS）
- `AirPlayConnectPort` ← Apple（PIN/密码，5s）
- `VirtualConnectPort` ← 其余 `enableDeviceBrands`（500ms 虚连等现网时序）

**镜像**

- Fire / Web / Cast / AirPlay 四路现网 Impl
- `SystemMiracastPort` ← **不在** `enableMirrorBrands` 的品牌（Samsung 等）— 不要写成 VM 的 `else`

教程简版 vs 分步：用 `BrandRouting.tutorialKind`，不要在 Screen 里写死 LG/Cast/Apple 三个 if（可放 routing 表）。

---

## 5. 以后怎么加

| 需求 | 做法 |
|------|------|
| 多一个走 **虚连 + 系统 Miracast** 的电视品牌 | `BrandRouting` + CFG 列表；**零新 Port** |
| 多一个走 **现有 Fire/Web/Cast/AirPlay** 的型号 | 只扩品牌映射 |
| 全新协议（如新 SDK） | 新 `*Port` + 注册 + routing；SDK 仍在原 Gradle 模块，Port 只编排 |
| 配置关闭某品牌 | routing 读 CFG，不要删 Port 类 |

---

## 6. 事件与 UI

- Port 向上报 **统一** domain 事件（连接态、镜像态、PIN、需装 Receiver…），VM 映射 UiState。
- 品牌文案/埋点名：routing 或小表 `BrandAnalyticsName`，禁止每个 Port 复制一套 `click_connect_*` 字符串散落。
- 超时（连接 5s、Web 17s、Google 5s…）放 **对应 Port 或现网 Manager**，不要集中在 VM 一堆 Timer。

---

## 7. 与批次 / 性能

- 第一批 connect：接口 + routing + 三个 ConnectPort 接到现网 Manager，VM 去掉品牌 if。
- 第一批 mirror：接口 + 五路 Port（含 SystemMiracast）。
- 不要为「未来 20 个协议」先写空 Port。
- Registry 用 `Map`/`List` 启动填充；热路径 `resolve` 禁止每次反射。
