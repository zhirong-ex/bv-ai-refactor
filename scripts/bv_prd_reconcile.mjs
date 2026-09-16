#!/usr/bin/env node
/**
 * bv-prd-reconcile — merge multi-source modao-output archives, dedupe versions,
 * supplement missing versions from Git ChangeLog.
 */

import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseUrlsCodex, flattenCanvases } from './urls_codex_lib.mjs';
import {
  compareSemver,
  formatChangeLogSupplementMd,
  parseChangeLog,
  parseSemver,
} from './changelog_lib.mjs';

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const NON_VERSION_NAMES = new Set(['待排期', 'sharing_url.txt', 'urls_codex']);

function usage() {
  console.error(`Usage:
  node scripts/bv_prd_reconcile.mjs \\
    --project miracast \\
    --output modao-output/_reconciled/miracast \\
    --source modao-output/【已上线V8】v1.0.0-v1.1.8__... \\
    --source modao-output/【已上线V8】v1.2.0-v1.3.2__... \\
    --source modao-output/【合集V8】Miracast_GP__... \\
    [--git-url https://gitlab.example.com/group/miracast.git] \\
    [--git-branch main] \\
    [--changelog-path ChangeLog] \\
    [--git-repo /local/path/to/repo] \\
    [--exclude 待排期] \\
    [--min-version 1.0.0] \\
    [--max-version 1.5.5]

Notes:
  - --source order matters: later sources override earlier on duplicate semver.
  - Provide either --git-url (remote) or --git-repo (local checkout).
  - Output is the reconciled Archive for bv-spec-canonical.`);
}

function parseArgs(argv) {
  const opts = {
    project: '',
    output: '',
    sources: [],
    gitUrl: '',
    gitBranch: 'main',
    changelogPath: 'ChangeLog',
    gitRepo: '',
    excludes: ['待排期'],
    minVersion: '',
    maxVersion: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--project' && argv[i + 1]) opts.project = argv[++i];
    else if (arg === '--output' && argv[i + 1]) opts.output = argv[++i];
    else if (arg === '--source' && argv[i + 1]) opts.sources.push(argv[++i]);
    else if (arg === '--git-url' && argv[i + 1]) opts.gitUrl = argv[++i];
    else if (arg === '--git-branch' && argv[i + 1]) opts.gitBranch = argv[++i];
    else if (arg === '--changelog-path' && argv[i + 1]) opts.changelogPath = argv[++i];
    else if (arg === '--git-repo' && argv[i + 1]) opts.gitRepo = argv[++i];
    else if (arg === '--exclude' && argv[i + 1]) opts.excludes.push(argv[++i]);
    else if (arg === '--min-version' && argv[i + 1]) opts.minVersion = argv[++i];
    else if (arg === '--max-version' && argv[i + 1]) opts.maxVersion = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!opts.project) throw new Error('--project is required');
  if (!opts.output) throw new Error('--output is required');
  if (!opts.sources.length) throw new Error('At least one --source is required');

  opts.output = resolve(ROOT, opts.output);
  opts.sources = opts.sources.map((source) => resolve(ROOT, source));
  if (opts.gitRepo) opts.gitRepo = resolve(opts.gitRepo);

  return opts;
}

async function loadConfig(configPath) {
  const raw = await readFile(configPath, 'utf8');
  const config = JSON.parse(raw);
  const argv = ['--project', config.project, '--output', config.output];
  for (const source of config.sources || []) argv.push('--source', source);
  if (config.git_url) argv.push('--git-url', config.git_url);
  if (config.git_branch) argv.push('--git-branch', config.git_branch);
  if (config.changelog_path) argv.push('--changelog-path', config.changelog_path);
  if (config.git_repo) argv.push('--git-repo', config.git_repo);
  if (config.min_version) argv.push('--min-version', config.min_version);
  if (config.max_version) argv.push('--max-version', config.max_version);
  for (const exclude of config.exclude || []) argv.push('--exclude', exclude);
  return parseArgs(argv);
}

function shouldExclude(name, excludes) {
  return excludes.some((pattern) => name === pattern || name.includes(pattern));
}

function inVersionRange(semver, minVersion, maxVersion) {
  const min = minVersion ? parseSemver(`v${minVersion}`) : null;
  const max = maxVersion ? parseSemver(`v${maxVersion}`) : null;
  if (min && compareSemver(semver, min) < 0) return false;
  if (max && compareSemver(semver, max) > 0) return false;
  return true;
}

async function fileSize(path) {
  try {
    const info = await stat(path);
    return info.size;
  } catch {
    return 0;
  }
}

/** @returns {Promise<{ sourceDir: string, sourceName: string, priority: number, entries: object[] }>} */
async function scanSource(sourceDir, priority, excludes) {
  const sourceName = basename(sourceDir);
  const urlsCodexPath = join(sourceDir, 'urls_codex');
  const urlsContent = await readFile(urlsCodexPath, 'utf8');
  const folders = parseUrlsCodex(urlsContent);
  const entries = [];

  for (const folder of folders) {
    if (shouldExclude(folder.name, excludes)) continue;

    const semver = parseSemver(folder.name);
    if (!semver) continue;

    const mdPath = join(sourceDir, `${folder.name}.md`);
    const canvasCount = flattenCanvases(folder.canvases).length;
    const mdSize = await fileSize(mdPath);

    entries.push({
      folderName: folder.name,
      semver,
      mdPath,
      mdExists: mdSize > 0,
      canvasCount,
      mdSize,
      sourceDir,
      sourceName,
      priority,
    });
  }

  return { sourceDir, sourceName, priority, entries };
}

