#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: bash scripts/run_bv_modao2prd.sh \"<modao-sharing-url>\" [output_dir] [--version NAME ...]" >&2
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARING_URL="$1"
shift

OUTPUT_DIR_ARG=""
VERSION_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || usage
      VERSION_ARGS+=("--version" "$2")
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      if [[ -z "$OUTPUT_DIR_ARG" ]]; then
        OUTPUT_DIR_ARG="$1"
      else
        echo "Unexpected argument: $1" >&2
        usage
      fi
      shift
      ;;
  esac
done

cd "$REPO_ROOT"

PIPELINE_START=$SECONDS
export BV_RUN_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
export BV_SHARING_URL="$SHARING_URL"

GEN_ARGS=("$SHARING_URL")
if [[ -n "$OUTPUT_DIR_ARG" ]]; then
  GEN_ARGS+=("$OUTPUT_DIR_ARG")
fi

URLS_CODEX_START=$SECONDS
GEN_LOG="$(mktemp)"
if ! node .cursor/skills/bv-modao2prd/generate_urls_codex.js "${GEN_ARGS[@]}" 2>&1 | tee "$GEN_LOG"; then
  rm -f "$GEN_LOG"
  exit 1
fi
export BV_URLS_CODEX_SEC=$((SECONDS - URLS_CODEX_START))

OUTPUT_DIR="$(grep '^OUTPUT_DIR=' "$GEN_LOG" | tail -1 | cut -d= -f2-)"
rm -f "$GEN_LOG"

if [[ -z "$OUTPUT_DIR" ]]; then
  echo "Failed to resolve OUTPUT_DIR from generate_urls_codex.js" >&2
  exit 1
fi

if ((${#VERSION_ARGS[@]})); then
  bash "$REPO_ROOT/scripts/export_all_from_urls_codex.sh" "$OUTPUT_DIR" "${VERSION_ARGS[@]}"
else
  bash "$REPO_ROOT/scripts/export_all_from_urls_codex.sh" "$OUTPUT_DIR"
fi

PIPELINE_SEC=$((SECONDS - PIPELINE_START))
echo ">>> bv-modao2prd pipeline finished in ${PIPELINE_SEC}s (~$(node -e "console.log(Math.round(${PIPELINE_SEC}/60*100)/100)") min)"
echo ">>> See ${OUTPUT_DIR}/run-stats.json and run-stats.latest.txt"
