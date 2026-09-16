/**
 * Discover canvas-internal pages (rResCanvas) via p2meta + DOM, and capture in read_only design view.
 */

import {
  loadPrototypePage,
} from '/Users/lizhirong/tools/modao-prototype-mcp/dist/image-capture.js';
import { writeFile } from 'node:fs/promises';

const DEFAULT_ORIGIN = 'https://modao.cc';
const DIAGRAM_IMAGE_SELECTOR = '.tree-node.rResCanvas .widget.tree-node.wImage';

/** Phone mockup bounds inside a single rResCanvas tab (side-by-side frames). */
export const PHONE_FRAME_BOUNDS = {
  minW: 280,
  maxW: 520,
  minH: 600,
  maxH: 980,
  minAspect: 1.45,
};

export function isPhoneLikeFrameRect(width, height) {
  return width >= PHONE_FRAME_BOUNDS.minW
    && width <= PHONE_FRAME_BOUNDS.maxW
    && height >= PHONE_FRAME_BOUNDS.minH
    && height <= PHONE_FRAME_BOUNDS.maxH
    && height / width >= PHONE_FRAME_BOUNDS.minAspect;
}

/** Drop wRect / duplicate shells that share the same center (within tolerance px). */
export function dedupePhoneFrameCandidates(candidates, tolerance = 40) {
  const sorted = [...candidates].sort(
    (a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height),
  );
  const deduped = [];
  for (const candidate of sorted) {
    const cx = candidate.rect.x + candidate.rect.width / 2;
    const cy = candidate.rect.y + candidate.rect.height / 2;
    const overlaps = deduped.some((kept) => {
      const kcx = kept.rect.x + kept.rect.width / 2;
      const kcy = kept.rect.y + kept.rect.height / 2;
      return Math.abs(kcx - cx) < tolerance && Math.abs(kcy - cy) < tolerance;
    });
    if (!overlaps) deduped.push(candidate);
  }
  return deduped.sort((a, b) => a.rect.x - b.rect.x || a.rect.y - b.rect.y);
}

/**
 * Detect phone mockups (wImage) and expand each into a diagram group bounds
 * that includes overlapping UI layers (wRect modal shells, wRichText labels).
 */
