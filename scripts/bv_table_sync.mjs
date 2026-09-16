#!/usr/bin/env node
/**
 * bv-table-sync — Feishu config / analytics / i18n sheets → registry/*.json
 *
 * Usage:
 *   node scripts/bv_table_sync.mjs --config-raw .cache/bv-table-sync/config_raw.json \
 *     --analytics-raw .cache/bv-table-sync/analytics_raw.json \
 *     --i18n-raw .cache/bv-table-sync/i18n_raw.json \
 *     --app-version 1.5.4 \
 *     --out registry
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = {
  config: 'https://boostvision.feishu.cn/sheets/Rx5rs40k1hHZSUtShdacPxmenph',
  analytics: 'https://boostvision.feishu.cn/sheets/Y82NsQtzAhNInAt04VecueNGnhd',
  i18n: 'https://boostvision.feishu.cn/sheets/KgrzsvYDzhAMrftRHnYcqOlTnne',
};

function parseArgs(argv) {
  const args = {
    configRaw: '.cache/bv-table-sync/config_raw.json',
    analyticsRaw: '.cache/bv-table-sync/analytics_raw.json',
    i18nRaw: '.cache/bv-table-sync/i18n_raw.json',
    appVersion: '1.5.4',
    i18nDefaultSince: 'v1.0.0',
    out: 'registry',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config-raw') args.configRaw = argv[++i];
    else if (a === '--analytics-raw') args.analyticsRaw = argv[++i];
    else if (a === '--i18n-raw') args.i18nRaw = argv[++i];
    else if (a === '--app-version') args.appVersion = argv[++i];
    else if (a === '--i18n-default-since') args.i18nDefaultSince = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--help') {
      console.log(`Usage: node scripts/bv_table_sync.mjs [--app-version 1.5.4] [--i18n-default-since v1.0.0] [--out registry]`);
      process.exit(0);
    }
  }
  args.i18nDefaultSince = normalizeSince(args.i18nDefaultSince) ?? 'v1.0.0';
  return args;
}

function flattenText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const s = value.trim();
    return s === '' ? null : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.every((seg) => seg && typeof seg === 'object' && 'text' in seg)) {
      const text = value.map((seg) => seg.text ?? '').join('');
      const s = text.trim();
      return s === '' ? null : text;
    }
    return value;
  }
  return value;
}

function cell(row, idx) {
  if (!row || idx >= row.length) return null;
  return flattenText(row[idx]);
}

function normalizeSince(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.startsWith('v') ? s : `v${s}`;
}

function normalizeConfigType(raw) {
  if (!raw) return 'string';
  const map = {
    boolean: 'boolean',
    json: 'json',
    number: 'number',
    string: 'string',
    'string[]': 'string[]',
  };
  return map[String(raw).trim().toLowerCase()] ?? String(raw).trim().toLowerCase();
}

function joinNote(...parts) {
  return parts.filter(Boolean).map(String).join('\n').trim() || undefined;
}

async function loadValues(path) {
  const abs = resolve(ROOT, path);
  const json = JSON.parse(await readFile(abs, 'utf8'));
  if (!json.ok) throw new Error(`Failed to read ${path}: ${JSON.stringify(json.error)}`);
  return json.data.valueRange.values;
}

function parseConfigRows(values) {
  const out = [];
  let currentModule = null;
  for (const row of values.slice(1)) {
    const module = cell(row, 0);
    if (module) currentModule = module;
    const key = cell(row, 1);
    if (!key) continue;

    const type = normalizeConfigType(cell(row, 2));
    const desc = cell(row, 3);
    const defaultVal = cell(row, 4);
    const unit = cell(row, 5);
    const since = normalizeSince(cell(row, 6));
    const remark = cell(row, 7);
    const changelog = cell(row, 8);

    const entry = {
      key: String(key).trim(),
      type,
      since: since ?? 'v1.0.0',
    };
    if (defaultVal !== null) entry.default = defaultVal;
    const note = joinNote(
      currentModule ? `[${currentModule}] ${desc ?? ''}`.trim() : desc,
      unit ? `单位: ${unit}` : null,
      remark,
      changelog,
    );
    if (note) entry.note = note;
    out.push(entry);
  }
  return out;
}

function parseAnalyticsRows(values) {
  const out = [];
  let current = null;

  function flush() {
    if (!current) return;
    if (current.params.length === 0) delete current.params;
    else current.params = current.params.map((p) => {
      const param = { label: p.label, type: p.type };
      if (p.unit) param.unit = p.unit;
      if (p.values.length === 1) {
        param.value = p.values[0];
        if (p.descriptions[0]) param.description = p.descriptions[0];
      } else if (p.values.length > 1) {
        param.values = p.values;
        if (p.descriptions.some(Boolean)) param.descriptions = p.descriptions;
      } else if (p.descriptions[0]) {
        param.description = p.descriptions[0];
      }
      return param;
    });
    out.push(current);
    current = null;
  }

  for (const row of values.slice(1)) {
    const eventId = cell(row, 4);
    if (eventId) {
      const event = String(eventId).trim();
      if (!event) continue;
      flush();
      const purpose = cell(row, 0);
      const page = cell(row, 1);
      const eventName = cell(row, 2);
      const eventType = cell(row, 3);
      current = {
        event,
        trigger: cell(row, 10) ?? '',
        since: normalizeSince(cell(row, 11)) ?? 'v1.0.0',
        params: [],
      };
      const note = joinNote(
        purpose,
        page ? `页面: ${page}` : null,
        eventName,
        eventType,
        cell(row, 12),
      );
      if (note) current.note = note;

      const label = cell(row, 5);
      const type = cell(row, 6);
      const value = cell(row, 7);
      const unit = cell(row, 8);
      const desc = cell(row, 9);
      if (label || type || value || desc) {
        current.params.push({
          label: label ?? '',
          type: type ?? '',
          unit: unit ?? undefined,
          values: value != null ? [String(value)] : [],
          descriptions: desc ? [String(desc)] : [],
        });
      }
      continue;
    }

    if (!current) continue;

    const label = cell(row, 5);
    const type = cell(row, 6);
    const value = cell(row, 7);
    const unit = cell(row, 8);
    const desc = cell(row, 9);
    const trigger = cell(row, 10);

    if (trigger && !current.trigger) current.trigger = trigger;

    if (label) {
      current.params.push({
        label,
        type: type ?? '',
        unit: unit ?? undefined,
        values: value != null ? [String(value)] : [],
        descriptions: desc ? [String(desc)] : [],
      });
    } else if (current.params.length > 0) {
      const last = current.params[current.params.length - 1];
      if (type && !last.type) last.type = type;
      if (unit && !last.unit) last.unit = unit;
      if (value != null) last.values.push(String(value));
      if (desc) last.descriptions.push(String(desc));
    }
  }
  flush();
  return out;
}

const I18N_KEY_HEADER = /^(key|资源名|文案\s*key|string\s*key)$/i;
const I18N_SINCE_HEADER = /^(版本|加入版本|since|version)$/i;
const I18N_META_HEADER = /^(screens?|页面|note|备注|说明|changelog|change\s*log|模块|用途)$/i;

/** Map Feishu column header → Android values-* locale suffix. */
function headerToLocale(header) {
  const name = String(header).trim();
  if (name === 'values') return 'en';
  if (name.startsWith('values-')) return name.slice('values-'.length);
  return name;
}

