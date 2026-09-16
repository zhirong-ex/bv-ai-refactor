#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR=""
VERSION_ARGS=()
VERSION_NAMES=()

usage() {
  echo "Usage: bash scripts/export_all_from_urls_codex.sh <output_dir> [--version NAME ...]" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || usage
      VERSION_ARGS+=("--version" "$2")
      VERSION_NAMES+=("$2")
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      if [[ -z "$OUTPUT_DIR" ]]; then
        OUTPUT_DIR="$1"
      else
        echo "Unexpected argument: $1" >&2
        usage
      fi
      shift
      ;;
  esac
done

[[ -n "$OUTPUT_DIR" ]] || usage

if [[ "$OUTPUT_DIR" != /* ]]; then
  OUTPUT_DIR="$REPO_ROOT/$OUTPUT_DIR"
fi
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"

if [[ ! -f "$OUTPUT_DIR/urls_codex" ]]; then
  echo "Missing urls_codex in: $OUTPUT_DIR" >&2
  exit 1
fi

export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-$HOME/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing}"

SCRIPT="$REPO_ROOT/scripts/export_single_canvas.mjs"
BUILD="$REPO_ROOT/scripts/build_prd.mjs"
LIB="$REPO_ROOT/scripts/urls_codex_lib.mjs"
STATS="$REPO_ROOT/scripts/bv_modao_run_stats.mjs"
EXPORT_BASE="$OUTPUT_DIR/.exports"
LOG="$OUTPUT_DIR/.exports/export.log"
URLS_CODEX="$OUTPUT_DIR/urls_codex"
RUN_JSON="$(mktemp)"
PER_CANVAS_JSONL="$(mktemp)"

mkdir -p "$EXPORT_BASE"
: > "$LOG"

EXPORT_PHASE_START=$SECONDS
EXPORTED=0
SKIPPED=0
FAILED=0

FLATTEN_ARGS=("$URLS_CODEX")
VERSION_FILTER_JSON="null"
if ((${#VERSION_NAMES[@]})); then
  FLATTEN_ARGS+=("${VERSION_ARGS[@]}")
  VERSION_FILTER_JSON="$(node -e "console.log(JSON.stringify(process.argv.slice(1)))" -- "${VERSION_NAMES[@]}")"
  echo ">>> Version filter: ${VERSION_NAMES[*]}" | tee -a "$LOG"
fi

current_folder=""
canvas_idx=0
total=0

while IFS=$'\t' read -r folder_name canvas_name url || [[ -n "${folder_name:-}" ]]; do
  [[ -z "${folder_name// /}" ]] && continue

  if [[ "$current_folder" != "$folder_name" ]]; then
    current_folder="$folder_name"
    canvas_idx=0
    mkdir -p "$EXPORT_BASE/$current_folder"
    echo ">>> Folder: $current_folder" | tee -a "$LOG"
  fi

  canvas_idx=$((canvas_idx + 1))
  total=$((total + 1))
  dir="$EXPORT_BASE/$current_folder/$(printf '%02d' "$canvas_idx")-${canvas_name}"

  if [[ -f "$dir/manifest.json" ]]; then
    SKIPPED=$((SKIPPED + 1))
    echo "=== [$total] SKIP (exists) $current_folder / $canvas_name ===" | tee -a "$LOG"
    node -e "
      const fs=require('fs');
      fs.appendFileSync(process.argv[1], JSON.stringify({
        folder: process.argv[2],
        name: process.argv[3],
        skipped: true,
        sec: 0,
      }) + '\n');
    " "$PER_CANVAS_JSONL" "$current_folder" "$canvas_name"
    continue
  fi

  CANVAS_START=$SECONDS
  echo "=== [$total] $current_folder / $canvas_name ===" | tee -a "$LOG"
  if node "$SCRIPT" "$url" "$dir" --timeout-ms 90000 2>&1 | tee -a "$LOG"; then
    EXPORTED=$((EXPORTED + 1))
    CANVAS_SEC=$((SECONDS - CANVAS_START))
    echo "=== [$total] done in ${CANVAS_SEC}s ===" | tee -a "$LOG"
    node -e "
      const fs=require('fs');
      fs.appendFileSync(process.argv[1], JSON.stringify({
        folder: process.argv[2],
        name: process.argv[3],
        skipped: false,
        failed: false,
        sec: Number(process.argv[4]),
      }) + '\n');
    " "$PER_CANVAS_JSONL" "$current_folder" "$canvas_name" "$CANVAS_SEC"
  else
    FAILED=$((FAILED + 1))
    CANVAS_SEC=$((SECONDS - CANVAS_START))
    echo "=== [$total] FAILED after ${CANVAS_SEC}s ===" | tee -a "$LOG"
    node -e "
      const fs=require('fs');
      fs.appendFileSync(process.argv[1], JSON.stringify({
        folder: process.argv[2],
        name: process.argv[3],
        skipped: false,
        failed: true,
        sec: Number(process.argv[4]),
      }) + '\n');
    " "$PER_CANVAS_JSONL" "$current_folder" "$canvas_name" "$CANVAS_SEC"
  fi
done < <(node "$LIB" flatten-urls "${FLATTEN_ARGS[@]}")

EXPORT_PHASE_SEC=$((SECONDS - EXPORT_PHASE_START))

BUILD_START=$SECONDS
echo ">>> Building PRD markdown files..." | tee -a "$LOG"
if ((${#VERSION_ARGS[@]})); then
  node "$BUILD" urls_codex .exports "$OUTPUT_DIR" "${VERSION_ARGS[@]}" 2>&1 | tee -a "$LOG"
else
  node "$BUILD" urls_codex .exports "$OUTPUT_DIR" 2>&1 | tee -a "$LOG"
fi
BUILD_PRD_SEC=$((SECONDS - BUILD_START))

echo "Done. Exported $EXPORTED new, skipped $SKIPPED, failed $FAILED / $total canvases into $OUTPUT_DIR" | tee -a "$LOG"

# Write run stats (export + build phases; urls_codex added by run_bv_modao2prd if present)
FINISHED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
URLS_CODEX_SEC="${BV_URLS_CODEX_SEC:-0}"
RUN_STARTED_AT="${BV_RUN_STARTED_AT:-$FINISHED_AT}"
TOTAL_ELAPSED_SEC=$((URLS_CODEX_SEC + EXPORT_PHASE_SEC + BUILD_PRD_SEC))

node -e "
const fs = require('fs');
const perCanvas = fs.readFileSync(process.argv[1], 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const exportedRows = perCanvas.filter((r) => !r.skipped && !r.failed);
const exportSecSum = exportedRows.reduce((s, r) => s + (r.sec || 0), 0);
const avgExported = exportedRows.length
  ? Math.round((exportSecSum / exportedRows.length) * 100) / 100
  : null;
const elapsedSec = Number(process.argv[2]);
const run = {
  pipeline: 'bv-modao2prd',
  started_at: process.argv[3],
  finished_at: process.argv[4],
  elapsed_sec: elapsedSec,
  elapsed_min: Math.round((elapsedSec / 60) * 100) / 100,
  sharing_url: process.argv[5] || null,
  version_filter: JSON.parse(process.argv[6]),
  phases_sec: {
    urls_codex: Number(process.argv[7]),
    export: Number(process.argv[8]),
    build_prd: Number(process.argv[9]),
  },
  canvases: {
    total: Number(process.argv[10]),
    exported: Number(process.argv[11]),
    skipped: Number(process.argv[12]),
    failed: Number(process.argv[13]),
  },
  avg_exported_canvas_sec: avgExported,
  per_canvas: perCanvas,
};
fs.writeFileSync(process.argv[14], JSON.stringify(run, null, 2));
" \
  "$PER_CANVAS_JSONL" \
  "$TOTAL_ELAPSED_SEC" \
  "$RUN_STARTED_AT" \
  "$FINISHED_AT" \
  "${BV_SHARING_URL:-}" \
  "$VERSION_FILTER_JSON" \
  "$URLS_CODEX_SEC" \
  "$EXPORT_PHASE_SEC" \
  "$BUILD_PRD_SEC" \
  "$total" \
  "$EXPORTED" \
  "$SKIPPED" \
  "$FAILED" \
  "$RUN_JSON"

node "$STATS" append "$OUTPUT_DIR" "$RUN_JSON"

rm -f "$RUN_JSON" "$PER_CANVAS_JSONL"

echo ">>> Export phase: ${EXPORT_PHASE_SEC}s | Build PRD: ${BUILD_PRD_SEC}s | Total (incl. urls_codex): ${TOTAL_ELAPSED_SEC}s (~$(node -e "console.log(Math.round(${TOTAL_ELAPSED_SEC}/60*100)/100)") min)" | tee -a "$LOG"