export function extractDiagramRegionsFromCanvasIndex(canvasIndex = 0) {
  const canvas = document.querySelectorAll('.tree-node.rResCanvas')[canvasIndex]
    || document.querySelector('.tree-node.rResCanvas');
  if (!canvas) return [];

  const canvasRect = canvas.getBoundingClientRect();
  const MIN_W = 280;
  const MAX_W = 520;
  const MIN_H = 600;
  const MAX_H = 980;
  const MIN_ASPECT = 1.45;
  const DEDUPE_TOL = 40;

  function isPhoneLike(width, height) {
    return width >= MIN_W && width <= MAX_W
      && height >= MIN_H && height <= MAX_H
      && height / width >= MIN_ASPECT;
  }

  function toCanvasRect(rect) {
    return {
      x: Math.round(rect.x - canvasRect.x),
      y: Math.round(rect.y - canvasRect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  function unionRect(a, b) {
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.width, b.x + b.width);
    const y2 = Math.max(a.y + a.height, b.y + b.height);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  function rectsOverlap(a, b, padding = 24) {
    return a.x - padding < b.x + b.width
      && a.x + a.width + padding > b.x
      && a.y - padding < b.y + b.height
      && a.y + a.height + padding > b.y;
  }

  const candidates = [];
  canvas.querySelectorAll('.widget.tree-node.wImage').forEach((element, elementIndex) => {
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (!isPhoneLike(width, height)) return;
    candidates.push({
      elementIndex,
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width, height },
      canvasRect: toCanvasRect(rect),
    });
  });

  const sorted = candidates.slice().sort(
    (a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height),
  );
  const deduped = [];
  for (const candidate of sorted) {
    const cx = candidate.canvasRect.x + candidate.canvasRect.width / 2;
    const cy = candidate.canvasRect.y + candidate.canvasRect.height / 2;
    const overlaps = deduped.some((kept) => {
      const kcx = kept.canvasRect.x + kept.canvasRect.width / 2;
      const kcy = kept.canvasRect.y + kept.canvasRect.height / 2;
      return Math.abs(kcx - cx) < DEDUPE_TOL && Math.abs(kcy - cy) < DEDUPE_TOL;
    });
    if (!overlaps) deduped.push(candidate);
  }

  const overlaySelectors = '.widget.tree-node.wRect, .widget.tree-node.wRichText, .widget.tree-node.wWrap';
  for (const group of deduped) {
    let bounds = { ...group.canvasRect };
    for (const el of canvas.querySelectorAll(overlaySelectors)) {
      const layer = toCanvasRect(el.getBoundingClientRect());
      if (layer.width < 8 || layer.height < 8) continue;
      if (rectsOverlap(bounds, layer)) {
        bounds = unionRect(bounds, layer);
      }
    }
    group.canvasRect = bounds;
    group.rect = {
      x: Math.round(canvasRect.x + bounds.x),
      y: Math.round(canvasRect.y + bounds.y),
      width: bounds.width,
      height: bounds.height,
    };
  }

  return deduped.sort(
    (a, b) => a.canvasRect.x - b.canvasRect.x || a.canvasRect.y - b.canvasRect.y,
  );
}

/** @deprecated evaluate extractDiagramRegionsFromCanvasIndex(0) in browser context */
export function extractDiagramRegionsFromDocument() {
  return extractDiagramRegionsFromCanvasIndex(0);
}

/**
 * Phone wImage pasted outside rResCanvas (group-list overlay in side-by-side layouts).
 * Must run in browser context via page.evaluate.
 */
export function extractOrphanPhoneImagesFromDocument() {
  const MIN_W = 280;
  const MAX_W = 520;
  const MIN_H = 600;
  const MAX_H = 980;
  const MIN_ASPECT = 1.45;

  function isPhoneLike(width, height) {
    return width >= MIN_W && width <= MAX_W
      && height >= MIN_H && height <= MAX_H
      && height / width >= MIN_ASPECT;
  }

  const results = [];
  document.querySelectorAll('.widget.tree-node.wImage').forEach((element, elementIndex) => {
    if (element.closest('.tree-node.rResCanvas')) return;
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (!isPhoneLike(width, height)) return;
    const rawSrc = element.querySelector('img')?.currentSrc
      || element.querySelector('img')?.src
      || '';
    const imageUrl = rawSrc
      ? (rawSrc.startsWith('http') ? rawSrc : new URL(rawSrc, location.origin).href)
      : '';
    results.push({
      elementIndex,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width,
        height,
      },
      imageUrl,
    });
  });
  return results.sort((a, b) => a.rect.x - b.rect.x || a.rect.y - b.rect.y);
}

/** Pair an orphan phone frame with the nearest artboard (viewport coords). */
export function matchOrphanPhoneToArtboard(orphanImages, artboard, usedElementIndices = new Set()) {
  if (!artboard?.rect?.width || !orphanImages?.length) return null;

  const acx = artboard.rect.x + artboard.rect.width / 2;
  const acy = artboard.rect.y + artboard.rect.height / 2;
  let best = null;
  let bestDist = Infinity;

  for (const image of orphanImages) {
    if (usedElementIndices.has(image.elementIndex)) continue;
    const cx = image.rect.x + image.rect.width / 2;
    const cy = image.rect.y + image.rect.height / 2;
    const dist = Math.hypot(cx - acx, cy - acy);
    if (dist < bestDist) {
      bestDist = dist;
      best = image;
    }
  }

  const maxDist = Math.max(artboard.rect.width, artboard.rect.height);
  return best && bestDist <= maxDist ? best : null;
}

/** Node/test helper: diagram regions scoped to a canvas element. */
export function extractDiagramRegionsFromCanvasElement(canvas) {
  if (!canvas) return [];
  const canvases = Array.from(canvas.ownerDocument?.querySelectorAll('.tree-node.rResCanvas') || []);
  const canvasIndex = Math.max(0, canvases.indexOf(canvas));
  return extractDiagramRegionsFromCanvasIndex(canvasIndex);
}

export function countLayoutCanvasElementsFromDocument() {
  return document.querySelectorAll('.tree-node.rResCanvas').length;
}

/**
 * Pair each visible rResCanvas with its nearest canvas_title_* label (side-by-side pages).
 */
export function extractLayoutCanvasArtboardsFromDocument() {
  const canvases = Array.from(document.querySelectorAll('.tree-node.rResCanvas'));
  if (canvases.length === 0) return [];

  const titleMetas = Array.from(document.querySelectorAll('[class*="canvas_title_"]'))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const id = String(element.className).match(/canvas_title_([A-Za-z0-9_-]+)/)?.[1] ?? null;
      return {
        id,
        title: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim(),
        centerX: rect.x + rect.width / 2,
      };
    })
    .filter(({ id, title }) => id && title);

  return canvases
    .map((element, canvasIndex) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      let matched = titleMetas[0] ?? null;
      let bestDist = Infinity;
      for (const meta of titleMetas) {
        const dist = Math.abs(meta.centerX - centerX);
        if (dist < bestDist) {
          bestDist = dist;
          matched = meta;
        }
      }
      return {
        id: matched?.id || `canvas-${canvasIndex + 1}`,
        title: matched?.title || `页面 ${canvasIndex + 1}`,
        canvasIndex,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
        },
      };
    })
    .sort((a, b) => a.rect.x - b.rect.x);
}

