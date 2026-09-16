#!/usr/bin/env node
/** Inspect Modao flpak structure for a canvas screen id. */
const sharingUrl =
  process.argv[2] ||
  'https://modao.cc/proto/k2a0Owfvsd3xbucI4UGL/sharing?view_mode=read_only&screen=rbpV9NHXDLngNGkE5';
const screenId = process.argv[3] || new URL(sharingUrl).searchParams.get('screen');

const tokenMatch = sharingUrl.match(/\/proto\/([^/]+)/);
if (!tokenMatch) throw new Error('bad url');
const token = tokenMatch[1];
const origin = new URL(sharingUrl).origin;

async function fetchJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

(async () => {
  const initial = await fetchJson(
    `${origin}/api/flat/web_v1/preview/initial?access_token=${token}&view_mode=read_only`,
  );
  const info = await fetchJson(
    `${origin}/api/flat/web_v1/proj2-preview-info?prj2Cid=${initial.project_basic.cid}&access_token=${token}&password=`,
  );
  const flatKey = info.flatKey;
  console.log('flatKey', flatKey, 'screenId', screenId);

  const p2meta = await fetchJson(`${origin}/flpak/ww-p2meta/${flatKey}`);
  const nodes = new Map();
  const children = new Map();
  for (const row of p2meta) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const [id, parentId, meta] = row;
    nodes.set(id, { id, parentId, meta });
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(id);
  }

  const bunchChild = (children.get(screenId) || [])[0];
  console.log('bunchChild', bunchChild, nodes.get(bunchChild)?.meta);

  const canvasIds = children.get(bunchChild) || [];
  console.log('canvas pages', canvasIds.map((id) => ({ id, meta: nodes.get(id)?.meta })));

  for (const canvasId of canvasIds.slice(0, 2)) {
    const endpoints = [
      `${origin}/flpak/ww-p2flat/${flatKey}/${canvasId}`,
      `${origin}/flpak/ww-p2res/${flatKey}/${canvasId}`,
      `${origin}/flpak/ww-p2wgt/${flatKey}/${canvasId}`,
    ];
    for (const url of endpoints) {
      try {
        const data = await fetchJson(url);
        const s = JSON.stringify(data);
        console.log('\n---', url);
        console.log('type', Array.isArray(data) ? `array[${data.length}]` : typeof data, 'len', s.length);
        console.log('sample', s.slice(0, 1200));
      } catch (e) {
        console.log(url, 'ERR', e.message);
      }
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
