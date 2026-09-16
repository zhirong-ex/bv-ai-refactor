#!/usr/bin/env bash
# bv-table-sync — fetch Feishu sheets and write registry/*.json
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_VERSION="${1:-1.5.4}"
I18N_DEFAULT_SINCE="${2:-v1.0.0}"
CACHE=".cache/bv-table-sync"
mkdir -p "$CACHE"

CONFIG_URL="https://boostvision.feishu.cn/sheets/Rx5rs40k1hHZSUtShdacPxmenph"
ANALYTICS_URL="https://boostvision.feishu.cn/sheets/Y82NsQtzAhNInAt04VecueNGnhd"
I18N_URL="https://boostvision.feishu.cn/sheets/KgrzsvYDzhAMrftRHnYcqOlTnne"

sheet_range() {
  # Usage: sheet_range <url> [sheet_id_override]
  # Prints: <sheet_id>!<A1>:<Col><Row>  e.g. c5327b!A1:W215
  python3 - "$1" "${2:-}" <<'PY'
import json, subprocess, sys

def col_letter(n: int) -> str:
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s

url, sheet_override = sys.argv[1], sys.argv[2]
proc = subprocess.run(
    ["lark-cli", "sheets", "+info", "--url", url],
    capture_output=True,
    text=True,
    check=True,
)
info = json.loads(proc.stdout)
sheets = info["data"]["sheets"]["sheets"]
sheet = next((s for s in sheets if s["sheet_id"] == sheet_override), sheets[0]) if sheet_override else sheets[0]
gp = sheet["grid_properties"]
sid = sheet["sheet_id"]
last_col = col_letter(gp["column_count"])
last_row = gp["row_count"]
print(f"{sid}!A1:{last_col}{last_row}")
PY
}

echo "==> Fetch config sheet"
CONFIG_RANGE=$(sheet_range "$CONFIG_URL" "c5327b")
lark-cli sheets +read --url "$CONFIG_URL" --range "$CONFIG_RANGE" \
  > "$CACHE/config_raw.json"

echo "==> Fetch analytics sheet"
ANALYTICS_RANGE=$(sheet_range "$ANALYTICS_URL" "d7e81b")
lark-cli sheets +read --url "$ANALYTICS_URL" --range "$ANALYTICS_RANGE" \
  > "$CACHE/analytics_raw.json"

echo "==> Fetch i18n sheet (full column width for all locales)"
I18N_RANGE=$(sheet_range "$I18N_URL" "24222b")
lark-cli sheets +read --url "$I18N_URL" --range "$I18N_RANGE" \
  > "$CACHE/i18n_raw.json"

echo "==> Convert to registry/"
node scripts/bv_table_sync.mjs \
  --app-version "$APP_VERSION" \
  --i18n-default-since "$I18N_DEFAULT_SINCE" \
  --out registry