export function mergeLayoutCanvasArtboards(p2metaPages, layoutArtboards) {
  if (!layoutArtboards?.length) return [];
  const byId = new Map(layoutArtboards.map((item) => [item.id, item]));

  if (p2metaPages.length > 0) {
    return p2metaPages.map((page, index) => {
      const layout = byId.get(page.id) || layoutArtboards[index];
      return {
        id: page.id,
        title: page.title || layout?.title || `页面 ${index + 1}`,
        rect: layout?.rect ?? null,
        canvasIndex: layout?.canvasIndex ?? index,
        tabIndex: index,
        multiCanvasLayout: true,
      };
    });
  }

  return layoutArtboards.map((item, index) => ({
    ...item,
    tabIndex: index,
    multiCanvasLayout: true,
  }));
}

export function shouldUseMultiCanvasLayout(p2metaPageCount, layoutCanvasCount) {
  return p2metaPageCount > 1 && layoutCanvasCount > 1;
}

/**
 * Non-phone wImage assets pasted on canvas (crash screenshots, comparison tables, etc.).
 * Returns original CDN URLs for direct download instead of artboard screenshots.
 */
/** Canvas-pasted images must exceed this height to count as page layout (skip badges/thin strips). */
export const MIN_LAYOUT_CONTENT_IMAGE_HEIGHT = 100;

export function isLayoutContentImage(image) {
  const height = Math.max(
    image?.height ?? image?.rect?.height ?? 0,
    image?.naturalHeight ?? 0,
  );
  const width = Math.max(
    image?.width ?? image?.rect?.width ?? 0,
    image?.naturalWidth ?? 0,
  );
  return height >= MIN_LAYOUT_CONTENT_IMAGE_HEIGHT && width >= 80;
}

export function filterLayoutContentImages(contentImages) {
  return (contentImages || []).filter(isLayoutContentImage);
}

export function extractContentImagesFromDocument() {
  const canvas = document.querySelector('.tree-node.rResCanvas');
  if (!canvas) return [];

  const MIN_W = 280;
  const MAX_W = 520;
  const MIN_H = 600;
  const MAX_H = 980;
  const MIN_ASPECT = 1.45;

  function isPhoneLike(width, height) {
    return width >= MIN_W && width <= MAX_W
      && height >= MIN_H && height <= MAX_H
      && height / width >= MIN_ASPECT;
  }

  const seen = new Set();
  const results = [];

  canvas.querySelectorAll('.widget.tree-node.wImage').forEach((element, elementIndex) => {
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width < 40 || height < 40) return;
    if (isPhoneLike(width, height)) return;

    const img = element.querySelector('img');
    const rawSrc = img?.currentSrc || img?.src || img?.getAttribute('src') || '';
    if (!rawSrc) return;

    const naturalWidth = Math.round(img?.naturalWidth || 0);
    const naturalHeight = Math.round(img?.naturalHeight || 0);

    const imageUrl = rawSrc.startsWith('http') ? rawSrc : new URL(rawSrc, location.origin).href;
    if (seen.has(imageUrl)) return;
    seen.add(imageUrl);

    results.push({
      elementIndex,
      width,
      height,
      naturalWidth,
      naturalHeight,
      imageUrl,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width,
        height,
      },
    });
  });

  return results.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}

/** @deprecated use extractDiagramRegionsFromDocument */
export function extractPhoneFramesFromDocument() {
  return extractDiagramRegionsFromDocument().map(({ elementIndex, rect }) => ({
    elementIndex,
    rect,
  }));
}

export function extractCanvasPageTabsFromDocument() {
  return Array.from(document.querySelectorAll('#mb-enabled-canvas-list .rn-content-item'))
    .map((element, index) => ({
      index,
      title: element.querySelector('.editable-name')?.innerText?.replace(/\s+/g, ' ').trim()
        || `页面 ${index + 1}`,
    }));
}

