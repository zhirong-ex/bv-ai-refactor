#!/usr/bin/env bash
# 一次性配置：bv-* skill 软链到用户级 + 提示打开 Multi-root 工作区
set -euo pipefail

AI_REPO="/Users/lizhirong/boostvision/otherBoostvision/AI"
SKILLS_SRC="${AI_REPO}/.cursor/skills"
SKILLS_DST="${HOME}/.cursor/skills"
WORKSPACE="/Users/lizhirong/boostvision/zhongnan/zhongnan-refactor.code-workspace"

BV_SKILLS=(
  bv-modao2prd
  bv-prd-reconcile
  bv-spec-canonical
  bv-table-sync
  bv-design-bind
  bv-work-plan
  bv-compose-write
  bv-accept-gate
  bv-fix-record
  bv-spec-lite
  bv-refactor-pipeline
)

mkdir -p "${SKILLS_DST}"

echo "→ 软链 bv-* skills → ${SKILLS_DST}"
for s in "${BV_SKILLS[@]}"; do
  src="${SKILLS_SRC}/${s}"
  dst="${SKILLS_DST}/${s}"
  if [[ ! -d "${src}" ]]; then
    echo "  ✗ 源不存在，跳过: ${src}" >&2
    continue
  fi
  if [[ -L "${dst}" ]]; then
    rm "${dst}"
  elif [[ -e "${dst}" ]]; then
    echo "  ✗ 目标已存在且非软链，跳过: ${dst}" >&2
    continue
  fi
  ln -sf "${src}" "${dst}"
  echo "  ✓ ${s}"
done

echo ""
echo "→ Multi-root 工作区: ${WORKSPACE}"
if [[ -f "${WORKSPACE}" ]]; then
  echo "  ✓ 已存在"
else
  echo "  ✗ 未找到，请确认 zhongnan-refactor.code-workspace 已创建"
fi

echo ""
echo "完成。下一步："
echo "  1. Cursor → File → Open Workspace from File…"
echo "     选择: ${WORKSPACE}"
echo "  2. Settings → Agents → Approvals & Execution → Run Mode → Run Everything"
echo "  3. 在新 Chat 里粘贴 docs/ai/README.md 中的 handoff 模板"