/**
 * Infer i18n sheet layout from header row.
 * - Key / 版本 / 备注 等元数据列按表头识别
 * - 其余非空列一律视为语言列（14、16… 因项目而异，全量解析）
 */
function parseI18nSchema(headerRow) {
  let keyIndex = 0;
  let sinceIndex = null;
  let sinceColumn = null;
  const localeCols = [];
  const metaColumns = [];

  for (let i = 0; i < headerRow.length; i++) {
    const raw = cell(headerRow, i);
    if (!raw) continue;
    const name = String(raw).trim();

    if (I18N_KEY_HEADER.test(name)) {
      keyIndex = i;
      continue;
    }
    if (I18N_SINCE_HEADER.test(name)) {
      sinceIndex = i;
      sinceColumn = name;
      continue;
    }
    if (I18N_META_HEADER.test(name)) {
      metaColumns.push(name);
      continue;
    }
    localeCols.push({ index: i, locale: headerToLocale(name), header: name });
  }

  return { keyIndex, sinceIndex, sinceColumn, localeCols, metaColumns };
}

function parseI18nRows(values, defaultSince = 'v1.0.0') {
  const schema = parseI18nSchema(values[0] ?? []);
  const out = [];
  for (const row of values.slice(1)) {
    const key = cell(row, schema.keyIndex);
    if (!key) continue;

    const locales = {};
    for (const { index, locale } of schema.localeCols) {
      const text = cell(row, index);
      if (text != null) locales[locale] = String(text);
    }
    if (Object.keys(locales).length === 0) continue;

    const since =
      schema.sinceIndex != null
        ? normalizeSince(cell(row, schema.sinceIndex)) ?? defaultSince
        : defaultSince;

    const entry = {
      key: String(key).trim(),
      since,
      locales,
    };
    if (locales['zh-rCN'] != null) entry.zh = locales['zh-rCN'];
    else if (locales.zh != null) entry.zh = locales.zh;
    else entry.zh = '';
    if (locales.en != null) entry.en = locales.en;
    out.push(entry);
  }
  return {
    entries: out,
    localeCols: schema.localeCols.map((c) => c.locale),
    localeHeaders: schema.localeCols.map((c) => c.header),
    sinceColumn: schema.sinceColumn,
    defaultSince,
  };
}