/** All visible rResCanvas pages on the current design canvas (not device simulator). */
export function extractVisibleArtboardsFromDocument() {
  const titleMetas = Array.from(document.querySelectorAll('[class*="canvas_title_"], .canvas-title'))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const className = String(element.className);
      return {
        id: className.match(/canvas_title_([A-Za-z0-9_-]+)/)?.[1] ?? null,
        title: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim(),
        rect,
      };
    })
    .filter(({ title, rect }) => title.length > 0 && rect.width > 0 && rect.height > 0)
    .sort((a, b) => Math.round(a.rect.y) - Math.round(b.rect.y) || Math.round(a.rect.x) - Math.round(b.rect.x));

  const artboardElements = Array.from(document.querySelectorAll('.tree-node.rResCanvas'))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const titleClass = Array.from(element.querySelectorAll('[class*="canvas_title_"]'))
        .map((el) => String(el.className).match(/canvas_title_([A-Za-z0-9_-]+)/)?.[1])
        .find(Boolean);
      const titleEl = element.querySelector('.canvas-title, [class*="canvas_title"]');
      const title = (titleEl?.innerText || titleEl?.textContent || '').replace(/\s+/g, ' ').trim();
      return { element, rect, style, id: element.id || titleClass || '', title };
    })
    .filter(({ rect, style }) => rect.width >= 80 && rect.height >= 80
      && style.display !== 'none' && style.visibility !== 'hidden')
    .sort((a, b) => Math.round(a.rect.y) - Math.round(b.rect.y) || Math.round(a.rect.x) - Math.round(b.rect.x));

  if (artboardElements.length === 0 && titleMetas.length > 0) {
    return titleMetas.map((meta, index) => ({
      id: meta.id || `artboard-${index + 1}`,
      title: meta.title || `页面 ${index + 1}`,
      rect: {
        x: Math.max(0, Math.round(meta.rect.x)),
        y: Math.max(0, Math.round(meta.rect.y)),
        width: Math.max(1, Math.round(meta.rect.width)),
        height: Math.max(1, Math.round(meta.rect.height)),
      },
    }));
  }

  return artboardElements.map(({ id, title, rect }, index) => {
    const meta = titleMetas[index];
    return {
      id: id || meta?.id || `artboard-${index + 1}`,
      title: title || meta?.title || `页面 ${index + 1}`,
      rect: {
        x: Math.max(0, Math.round(rect.x)),
        y: Math.max(0, Math.round(rect.y)),
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      },
    };
  });
}

export async function fetchCanvasPagesFromP2meta(sharingUrl) {
  const parsed = new URL(sharingUrl);
  const tokenMatch = parsed.pathname.match(/^\/proto\/([^/]+)\/sharing/i);
  if (!tokenMatch) return [];

  const accessToken = tokenMatch[1];
  const origin = `${parsed.protocol}//${parsed.host}`;
  const screenId = parsed.searchParams.get('screen');
  if (!screenId) return [];

  const initial = await fetchJson(
    `${origin}/api/flat/web_v1/preview/initial?access_token=${encodeURIComponent(accessToken)}&view_mode=read_only`,
  );
  const projectCid = initial?.project_basic?.cid;
  if (!projectCid) return [];

  const previewInfo = await fetchJson(
    `${origin}/api/flat/web_v1/proj2-preview-info?prj2Cid=${encodeURIComponent(projectCid)}&access_token=${encodeURIComponent(accessToken)}&password=`,
  );
  const flatKey = previewInfo?.flatKey;
  if (!flatKey) return [];

  const p2meta = await fetchJson(`${origin}/flpak/ww-p2meta/${encodeURIComponent(flatKey)}`);
  if (!Array.isArray(p2meta)) return [];

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
    return null;
  }

  function sortedChildIds(parentId) {
    return (children.get(parentId) || []).slice().sort((a, b) => {
      const za = readZIndex(a);
      const zb = readZIndex(b);
      if (za !== null && zb !== null && za !== zb) return za - zb;
      return (insertOrder.get(a) ?? 0) - (insertOrder.get(b) ?? 0);
    });
  }

  const pages = [];
  for (const cid of sortedChildIds(screenId)) {
    const node = nodes.get(cid);
    if (node?.meta?.type === 'rResCanvas') {
      pages.push({
        id: cid,
        title: node.meta.name || '未命名页面',
        order: node.meta.order ?? readZIndex(cid) ?? pages.length + 1,
      });
    }
  }

  return pages;
}

