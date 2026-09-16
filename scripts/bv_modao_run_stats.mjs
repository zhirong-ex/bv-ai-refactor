#!/usr/bin/env node
/**
 * Append bv-modao2prd run timing stats for refactor methodology evaluation.
 *
 * Usage:
 *   node scripts/bv_modao_run_stats.mjs append <output_dir> <run_json_path>
 *   node scripts/bv_modao_run_stats.mjs summary <output_dir>
 */
'use strict';

import fs from 'fs';
import path from 'path';

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function formatMin(sec) {
  return Math.round((sec / 60) * 100) / 100;
}

function buildLatestText(run, aggregate) {
  const lines = [];
  lines.push(`bv-modao2prd run ${run.finished_at}`);
  if (run.version_filter?.length) {
    lines.push(`Version filter: ${run.version_filter.join(', ')}`);
  }
  const p = run.phases_sec || {};
  lines.push(
    `Total: ${run.elapsed_min} min (${run.elapsed_sec} s)`,
  );
  lines.push(
    `  urls_codex: ${formatMin(p.urls_codex || 0)} min | export: ${formatMin(p.export || 0)} min | build_prd: ${formatMin(p.build_prd || 0)} min`,
  );
  const c = run.canvases || {};
  lines.push(
    `Canvases: ${c.exported ?? 0} exported, ${c.skipped ?? 0} skipped, ${c.failed ?? 0} failed / ${c.total ?? 0} total`,
  );
  if (c.exported > 0 && run.avg_exported_canvas_sec != null) {
    lines.push(`Avg per exported canvas: ${formatMin(run.avg_exported_canvas_sec)} min (${run.avg_exported_canvas_sec} s)`);
  }
  if (aggregate?.runs?.length) {
    lines.push('');
    lines.push(`Historical runs in this project: ${aggregate.runs.length}`);
    lines.push(`Cumulative export time: ${formatMin(aggregate.cumulative_export_sec || 0)} min`);
  }
  return `${lines.join('\n')}\n`;
}

function appendRun(outputDir, runPayload) {
  const absOut = path.resolve(outputDir);
  const statsFile = path.join(absOut, 'run-stats.json');
  const latestFile = path.join(absOut, 'run-stats.latest.txt');

  const existing = readJson(statsFile) || {
    schema: 'bv-modao2prd-run-stats/v1',
    output_dir: absOut,
    sharing_url: runPayload.sharing_url || null,
    runs: [],
  };

  if (runPayload.sharing_url) {
    existing.sharing_url = runPayload.sharing_url;
  }

  existing.runs.push(runPayload);

  const cumulativeExportSec = existing.runs.reduce(
    (sum, r) => sum + (r.phases_sec?.export || 0),
    0,
  );
  existing.cumulative_export_sec = cumulativeExportSec;
  existing.last_run_at = runPayload.finished_at;
  existing.last_run_elapsed_min = runPayload.elapsed_min;

  writeJson(statsFile, existing);
  fs.writeFileSync(latestFile, buildLatestText(runPayload, existing), 'utf8');

  console.log(`>>> Run stats: ${statsFile}`);
  console.log(`>>> Latest summary: ${latestFile}`);
  console.log(`>>> Total elapsed: ${runPayload.elapsed_min} min (${runPayload.elapsed_sec} s)`);
}

function printSummary(outputDir) {
  const statsFile = path.join(path.resolve(outputDir), 'run-stats.json');
  const data = readJson(statsFile);
  if (!data?.runs?.length) {
    console.log('No run-stats.json or empty runs.');
    process.exit(1);
  }
  console.log(`Project: ${data.output_dir}`);
  console.log(`Runs: ${data.runs.length}`);
  console.log(`Cumulative export: ${formatMin(data.cumulative_export_sec || 0)} min`);
  for (const [i, run] of data.runs.entries()) {
    console.log('');
    console.log(`[${i + 1}] ${run.finished_at} — ${run.elapsed_min} min — exported ${run.canvases?.exported ?? 0}/${run.canvases?.total ?? 0}`);
  }
}

const [cmd, outputDir, runJsonPath] = process.argv.slice(2);

if (cmd === 'append') {
  if (!outputDir || !runJsonPath) {
    console.error('Usage: node bv_modao_run_stats.mjs append <output_dir> <run_json_path>');
    process.exit(1);
  }
  const runPayload = readJson(path.resolve(runJsonPath));
  if (!runPayload) {
    console.error('Missing or invalid run json:', runJsonPath);
    process.exit(1);
  }
  appendRun(outputDir, runPayload);
} else if (cmd === 'summary') {
  if (!outputDir) {
    console.error('Usage: node bv_modao_run_stats.mjs summary <output_dir>');
    process.exit(1);
  }
  printSummary(outputDir);
} else {
  console.error('Commands: append | summary');
  process.exit(1);
}