function assertUnique(items, field, label) {
  const seen = new Map();
  for (const item of items) {
    const k = item[field];
    if (seen.has(k)) {
      throw new Error(`Duplicate ${label} ${field}=${k} (rows ${seen.get(k)} and current)`);
    }
    seen.set(k, k);
  }
}

function deltaSummary(items, appVersion) {
  const since = appVersion.startsWith('v') ? appVersion : `v${appVersion}`;
  return items.filter((x) => x.since === since);
}

async function main() {
  const args = parseArgs(process.argv);
  const configValues = await loadValues(args.configRaw);
  const analyticsValues = await loadValues(args.analyticsRaw);
  const i18nValues = await loadValues(args.i18nRaw);

  const config = parseConfigRows(configValues);
  const analytics = parseAnalyticsRows(analyticsValues);
  const { entries: i18n, localeCols: i18nLocales, localeHeaders, sinceColumn, defaultSince: i18nDefaultSince } =
    parseI18nRows(i18nValues, args.i18nDefaultSince);

  assertUnique(config, 'key', 'config');
  assertUnique(analytics, 'event', 'analytics');
  assertUnique(i18n, 'key', 'i18n');

  const syncedAt = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00');
  const meta = {
    app_version: args.appVersion,
    synced_at: syncedAt,
    sources: { ...SOURCES },
    counts: {
      config: config.length,
      analytics: analytics.length,
      i18n: i18n.length,
    },
    i18n_locales: i18nLocales,
    i18n_locale_headers: localeHeaders,
    i18n_default_since: i18nDefaultSince,
    i18n_since_column: sinceColumn,
    notes: {
      i18n_since:
        sinceColumn
          ? `since 取自表头「${sinceColumn}」；空单元格回退 ${i18nDefaultSince}`
          : `多语言表暂无版本列；since 统一默认 ${i18nDefaultSince}。后续产品在表内增加「版本/加入版本」列并填值后，重新 sync 即可写入真实版本号`,
    },
  };

  const outDir = resolve(ROOT, args.out);
  await mkdir(outDir, { recursive: true });
  const write = (name, data) =>
    writeFile(resolve(outDir, name), `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  await write('config.json', config);
  await write('analytics.json', analytics);
  await write('i18n.json', i18n);
  await write('meta.json', meta);

  const sinceTag = args.appVersion.startsWith('v') ? args.appVersion : `v${args.appVersion}`;
  console.log(JSON.stringify({
    ok: true,
    out: args.out,
    counts: meta.counts,
    i18n_locales: i18nLocales.length,
    i18n_default_since: i18nDefaultSince,
    i18n_since_column: sinceColumn,
    delta_v154: {
      config: deltaSummary(config, sinceTag).map((x) => x.key),
      analytics: deltaSummary(analytics, sinceTag).map((x) => x.event),
      i18n: deltaSummary(i18n, sinceTag).map((x) => x.key),
    },
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