async function fetchJson(url) {
  const resp = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json,text/plain,*/*', 'user-agent': 'Mozilla/5.0' },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.json();
}

export function mergeArtboardLists(p2metaPages, domArtboards, tabTitles) {
  if (p2metaPages.length > 0) {
    return p2metaPages.map((page, index) => {
      const domMatch = domArtboards.find((item) => item.id === page.id)
        || domArtboards[index]
        || null;
      return {
        id: page.id,
        title: page.title || tabTitles[index] || domMatch?.title || `页面 ${index + 1}`,
        rect: domMatch?.rect ?? null,
        tabIndex: index,
      };
    });
  }

  if (domArtboards.length > 0) {
    return domArtboards.map((item, index) => ({
      ...item,
      title: item.title || tabTitles[index] || `页面 ${index + 1}`,
      tabIndex: index,
    }));
  }

  return tabTitles.map((title, index) => ({
    id: `artboard-${index + 1}`,
    title,
    rect: null,
    tabIndex: index,
  }));
}

export async function fitDesignCanvasView(page) {
  const candidates = [
    page.getByText('适应', { exact: true }),
    page.locator('[title*="适应"]'),
    page.locator('[aria-label*="适应"]'),
    page.locator('[class*="fit" i]'),
  ];
  for (const locator of candidates) {
    if (!locator.first) continue;
    const count = await locator.count().catch(() => 0);
    if (count > 0) {
      await locator.first().click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(900);
      return;
    }
  }
  await page.keyboard.press('Meta+0').catch(() => undefined);
  await page.waitForTimeout(500);
}

export async function selectCanvasPageTab(page, tabIndex) {
  if (tabIndex <= 0) return;
  const item = page.locator('#mb-enabled-canvas-list .rn-content-item').nth(tabIndex);
  const count = await item.count().catch(() => 0);
  if (count === 0) return;
  await item.click({ timeout: 8000 });
  await page.waitForTimeout(900);
}

export async function screenshotDesignArtboard(page, artboard, imagePath) {
  await hideAnnotationWidgets(page);

  const selectors = [];
  if (artboard.id && !/^artboard-\d+$/.test(artboard.id)) {
    selectors.push(`[class*="canvas_title_${artboard.id}"]`);
    selectors.push(`#${artboard.id}`);
  }
  selectors.push('.tree-node.rResCanvas');

  for (const selector of selectors) {
    const target = page.locator(selector).first();
    const count = await target.count().catch(() => 0);
    if (count === 0) continue;
    const box = await target.boundingBox().catch(() => null);
    if (!box || box.width < 80 || box.height < 80) continue;
    try {
      await target.screenshot({ path: imagePath });
      return;
    } catch {
      // try next selector
    }
  }

  if (artboard.rect?.width && artboard.rect?.height) {
    await page.screenshot({ path: imagePath, clip: artboard.rect });
    return;
  }

  const artboardRoot = page.locator('#mb-artboard').first();
  if (await artboardRoot.count() > 0) {
    await artboardRoot.screenshot({ path: imagePath });
    return;
  }

  await page.screenshot({ path: imagePath, fullPage: true });
}

export function buildReadOnlyPageUrl(sourceUrl, canvasPageId) {
  const url = new URL(sourceUrl);
  url.searchParams.set('view_mode', 'read_only');
  if (canvasPageId && !/^artboard-\d+$/.test(canvasPageId)) {
    url.searchParams.set('canvasId', canvasPageId);
  }
  return url.toString();
}

export function buildDeviceModePageUrl(sourceUrl, canvasPageId) {
  const url = new URL(sourceUrl);
  url.searchParams.set('view_mode', 'device');
  if (canvasPageId && !/^artboard-\d+$/.test(canvasPageId)) {
    url.searchParams.set('canvasId', canvasPageId);
  }
  return url.toString();
}

/** Hide yellow sticky annotations; keep UI layers (wRect/wRichText) inside diagram groups. */
export async function hideAnnotationWidgets(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.wSticky')) {
      el.style.setProperty('visibility', 'hidden', 'important');
    }
  });
}

