#!/usr/bin/env node
/**
 * Merge per-canvas exports into PRD Markdown files (one per urls_codex folder).
 *
 * Usage:
 *   node build_prd.mjs [urls_codex] [exports_root] [project_root] [--version NAME ...] [--base64]
 *
 * Default: relative image paths (preview in Cursor/browser). Use --base64 to embed.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatAnnotationBodyHtml, escapeHtml } from './annotation_text.mjs';
import { filterFolders, flattenCanvases, parseUrlsCodex } from './urls_codex_lib.mjs';

function parseArgs(argv) {
  const positional = [];
  const versionFilters = [];
  let useBase64 = false;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base64') {
      useBase64 = true;
    } else if (arg === '--version') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --version');
      versionFilters.push(next);
      i += 1;
    } else {
      positional.push(arg);
    }
  }

  const projectRoot = resolve(positional[2] || '.');
  return {
    urlsCodexPath: resolve(projectRoot, positional[0] || 'urls_codex'),
    exportsRoot: resolve(projectRoot, positional[1] || '.exports'),
    projectRoot,
    useBase64,
    versionFilters,
  };
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 按画布名匹配导出目录（如 03-设备搜索页面），与 urls_codex 顺序解耦 */
async function findCanvasExportDir(exportsRoot, folderName, canvasName) {
  const folderPath = join(exportsRoot, folderName);
  let entries;
  try {
    entries = await readdir(folderPath, { withFileTypes: true });
  } catch {
    throw new Error(`Missing export folder for version "${folderName}" at ${folderPath}`);
  }

  const pattern = new RegExp(`^\\d+-${escapeRegex(canvasName)}$`);
  const match = entries.find((entry) => entry.isDirectory() && pattern.test(entry.name));
  if (!match) {
    throw new Error(`Missing export for canvas "${canvasName}" under ${folderPath}`);
  }
  return join(folderPath, match.name);
}

async function imageSrc(imageAbsPath, mdDir, useBase64) {
  if (useBase64) {
    const buf = await readFile(imageAbsPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  }
  return relative(mdDir, imageAbsPath).replace(/\\/g, '/');
}

function formatBodyHtml(body) {
  return formatAnnotationBodyHtml(body);
}

function parseAnnotation({ text, author }, fallbackIndex) {
  const explicitAuthor = (author || '').trim();
  const raw = (text || '').replace(/\r/g, '').trim();
  if (!raw) return null;

  let number = String(fallbackIndex);
  let body = raw;
  let editor = explicitAuthor;

  const blocks = raw.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  if (blocks.length && /^\d+$/.test(blocks[0])) {
    number = blocks[0];
    body = blocks.slice(1).join('\n\n');
  }

  if (!editor && blocks.length >= 3 && /^\d+$/.test(blocks[0])) {
    const lastBlock = blocks[blocks.length - 1];
    if (!lastBlock.includes('\n') && lastBlock.length <= 40) {
      editor = lastBlock;
      body = blocks.slice(1, -1).join('\n\n');
    }
  }

  if (!editor && body) {
    const lines = body.split('\n');
    const lastLine = lines[lines.length - 1]?.trim() || '';
    if (
      lastLine &&
      lines.length > 1 &&
      !/^\d+[\.\)、]/.test(lastLine) &&
      !lastLine.startsWith('【') &&
      lastLine.length <= 20 &&
      !lastLine.includes('：') &&
      !/\s/.test(lastLine) &&
      /^[\u4e00-\u9fff·]{2,10}$/.test(lastLine)
    ) {
      editor = lastLine;
      body = lines.slice(0, -1).join('\n').trim();
    }
  }

  return { number, body, editor };
}

function layoutSectionTitle(page) {
  if (page.layoutKind === 'screenshot' || String(page.id || '').includes('-asset-')) {
    return '截图';
  }
  return '页面布局';
}

async function renderAnnotationContent(annotation, parsed, exportDir, projectRoot, useBase64) {
  if (annotation.inlineMode === 'replace' && annotation.inlineImage) {
    const src = await imageSrc(resolve(exportDir, annotation.inlineImage), projectRoot, useBase64);
    return `<img src="${src}" width="180" />`;
  }

  let body = parsed.body || '';
  const token = '__INLINE_IMG__';
  let tokenUsed = false;

  if (annotation.inlineImage && annotation.inlineMode === 'right-image') {
    body = body.replace(/（?\s*右图\s*）?/g, token);
    tokenUsed = true;
  }

  let html = body ? formatBodyHtml(body) : '';
  if (tokenUsed) {
    const src = await imageSrc(resolve(exportDir, annotation.inlineImage), projectRoot, useBase64);
    html = html.replaceAll(token, `<img src="${src}" width="180" />`);
  }

  if (annotation.embeddedImages?.length) {
    for (const imagePath of annotation.embeddedImages) {
      const src = await imageSrc(resolve(exportDir, imagePath), projectRoot, useBase64);
      html += `${html ? '<br>' : ''}<img src="${src}" width="180" />`;
    }
  }

  return html;
}

