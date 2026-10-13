# bv-ai-refactor

**BoostVision AI refactor — shared Spec, design, registry, and `@bv-*` Cursor skills for any Android legacy app**

| | |
|--|--|
| **Git remote** | [github.com/zhirong-ex/bv-ai-refactor](https://github.com/zhirong-ex/bv-ai-refactor) |
| **New project onboarding** | **[docs/refactor-onboarding.md](docs/refactor-onboarding.md)** — clone this repo and plug in **your** Android app |
| **Example project (`projectId`)** | **`zhongnan`** → [docs/demo-zhongnan.md](docs/demo-zhongnan.md) (Miracast GP; fully wired sample, not the only consumer) |

---

## About · 仓库是做什么的

**EN** — This repo is **not** an Android application. It is the **shared template** for AI-assisted refactors: modular specs, Feishu/registry snapshots, Lanhu bindings & cache, Modao archives, and **authoritative `bv-*` skills** for Cursor. Each product keeps its **own Android git repo** + a row in `registry/projects/<id>.json`.

**中文** — 本仓是 **通用 AI 重构模板仓**，服务多个老项目：spec、registry、蓝湖、墨刀、Skill 全员共用；**每个 App 各自独立的 Android 仓库**，通过 `registry/projects/<id>.json` 接入流水线。

| Audience | Start here |
|----------|------------|
| **同事接新项目** | [docs/refactor-onboarding.md](docs/refactor-onboarding.md) |
| **Agent** | [AGENTS.md](AGENTS.md) |
| **Skill 说明** | [docs/bv-skills-guide.md](docs/bv-skills-guide.md) |
| **看一个填好的实例** | [docs/demo-zhongnan.md](docs/demo-zhongnan.md)（example: `zhongnan`） |

---

## Directory map · 目录

| Path | Purpose |
|------|---------|
| `.cursor/skills/bv-*` | Cursor Skills → run `./scripts/link-bv-skills.sh` once per machine |
| `registry/projects/` | Per-app config (`<id>.json` shared template; `<id>.local.json` gitignored paths) |
| `registry/projects/_template.local.json.example` | Copy for **your** `myapp.local.json` |
| `spec/modules/` | Module specs (auxiliary to Android `docs/ai/existing-logic/`) |
| `registry/` | CFG / EVT / I18N JSON |
| `design/` | Lanhu bindings + cache (**never** in Android repo) |
| `modao-output/` | Modao PRD archives |
| `docs/` | Human docs (onboarding, guides, examples) |
| `scripts/` | e.g. `link-bv-skills.sh` |
| `*-refactor.code-workspace` | Multi-root Cursor workspace (copy & edit Android folder path) |

Plan / gate / roadmap **主本** live in each **Android** repo under `docs/ai/`.

---

## Quick start · 快速开始

### 1. Any new app（通用）

```bash
git clone https://github.com/zhirong-ex/bv-ai-refactor.git
cd bv-ai-refactor
./scripts/link-bv-skills.sh
```

Then follow **[docs/refactor-onboarding.md](docs/refactor-onboarding.md)**:

- `cp registry/projects/_template.local.json.example registry/projects/<your-id>.local.json`
- Copy & edit a `*-refactor.code-workspace` (Android path → your repo)
- Bootstrap **your** Android repo `docs/ai/` (`架构规则.md`, `路线图.md`, …)
- Cursor: **Run Everything** → `@bv-index` / `@bv-existing-logic`

### 2. Example only：`zhongnan`

Pre-filled sample for training and copy-paste (Miracast GP, Android repo e.g. `zhongnan1.5.3` on GitLab):

| Artifact | Example path |
|----------|----------------|
| Project config | [registry/projects/zhongnan.json](registry/projects/zhongnan.json) |
| Local paths template | `registry/projects/zhongnan.local.json.example` |
| Workspace | [zhongnan-refactor.code-workspace](zhongnan-refactor.code-workspace) |
| Walkthrough | [docs/demo-zhongnan.md](docs/demo-zhongnan.md) |
| Android README | sibling app repo root `README.md` |

```text
@bv-refactor-pipeline
项目：zhongnan
```

Other apps use **`项目：<your-id>`**, not `zhongnan`.

---

## Pipeline (short) · 流水线概要

```text
bv-modao2prd → … → bv-existing-logic → bv-design-bind → bv-work-plan
  → bv-compose-write → bv-accept-gate
```

Orchestration: `@bv-refactor-pipeline` + `registry/projects/<id>.json` (or `<id>.local.json` on your machine).

---

## Two-repo rule · 双仓纪律

| Spec repo (this) | Each Android repo |
|------------------|-------------------|
| `spec/`, `registry/`, `design/`, `modao-output/` | `app/…`, `docs/ai/` |

Do **not** create `design/` under Android projects.

---

## Git / network · 推送说明

If `git push` fails on **github.com:443**, and you use a local proxy (often `127.0.0.1:7890`):

```bash
git config http.proxy http://127.0.0.1:7890
git config https.proxy http://127.0.0.1:7890
```

Or one-shot: `git -c http.proxy=http://127.0.0.1:7890 -c https.proxy=http://127.0.0.1:7890 push origin main`

---

## License · 许可

**EN** — Internal BoostVision material; follow company policy for access and sharing.

**中文** — BoostVision 内部资料，按公司规范使用与分发。
