# Skill 完成收尾 — 必输出块

每个 `@bv-*` skill **结束时**，Agent 必须在回复末尾输出以下结构（可复制给用户）。不要只写一行「→ 下一 skill」。

## 通用头（每个 skill 都带）

```markdown
---
## ✅ <skill 名> 已完成

| 项 | 值 |
|----|-----|
| 工作区 | `zhongnan-refactor.code-workspace`（双根） |
| Spec 仓 | `otherBoostvision/AI` — **design/ 只在这里** |
| Android 仓 | `zhongnan/zhongnan1.5.3` |
| 本步产物 | `<列出的文件路径>` |
```

## 按 Phase 的「下一步 + 纪律」

### bv-design-bind（Phase 4）

- **下一步**：`@bv-work-plan` → `@bv-accept-gate` → `@bv-compose-write`
- **提醒**：bind 完成后 **再写 UI**；compose 每批读 `design/cache/<模块>/DS-xx/preview.png` + `schema.json`
- **禁止**：Android 仓出现 `design/`

### bv-work-plan（Phase 5）

- **下一步**：`@bv-accept-gate`（若无 gate）→ 等人 **方案审核** → `@bv-compose-write` 第 1 批
- **提醒**：工步 ≤20 文件；UI 工步引用 bindings 里 DS-xx

### bv-accept-gate（Phase 6）

- **下一步**：`@bv-compose-write` 按 plan 工步 1 起
- **提醒**：每条 UI AG 标 `MT-*`（对照 preview）；能 AT 的色值/token 写进 gate

### bv-compose-write 每批（Phase 7）

- **本批**：compile 绿 → gate AT → commit + tag → **停**
- **下一批**：新开对话，贴 `路线图.md` + plan 下一工步
- **视觉**：色值进 `Color.kt`；批末对照 DS-xx preview（静态能验的验完）
- **MT**：不阻塞 commit，模块末对照 preview 真机验收

### 模块全部工步完成

- **下一步**：跑完 gate 里所有 **MT** → Spec 仓 `bindings.md` DS 标 `done` → plan README 更新 → 开 **下一模块** 从 `@bv-design-bind`

## 阻塞时

输出：**原因 + 已完成 + 用户操作 + 恢复命令**（如 `@bv-refactor-pipeline zhongnan 从 compose 继续`）。
