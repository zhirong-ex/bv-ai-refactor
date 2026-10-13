#!/usr/bin/env bash
# 将本 Spec 仓 .cursor/skills/bv-* 链到 Cursor 全局 skills 目录，便于 @bv-* 识别。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CURSOR_SKILLS="${CURSOR_SKILLS_DIR:-${HOME}/.cursor/skills}"

mkdir -p "${CURSOR_SKILLS}"

linked=0
for skill_dir in "${AI_ROOT}"/.cursor/skills/bv-*; do
  [[ -d "${skill_dir}" ]] || continue
  name="$(basename "${skill_dir}")"
  target="${CURSOR_SKILLS}/${name}"
  if [[ -d "${target}" && ! -L "${target}" ]]; then
    rm -rf "${target}"
  fi
  ln -sfn "${skill_dir}" "${target}"
  echo "linked ${name} -> ${skill_dir}"
  linked=$((linked + 1))
done

if [[ "${linked}" -eq 0 ]]; then
  echo "error: no bv-* skills under ${AI_ROOT}/.cursor/skills" >&2
  exit 1
fi

echo ""
echo "Done (${linked} skills). Open workspace:"
echo "  ${AI_ROOT}/zhongnan-refactor.code-workspace"