async function formatAnnotationLine(index, annotation, exportDir, projectRoot, useBase64) {
  const parsed = parseAnnotation(annotation, index);
  if (!parsed?.body && !parsed?.editor && !annotation.inlineImage && !annotation.embeddedImages?.length) return '';

  const content = await renderAnnotationContent(annotation, parsed, exportDir, projectRoot, useBase64);
  const editorPart = parsed.editor ? `，author(${escapeHtml(parsed.editor)})` : '';
  return `<div style="padding-left:2em"><span style="color:red">批注${escapeHtml(parsed.number)}</span>：${content}${editorPart}</div>`;
}

async function formatAnnotations(annotations, exportDir, projectRoot, useBase64) {
  if (!annotations?.length) return '';
  const lines = [];
  for (const [index, annotation] of annotations.entries()) {
    const line = await formatAnnotationLine(index + 1, annotation, exportDir, projectRoot, useBase64);
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

function sectionTitleForCanvasPage(canvas, page, pageCount, isSubCanvas) {
  if (isSubCanvas) {
    return pageCount === 1 ? canvas.name : `${canvas.name} — ${page.title}`;
  }
  return page.title;
}

async function appendManifestPages(lines, exportDir, projectRoot, useBase64, canvasNum, ctx, canvas, isSubCanvas) {
  const manifest = JSON.parse(await readFile(join(exportDir, 'manifest.json'), 'utf8'));

  for (const page of manifest.pages) {
    ctx.sectionIdx += 1;
    const section = `${canvasNum}.${ctx.sectionIdx}`;
    const title = sectionTitleForCanvasPage(canvas, page, manifest.pages.length, isSubCanvas);
    lines.push(`## ${section} ${title}`, '');
    if (page.image && page.layoutKind !== 'annotation-only') {
      lines.push(`### ${layoutSectionTitle(page)}`, '');
      try {
        const imageAbs = resolve(exportDir, page.image);
        const src = await imageSrc(imageAbs, projectRoot, useBase64);
        lines.push(`<img src="${src}" width="180" />`, '');
      } catch {
        lines.push('_(截图缺失)_', '');
      }
    }
    lines.push('### 说明', '');
    const note = await formatAnnotations(page.annotations, exportDir, projectRoot, useBase64);
    if (note) lines.push(note, '');
  }
}

async function renderCanvasTree(lines, folder, canvas, canvasNum, exportsRoot, projectRoot, useBase64, ctx) {
  const exportDir = await findCanvasExportDir(exportsRoot, folder.name, canvas.name);
  await appendManifestPages(
    lines,
    exportDir,
    projectRoot,
    useBase64,
    canvasNum,
    ctx,
    canvas,
    !ctx.isRoot,
  );

  for (const child of canvas.children || []) {
    const prevRoot = ctx.isRoot;
    ctx.isRoot = false;
    await renderCanvasTree(lines, folder, child, canvasNum, exportsRoot, projectRoot, useBase64, ctx);
    ctx.isRoot = prevRoot;
  }
}

async function buildFolderMd(folder, exportsRoot, projectRoot, useBase64) {
  if (!folder.canvases.length) {
    return `# ${folder.name}\n`;
  }

  const lines = [];

  for (const [ci, canvas] of folder.canvases.entries()) {
    lines.push(`# ${ci + 1} ${canvas.name}`, '');
    await renderCanvasTree(lines, folder, canvas, ci + 1, exportsRoot, projectRoot, useBase64, {
      isRoot: true,
      sectionIdx: 0,
    });
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

async function main() {
  const { urlsCodexPath, exportsRoot, projectRoot, useBase64, versionFilters } = parseArgs(process.argv);
  const content = await readFile(urlsCodexPath, 'utf8');
  const allFolders = parseUrlsCodex(content);
  const folders = filterFolders(allFolders, versionFilters);

  if (versionFilters.length && !folders.length) {
    throw new Error(
      `No folders matched --version ${versionFilters.join(', ')}. Available: ${allFolders.map((f) => f.name).join(' | ')}`,
    );
  }

  for (const folder of folders) {
    const md = await buildFolderMd(folder, exportsRoot, projectRoot, useBase64);
    const outFile = join(projectRoot, `${folder.name}.md`);
    await writeFile(outFile, md, 'utf8');
    console.log(
      `Wrote ${outFile} (${flattenCanvases(folder.canvases).length} canvases${folder.canvases.length ? '' : ', title-only'}, ${useBase64 ? 'base64' : 'relative'} images)`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