function pickWinner(candidates) {
  return [...candidates].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.canvasCount !== b.canvasCount) return b.canvasCount - a.canvasCount;
    return b.mdSize - a.mdSize;
  })[0];
}

async function ensureCleanDir(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

async function linkOrCopyFile(from, to) {
  await mkdir(dirname(to), { recursive: true });
  try {
    await symlink(from, to);
  } catch {
    await cp(from, to);
  }
}

async function fetchChangeLog(opts) {
  if (opts.gitRepo) {
    const path = join(opts.gitRepo, opts.changelogPath);
    return { content: await readFile(path, 'utf8'), ref: opts.gitRepo };
  }

  if (!opts.gitUrl) return null;

  const tmpDir = join(ROOT, '.cache', 'bv-prd-reconcile', opts.project);
  await mkdir(tmpDir, { recursive: true });

  const repoDir = join(tmpDir, 'repo');
  const exists = await stat(repoDir).then(() => true).catch(() => false);

  if (!exists) {
    await execFileAsync('git', ['clone', '--depth', '1', '--branch', opts.gitBranch, opts.gitUrl, repoDir], {
      cwd: tmpDir,
    });
  } else {
    await execFileAsync('git', ['fetch', '--depth', '1', 'origin', opts.gitBranch], { cwd: repoDir });
    await execFileAsync('git', ['checkout', opts.gitBranch], { cwd: repoDir });
    await execFileAsync('git', ['pull', '--ff-only', 'origin', opts.gitBranch], { cwd: repoDir }).catch(() => {});
  }

  const path = join(repoDir, opts.changelogPath);
  return { content: await readFile(path, 'utf8'), ref: `${opts.gitUrl}@${opts.gitBranch}` };
}

function renderReport(manifest) {
  const lines = [
    `# PRD Reconcile Report — ${manifest.project}`,
    '',
    `生成时间：${manifest.generated_at}`,
    '',
    '## 汇总',
    '',
    `- 墨刀来源数：${manifest.sources.length}`,
    `- 去重后版本数：${manifest.versions.length}`,
    `- 重复版本（已覆盖）：${manifest.duplicates.length}`,
    `- ChangeLog 补充：${manifest.changelog_supplements.length}`,
    `- 仅在 ChangeLog、墨刀缺失：${manifest.missing_in_modao.length}`,
    `- 仅在墨刀、ChangeLog 缺失：${manifest.extra_in_modao.length}`,
    '',
  ];

  if (manifest.duplicates.length) {
    lines.push('## 重复版本（新版本覆盖旧版本）', '');
    for (const dup of manifest.duplicates) {
      lines.push(
        `- **${dup.semver}** → 保留 \`${dup.winner.sourceName}/${dup.winner.folderName}\`，` +
          `丢弃 ${dup.losers.map((l) => `\`${l.sourceName}/${l.folderName}\``).join('、')}`,
      );
    }
    lines.push('');
  }

  if (manifest.changelog_supplements.length) {
    lines.push('## ChangeLog 补充版本', '');
    for (const item of manifest.changelog_supplements) {
      lines.push(`- **${item.version}** ← Git ChangeLog`);
    }
    lines.push('');
  }

  if (manifest.missing_in_modao.length) {
    lines.push('## ChangeLog 有、墨刀 Archive 无（已补充或待确认）', '');
    for (const version of manifest.missing_in_modao) {
      lines.push(`- ${version}`);
    }
    lines.push('');
  }

  if (manifest.extra_in_modao.length) {
    lines.push('## 墨刀 Archive 有、ChangeLog 无（保留，可能未发版或 ChangeLog 未更新）', '');
    for (const version of manifest.extra_in_modao) {
      lines.push(`- ${version}`);
    }
    lines.push('');
  }

  lines.push('## Gate', '', '- [ ] 重复版本覆盖策略符合预期', '- [ ] ChangeLog 补充内容已人工扫一眼', '- [ ] 通过后进入 `@bv-spec-canonical`', '');
  return `${lines.join('\n')}`;
}

async function main() {
  const configArg = process.argv[2];
  const opts = configArg?.endsWith('.json')
    ? await loadConfig(resolve(ROOT, configArg))
    : parseArgs(process.argv.slice(2));

  const scanned = [];
  for (let i = 0; i < opts.sources.length; i += 1) {
    scanned.push(await scanSource(opts.sources[i], i, opts.excludes));
  }

  /** @type {Map<string, object[]>} */
  const bySemver = new Map();
  for (const source of scanned) {
    for (const entry of source.entries) {
      if (!inVersionRange(entry.semver, opts.minVersion, opts.maxVersion)) continue;
      const list = bySemver.get(entry.semver.key) || [];
      list.push(entry);
      bySemver.set(entry.semver.key, list);
    }
  }

  const winners = [];
  const duplicates = [];
  for (const [semverKey, candidates] of bySemver.entries()) {
    const winner = pickWinner(candidates);
    winners.push(winner);
    if (candidates.length > 1) {
      duplicates.push({
        semver: semverKey,
        winner,
        losers: candidates.filter((c) => c !== winner),
      });
    }
  }

  winners.sort((a, b) => compareSemver(a.semver, b.semver));

  let changelogEntries = [];
  let changelogRef = '';
  if (opts.gitUrl || opts.gitRepo) {
    const fetched = await fetchChangeLog(opts);
    if (fetched) {
      changelogRef = fetched.ref;
      changelogEntries = parseChangeLog(fetched.content).filter((entry) =>
        inVersionRange(entry.semver, opts.minVersion, opts.maxVersion),
      );
    }
  }

  const modaoSemvers = new Set(winners.map((w) => w.semver.key));
  const changelogSemvers = new Set(changelogEntries.map((e) => e.semver.key));

  const missingInModao = [...changelogSemvers].filter((key) => !modaoSemvers.has(key)).sort();
  const extraInModao = [...modaoSemvers].filter((key) => !changelogSemvers.has(key)).sort();

  const versionsDir = join(opts.output, 'versions');
  const supplementsDir = join(opts.output, 'changelog-supplements');
  await ensureCleanDir(opts.output);
  await mkdir(versionsDir, { recursive: true });
  await mkdir(supplementsDir, { recursive: true });

  const versionManifest = [];

  for (const winner of winners) {
    const targetName = `${winner.folderName}.md`;
    const targetPath = join(versionsDir, targetName);
    await linkOrCopyFile(winner.mdPath, targetPath);
    versionManifest.push({
      semver: winner.semver.key,
      folder_name: winner.folderName,
      source: winner.sourceName,
      origin_md: relative(ROOT, winner.mdPath),
      reconciled_md: relative(ROOT, targetPath),
      source_type: 'modao',
      canvas_count: winner.canvasCount,
    });
  }

  const changelogSupplements = [];
  for (const entry of changelogEntries) {
    if (modaoSemvers.has(entry.semver.key)) continue;

    const fileName = `${entry.version}.md`;
    const supplementPath = join(supplementsDir, fileName);
    const versionLinkPath = join(versionsDir, fileName);
    const md = formatChangeLogSupplementMd(entry, changelogRef);
    await writeFile(supplementPath, md, 'utf8');
    await linkOrCopyFile(supplementPath, versionLinkPath);

    changelogSupplements.push({
      semver: entry.semver.key,
      version: entry.version,
      items: entry.items,
      supplement_md: relative(ROOT, supplementPath),
      reconciled_md: relative(ROOT, versionLinkPath),
    });

    versionManifest.push({
      semver: entry.semver.key,
      folder_name: entry.version,
      source: changelogRef,
      origin_md: relative(ROOT, supplementPath),
      reconciled_md: relative(ROOT, versionLinkPath),
      source_type: 'changelog',
      canvas_count: 0,
    });
  }

  versionManifest.sort((a, b) => compareSemver(parseSemver(`v${a.semver}`), parseSemver(`v${b.semver}`)));

  const manifest = {
    schema: 'bv-prd-reconcile/v1',
    project: opts.project,
    generated_at: new Date().toISOString(),
    sources: scanned.map((s) => ({
      dir: relative(ROOT, s.sourceDir),
      name: s.sourceName,
      priority: s.priority,
      version_count: s.entries.length,
    })),
    git: {
      url: opts.gitUrl || null,
      repo: opts.gitRepo ? relative(ROOT, opts.gitRepo) : null,
      branch: opts.gitBranch,
      changelog_path: opts.changelogPath,
      ref: changelogRef || null,
    },
    excludes: opts.excludes,
    version_range: {
      min: opts.minVersion || null,
      max: opts.maxVersion || null,
    },
    duplicates: duplicates.map((dup) => ({
      semver: dup.semver,
      winner: {
        sourceName: dup.winner.sourceName,
        folderName: dup.winner.folderName,
        priority: dup.winner.priority,
      },
      losers: dup.losers.map((l) => ({
        sourceName: l.sourceName,
        folderName: l.folderName,
        priority: l.priority,
      })),
    })),
    versions: versionManifest,
    changelog_supplements: changelogSupplements,
    missing_in_modao: missingInModao.map((key) => `v${key}`),
    extra_in_modao: extraInModao.map((key) => `v${key}`),
  };

  await writeFile(join(opts.output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(join(opts.output, 'report.md'), renderReport(manifest), 'utf8');

  console.log(`Reconciled ${manifest.versions.length} versions → ${relative(ROOT, opts.output)}`);
  console.log(`  duplicates resolved: ${manifest.duplicates.length}`);
  console.log(`  changelog supplements: ${manifest.changelog_supplements.length}`);
  console.log(`  report: ${relative(ROOT, join(opts.output, 'report.md'))}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
