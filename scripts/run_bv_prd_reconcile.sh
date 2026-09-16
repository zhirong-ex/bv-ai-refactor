#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/run_bv_prd_reconcile.sh <config.json>" >&2
  echo "   or: bash scripts/run_bv_prd_reconcile.sh --project ... --source ... --output ... [--git-url ...]" >&2
  exit 1
fi

node scripts/bv_prd_reconcile.mjs "$@"
