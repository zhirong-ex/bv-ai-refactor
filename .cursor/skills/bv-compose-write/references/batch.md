# 批次边界 — 编译、提交、tag、人工关

`bv-compose-write` **默认只做一批然后停**。防编译死循环、方便回滚、避免上下文撑爆。

**写法**：做根因修复，用正确逻辑直接覆盖，不要打补丁；禁止写否定的否定，直接写肯定性描述。

主文（给人贴进新对话）：Android 工程 `docs/ai/架构规则.md`、`docs/ai/路线图.md`。

---

## 1. 不要为包装而包装

```text
OK:  Screen → ViewModel → RepositoryImpl → Manager
OK:  Screen → ViewModel → ProtocolRegistry.resolve(brand) → Port → Manager
NO:  Screen → Facade → UseCase → Helper → Repository → Wrapper → Manager
```

- 调用链目标 **3～4 跳**（含 Screen）；协议查表算一跳，理由见 protocol-ext.md。
- 禁止空转发、禁止「将来 20 个协议」的空 Port。
- 性能：少中间拷贝；Registry 用 Map，不要反射。

---

## 2. 每批必须编译（硬规则）

**禁止**「先改完再一起修编译错误」。

| 节奏 | 要求 |
|------|------|
| 每新增/改完 **1～3 个** `.kt` | 立刻 `./gradlew :app:compileNormalGpDebugKotlin`（或 plan variant） |
| 编译红 | **只修编译**，不准继续加功能文件 |
| 连续两次 compile 仍红 | **停**，把错误贴给用户，本批不 commit、不打 done tag |
| 本批 commit 前 | 再 compile 一次 + 本批 AT |

沙箱缺 JDK：`required_permissions: ["all"]`。

---

## 3. 文件数与提交

- **单批最多 15 个文件，硬顶 20**（含 test / gradle / 本批改动的 md）。超了：**拆批**，未写的退回 plan。
- **一批恰好一个 git commit**（gate/编译通过后）。不要多 commit 堆在一批，也不要多批挤一个 commit。
- 用户未要求时 **不 push**。

---

## 4. Tag（每批两个）

`NN` 为 `docs/ai/路线图.md` 中的两位数。

```bash
# 尚未改文件时
git tag refactor-batch-NN-start

# 本批 commit 成功后
git tag refactor-batch-NN-done
```

Agent 用 Shell 打 tag（`required_permissions: ["all"]`）。**不 force 删别人的 tag**。回滚说明写在路线图。

---

## 5. 一批只开一次对话

1. 用户新开 Chat，粘贴路线图 + 架构规则（或 @ 这两个文件）。
2. Agent **只执行当前 NN**。
3. 结束时更新路线图「下一批粘贴包」，**禁止**在同一对话里开 NN+1（即使用户说「继续」——提醒去新窗口，除非用户写明「本窗口继续下一批」）。

---

## 6. 人工三关（Agent 不得自行视为通过）

| 关 | Agent | 人 |
|----|--------|-----|
| **方案审核** | 动手前用短列表写出：文件清单、是否 ≤20、对照 existing-logic 的行为点 | **回复同意后才改代码**。模块首批还须 plan 已人工看过。 |
| **Code Review** | commit + `*-done` tag 后给 diff 摘要 | 人 CR；Agent 不默认合下一批 |
| **冒烟** | 可提供 AT 结果 / 可选 `android layout` | **人**走主路径；未冒烟不准开下一批 |

---

## 7. 本批流程（替换「自动跑完模块」）

```text
读路线图 NN → 方案清单等人点头（若本对话尚未同意）
→ tag *-start
→ 循环：改少量文件 → compile（红则只修编译）
→ AT → gate 自检
→ 更新路线图
→ commit 一次
→ tag *-done
→ 输出 CR 摘要 + 冒烟建议 + 下一批粘贴包
→ 停
```
