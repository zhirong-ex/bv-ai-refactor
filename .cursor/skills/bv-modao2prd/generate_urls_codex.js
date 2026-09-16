#!/usr/bin/env node
'use strict';

const fs = require('fs');

function usage() {
  console.log('Usage: node generate_urls_codex.js "<modao-sharing-url>" [output_dir]');
  console.log('  output_dir: 可选，默认 modao-output/<项目名>__<access_token>/');
  process.exit(1);
}

function sanitizeDirName(name) {
  return String(name || '未命名')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || '未命名';
}

function sanitizeCanvasName(name) {
  return String(name || '未命名画布')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '未命名画布';
}

const sharingUrl = process.argv[2];
const outputDirArg = process.argv[3];

if (!sharingUrl) usage();

let parsed;
try {
  parsed = new URL(sharingUrl);
} catch {
  console.error('Invalid URL:', sharingUrl);
  process.exit(1);
}

const designMatch = parsed.pathname.match(/^\/proto\/design\/([^/?#]+)/i);
const tokenMatch = parsed.pathname.match(/^\/proto\/([^/]+)\/sharing/i);
if (designMatch) {
  console.error('这是墨刀 design 编辑链接，不能用于 bv-modao2prd。');
  console.error('请在墨刀项目中：分享 → 开启分享 → 复制「分享链接」。');
  console.error('正确格式：https://modao.cc/proto/<access_token>/sharing?view_mode=read_only');
  console.error('project id:', designMatch[1]);
  process.exit(1);
}
if (!tokenMatch) {
  console.error('URL path must match: /proto/<access_token>/sharing');
  process.exit(1);
}

const accessToken = tokenMatch[1];
const origin = `${parsed.protocol}//${parsed.host}`;
const baseShareUrl = `${origin}/proto/${accessToken}/sharing?view_mode=read_only&screen=`;

async function fetchJson(url) {
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0'
    }
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} for ${url}`);
  }
  return await resp.json();
}

function ensureField(v, msg) {
  if (!v) throw new Error(msg);
  return v;
}

(async () => {
  try {
    const initialUrl = `${origin}/api/flat/web_v1/preview/initial?access_token=${encodeURIComponent(accessToken)}&view_mode=read_only`;
    const initial = await fetchJson(initialUrl);
    const projectCid = ensureField(initial?.project_basic?.cid, 'Missing project_basic.cid from preview/initial');

    const previewInfoUrl = `${origin}/api/flat/web_v1/proj2-preview-info?prj2Cid=${encodeURIComponent(projectCid)}&access_token=${encodeURIComponent(accessToken)}&password=`;
    const previewInfo = await fetchJson(previewInfoUrl);
    const flatKey = ensureField(previewInfo?.flatKey, 'Missing flatKey from proj2-preview-info');

    const p2metaUrl = `${origin}/flpak/ww-p2meta/${encodeURIComponent(flatKey)}`;
    const p2meta = await fetchJson(p2metaUrl);
    if (!Array.isArray(p2meta)) {
      throw new Error('Unexpected ww-p2meta payload (not array)');
    }

    const nodes = new Map();
    const children = new Map();
    const insertOrder = new Map();
    let insertIdx = 0;

    for (const row of p2meta) {
      if (!Array.isArray(row) || row.length < 3) continue;
      const [id, parentId, meta] = row;
      nodes.set(id, { id, parentId, meta });
      insertOrder.set(id, insertIdx++);
      if (!children.has(parentId)) children.set(parentId, []);
      children.get(parentId).push(id);
    }

    function readZIndex(nodeId) {
      const z = nodes.get(nodeId)?.meta?.zIndex;
      if (typeof z === 'number' && Number.isFinite(z)) return z;
      if (typeof z === 'string' && z.trim() !== '' && Number.isFinite(Number(z))) {
        return Number(z);
      }
      return null;
    }

    function getSortedChildIds(parentId) {
      return (children.get(parentId) || []).slice().sort((a, b) => {
        const za = readZIndex(a);
        const zb = readZIndex(b);
        if (za !== null && zb !== null && za !== zb) return za - zb;
        if (za !== null && zb === null) return -1;
        if (za === null && zb !== null) return 1;
        return (insertOrder.get(a) ?? 0) - (insertOrder.get(b) ?? 0);
      });
    }

    function isResBunch(n) {
      return n && n.meta && n.meta.type === 'rResBunch';
    }

    function hasNestedResBunch(nodeId) {
      return (children.get(nodeId) || []).some(cid => isResBunch(nodes.get(cid)));
    }

    function collectCanvasTree(folderId, visited = new Set()) {
      if (visited.has(folderId)) return [];
      visited.add(folderId);
      const out = [];

      for (const cid of getSortedChildIds(folderId)) {
        const n = nodes.get(cid);
        if (!isResBunch(n)) continue;

        if (n.meta.asFolder === true) {
          out.push(...collectCanvasTree(cid, visited));
          continue;
        }

        const entry = {
          name: sanitizeCanvasName(n.meta.name),
          id: cid,
          children: [],
        };

        if (hasNestedResBunch(cid)) {
          for (const subId of getSortedChildIds(cid)) {
            const sub = nodes.get(subId);
            if (!isResBunch(sub)) continue;
            if (sub.meta.asFolder === true || hasNestedResBunch(subId)) {
              const nested = collectCanvasTree(subId, visited);
              entry.children.push(...nested);
            } else {
              entry.children.push({
                name: sanitizeCanvasName(sub.meta.name),
                id: subId,
                children: [],
              });
            }
          }
        }

        out.push(entry);
      }

      return out;
    }

    function appendCanvasTree(lines, canvas, seen, indent) {
      const key = `${canvas.name}@@${canvas.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      lines.push(`${indent}${canvas.name}: ${baseShareUrl}${canvas.id}`);
      for (const child of canvas.children || []) {
        appendCanvasTree(lines, child, seen, `${indent}    `);
      }
    }

    function appendFolderSection(lines, folderName, canvases, { includeIfEmpty = false } = {}) {
      if (!canvases.length && !includeIfEmpty) return;
      lines.push(folderName);
      if (!canvases.length) return;
      const seen = new Set();
      for (const canvas of canvases) {
        appendCanvasTree(lines, canvas, seen, '    ');
      }
    }

    const topFolders = [];
    const rootLeafCanvases = [];

    for (const cid of getSortedChildIds('B@main')) {
      const n = nodes.get(cid);
      if (!isResBunch(n)) continue;
      if (n.meta.asFolder === true) {
        topFolders.push(n);
      } else if (hasNestedResBunch(cid)) {
        topFolders.push(n);
      } else {
        rootLeafCanvases.push({ name: sanitizeCanvasName(n.meta.name), id: cid });
      }
    }

    const projectName = initial?.project_basic?.name || '根目录';
    const outputDir = outputDirArg || `modao-output/${sanitizeDirName(projectName)}__${accessToken}`;
    fs.mkdirSync(outputDir, { recursive: true });

    const urlsCodexPath = `${outputDir}/urls_codex`;
    const sharingUrlPath = `${outputDir}/sharing_url.txt`;

    const lines = [];
    appendFolderSection(lines, projectName, rootLeafCanvases);

    for (const folder of topFolders) {
      const folderName = folder.meta.name || '未命名文件夹';
      appendFolderSection(lines, folderName, collectCanvasTree(folder.id, new Set()), {
        includeIfEmpty: true,
      });
    }

    fs.writeFileSync(urlsCodexPath, lines.join('\n') + '\n', 'utf8');
    fs.writeFileSync(sharingUrlPath, sharingUrl.trim() + '\n', 'utf8');
    console.log(`Generated ${urlsCodexPath}`);
    console.log(`Wrote ${sharingUrlPath}`);
    console.log(`top_folders: ${topFolders.length}`);
    console.log(`OUTPUT_DIR=${outputDir}`);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();