/** Pan canvas so a diagram group (canvas-local rect) is centered in the viewport. */
export async function panToCenterDiagramGroup(page, canvasRect, canvasIndex = 0) {
  return page.evaluate(({ target, canvasIndex: index }) => {
    let panEl = document.querySelector('.zoom-area');
    if (!panEl) return { ok: false, reason: 'pan container not found' };

    const canvas = document.querySelectorAll('.tree-node.rResCanvas')[index]
      || document.querySelector('.tree-node.rResCanvas');
    if (!canvas) return { ok: false, reason: 'canvas not found' };

    const cr = canvas.getBoundingClientRect();
    const centerX = cr.x + target.x + target.width / 2;
    const centerY = cr.y + target.y + target.height / 2;
    const dx = window.innerWidth / 2 - centerX;
    const dy = window.innerHeight / 2 - centerY;
    const matrix = new DOMMatrix(getComputedStyle(panEl).transform);
    panEl.style.transform = `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e + dx}, ${matrix.f + dy})`;
    return { ok: true };
  }, { target: canvasRect, canvasIndex });
}

/** Capture one diagram group: pan into view, clip-screenshot the full group bounds. */
export async function captureDiagramRegionScreenshot(page, region, imagePath, canvasIndex = 0) {
  await fitDesignCanvasView(page);
  await hideAnnotationWidgets(page);

  const pan = await panToCenterDiagramGroup(page, region.canvasRect, canvasIndex);
  if (!pan.ok) {
    throw new Error(`Failed to pan diagram group: ${pan.reason}`);
  }
  await page.waitForTimeout(200);

  const clip = await page.evaluate(({ target, canvasIndex: index }) => {
    const canvas = document.querySelectorAll('.tree-node.rResCanvas')[index]
      || document.querySelector('.tree-node.rResCanvas');
    const cr = canvas.getBoundingClientRect();
    return {
      x: cr.x + target.x,
      y: cr.y + target.y,
      width: target.width,
      height: target.height,
    };
  }, { target: region.canvasRect, canvasIndex });

  if (clip.width < 80 || clip.height < 80) {
    throw new Error('Diagram group clip has invalid bounds');
  }

  await page.screenshot({ path: imagePath, clip });
}

export async function screenshotLayoutCanvasElement(page, artboard, imagePath, canvasIndex = 0) {
  await hideAnnotationWidgets(page);
  const canvas = page.locator('.tree-node.rResCanvas').nth(canvasIndex);
  const count = await canvas.count().catch(() => 0);
  if (count > 0) {
    const box = await canvas.boundingBox().catch(() => null);
    if (box && box.width >= 80 && box.height >= 80) {
      await canvas.screenshot({ path: imagePath });
      return;
    }
  }
  if (artboard.rect?.width && artboard.rect?.height) {
    await page.screenshot({ path: imagePath, clip: artboard.rect });
  }
}

/**
 * When a tab contains >= 1 diagram region, expand into per-diagram export targets.
 * Otherwise return a single target (whole-tab capture).
 */
export function expandArtboardWithDiagramRegions(tabArtboard, diagramRegions) {
  if (!diagramRegions || diagramRegions.length === 0) {
    return [{ ...tabArtboard, splitFrame: false }];
  }

  return diagramRegions.map((region, index) => ({
    id: `${tabArtboard.id}-diagram-${index + 1}`,
    title: diagramRegions.length > 1
      ? `${tabArtboard.title} — ${index + 1}`
      : tabArtboard.title,
    rect: region.rect,
    canvasRect: region.canvasRect,
    tabIndex: tabArtboard.tabIndex,
    parentId: tabArtboard.id,
    splitFrame: true,
    diagramIndex: index,
    elementIndex: region.elementIndex,
  }));
}

/** @deprecated use expandArtboardWithDiagramRegions */
export function expandArtboardWithPhoneFrames(tabArtboard, phoneFrames) {
  const regions = (phoneFrames || []).map((frame) => ({
    ...frame,
    canvasRect: frame.canvasRect || frame.rect,
  }));
  return expandArtboardWithDiagramRegions(tabArtboard, regions);
}

/** Expand non-phone pasted images into per-asset export targets. */
export function expandArtboardWithContentImages(tabArtboard, contentImages) {
  if (!contentImages?.length) {
    return [{ ...tabArtboard, splitFrame: false }];
  }

  return contentImages.map((image, index) => ({
    id: `${tabArtboard.id}-asset-${index + 1}`,
    title: contentImages.length > 1
      ? `${tabArtboard.title} — ${index + 1}`
      : tabArtboard.title,
    tabIndex: tabArtboard.tabIndex,
    parentId: tabArtboard.id,
    splitFrame: false,
    contentImage: image,
    assetIndex: index,
    elementIndex: image.elementIndex,
  }));
}

export async function downloadModaoImageAsset(imageUrl, imagePath) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image ${imageUrl}: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(imagePath, buffer);
}
