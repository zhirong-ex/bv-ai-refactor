/**
 * Shared urls_codex parse / filter helpers.
 *
 * urls_codex nesting (indent = 4 spaces per level):
 *   v1.4.6 folder
 *       设备搜索页面: url
 *           点击Apple TV设备: url
 */

export function parseUrlsCodex(content) {
  const folders = [];
  let current = null;
  /** @type {{ list: object[] }[]} */
  const stack = [];

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;

    const trimmed = line.trim();
    const leading = line.length - line.trimStart().length;

    if (leading === 0) {
      current = { name: trimmed, canvases: [] };
      folders.push(current);
      stack.length = 0;
      stack.push({ list: current.canvases });
      continue;
    }

    if (leading % 4 !== 0 || !stack.length) continue;

    const m = trimmed.match(/^([^:]+):\s*(https?:\/\/.+)$/);
    if (!m) continue;

    const level = leading / 4;
    while (stack.length > level) stack.pop();

    const canvas = { name: m[1].trim(), url: m[2].trim(), children: [] };
    stack[stack.length - 1].list.push(canvas);
    stack.push({ list: canvas.children });
  }

  return folders;
}

/** Depth-first list of all canvases (parent then children) for export / counting */
export function flattenCanvases(canvases) {
  const out = [];
  for (const canvas of canvases || []) {
    out.push(canvas);
    if (canvas.children?.length) out.push(...flattenCanvases(canvas.children));
  }
  return out;
}

function appendCanvasLines(lines, canvas, indent) {
  lines.push(`${indent}${canvas.name}: ${canvas.url}`);
  for (const child of canvas.children || []) {
    appendCanvasLines(lines, child, `${indent}    `);
  }
}

export function formatUrlsCodex(folders) {
  const lines = [];
  for (const folder of folders) {
    lines.push(folder.name);
    for (const canvas of folder.canvases) {
      appendCanvasLines(lines, canvas, '    ');
    }
  }
  return `${lines.join('\n')}\n`;
}

export function matchVersion(folderName, versionFilter) {
  const folder = folderName.trim();
  const version = versionFilter.trim();
  if (!version) return true;
  if (folder === version) return true;
  return folder.startsWith(`${version} `);
}

export function filterFolders(folders, versionFilters) {
  if (!versionFilters?.length) return folders;
  return folders.filter((folder) =>
    versionFilters.some((version) => matchVersion(folder.name, version)),
  );
}

export function listFolderNames(folders) {
  return folders.map((folder) => folder.name);
}

function readVersionArgs(argv) {
  const versions = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--version' && argv[i + 1]) {
      versions.push(argv[i + 1]);
      i += 1;
    }
  }
  return versions;
}

import { pathToFileURL } from 'node:url';

async function cliMain() {
  const [command, filePath, ...rest] = process.argv.slice(2);
  if (!command || !filePath) {
    console.error(
      'Usage: node urls_codex_lib.mjs <list|filter|flatten-urls> <urls_codex> [--version NAME ...]',
    );
    process.exit(1);
  }

  const { readFile } = await import('node:fs/promises');
  const content = await readFile(filePath, 'utf8');
  const folders = parseUrlsCodex(content);
  const versionFilters = readVersionArgs(rest);

  if (command === 'list') {
    for (const name of listFolderNames(folders)) {
      console.log(name);
    }
    return;
  }

  if (command === 'filter') {
    const filtered = filterFolders(folders, versionFilters);
    if (versionFilters.length && !filtered.length) {
      console.error(`No folders matched version filter: ${versionFilters.join(', ')}`);
      console.error('Available folders:');
      for (const name of listFolderNames(folders)) {
        console.error(`  - ${name}`);
      }
      process.exit(1);
    }
    process.stdout.write(formatUrlsCodex(filtered));
    return;
  }

  if (command === 'flatten-urls') {
    const filtered = filterFolders(folders, versionFilters);
    for (const folder of filtered) {
      for (const canvas of flattenCanvases(folder.canvases)) {
        process.stdout.write(`${folder.name}\t${canvas.name}\t${canvas.url}\n`);
      }
    }
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cliMain().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
