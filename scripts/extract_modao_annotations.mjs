/**
 * Extract Modao canvas sticky-note text from a read_only sharing URL.
 * Must be called in browser context via page.evaluate — keep self-contained (no imports).
 */

export function extractCanvasStickiesFromDocument() {
  function parseMarginDepth(marginLeft) {
    const match = String(marginLeft || '').match(/([\d.]+)em/);
    if (!match) return 0;
    return Math.round(Number(match[1]));
  }

  function textWithoutDeleted(root) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll('del, s, strike, [style*="line-through"]').forEach((node) => node.remove());
    return (clone.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function extractStickyImagesFromElement(stickyEl) {
    const editor = stickyEl.querySelector('.public-DraftEditor-content, [class*="DraftCommonEditor"]');
    if (!editor) return [];

    const seen = new Set();
    const images = [];
    for (const img of editor.querySelectorAll('img')) {
      const rawSrc = img.currentSrc || img.src || img.getAttribute('src') || '';
      if (!rawSrc) continue;
      const imageUrl = rawSrc.startsWith('http') ? rawSrc : new URL(rawSrc, location.origin).href;
      if (seen.has(imageUrl)) continue;
      seen.add(imageUrl);
      images.push({ imageUrl });
    }
    return images;
  }

  function extractStickyTextFromElement(stickyEl) {
    const editor = stickyEl.querySelector('.public-DraftEditor-content, [class*="DraftCommonEditor"]');
    if (!editor) {
      return textWithoutDeleted(stickyEl);
    }

    const lines = [];
    const root = editor.querySelector('[data-content]') || editor;

    function appendListItem(li) {
      const markerDiv = li.querySelector(':scope > div[style*="margin-left"]');
      const depth = parseMarginDepth(markerDiv?.style?.marginLeft);
      const marker = (markerDiv?.textContent || '').trim();
      const contentDiv = markerDiv?.nextElementSibling;
      let content = '';
      if (contentDiv) {
        content = textWithoutDeleted(contentDiv);
      } else {
        const raw = textWithoutDeleted(li);
        content = marker ? raw.replace(new RegExp(`^${marker.replace('.', '\\.')}\\s*`), '').trim() : raw;
      }
      const text = content ? `${marker} ${content}`.trim() : marker;
      if (text) lines.push({ depth, text });
    }

    function walk(node) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName;

      if (tag === 'P') {
        if (node.closest('li')) return;
        const text = textWithoutDeleted(node);
        if (text && text !== '\u00a0') lines.push({ depth: 0, text });
        return;
      }

      if (tag === 'LI') {
        appendListItem(node);
        for (const nestedOl of node.querySelectorAll(':scope > ol')) {
          for (const nestedLi of nestedOl.querySelectorAll(':scope > li')) {
            walk(nestedLi);
          }
        }
        return;
      }

      for (const child of node.children) walk(child);
    }

    for (const child of root.children) walk(child);

    if (lines.length === 0) {
      return textWithoutDeleted(editor);
    }

    return lines
      .map(({ depth, text }) => (depth > 0 ? `\t${text}` : text))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const out = [];
  const seen = new Set();
  const canvas = document.querySelector('.tree-node.rResCanvas');
  const canvasRect = canvas?.getBoundingClientRect() ?? { x: 0, y: 0 };

  const push = (el) => {
    const rect = el.getBoundingClientRect();
    const text = extractStickyTextFromElement(el);
    if (!text || text.length < 2 || seen.has(text)) return;
    seen.add(text);
    const author =
      el.querySelector('.footer .username, .sticky-author, .author-name, [class*="author"], [class*="user-name"]')
        ?.textContent?.trim() || '';
    out.push({
      text,
      author,
      images: extractStickyImagesFromElement(el),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      canvasX: rect.x - canvasRect.x,
      canvasY: rect.y - canvasRect.y,
    });
  };

  for (const el of document.querySelectorAll('.wSticky')) {
    push(el);
  }

  return out.sort((a, b) => a.y - b.y);
}

function stickyCenter(sticky) {
  return {
    x: (sticky.x ?? sticky.canvasX ?? 0) + (sticky.width ?? 0) / 2,
    y: (sticky.y ?? sticky.canvasY ?? 0) + (sticky.height ?? 0) / 2,
  };
}

/** Prefer viewport rect (multi-canvas side-by-side); fall back to canvas-local bounds. */
function artboardBounds(ab) {
  if (ab?.rect?.width && ab?.rect?.height) return ab.rect;
  return ab?.canvasRect ?? null;
}

function assignStickyToArtboard(sticky, artboards) {
  const { x: sx, y: sy } = stickyCenter(sticky);
  let best = artboards[0];
  let bestDist = Infinity;
  let contained = null;

  for (const ab of artboards) {
    const r = artboardBounds(ab);
    if (!r?.width || !r?.height) continue;

    if (sx >= r.x && sx <= r.x + r.width && sy >= r.y && sy <= r.y + r.height) {
      contained = ab;
      break;
    }

    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const dist = Math.hypot(sx - cx, sy - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = ab;
    }
  }

  return contained || best;
}

export function mapStickiesToArtboards(stickies, artboards) {
  const map = new Map();
  if (!artboards.length) {
    map.set('__canvas__', stickies);
    return map;
  }

  for (const ab of artboards) {
    map.set(ab.id, []);
  }

  if (artboards.length === 1 && !artboards[0].splitFrame) {
    map.set(artboards[0].id, stickies);
    return map;
  }

  const canvasLevel = [];
  for (const sticky of stickies) {
    if (sticky.kind === 'canvas-spec') {
      canvasLevel.push(sticky);
      continue;
    }
    const target = assignStickyToArtboard(sticky, artboards);
    map.get(target.id).push(sticky);
  }

  if (canvasLevel.length) {
    map.get(artboards[0].id).push(...canvasLevel);
  }

  return map;
}

export async function extractCanvasAnnotationMap(page) {
  const stickies = await page.evaluate(extractCanvasStickiesFromDocument);
  const { extractVisibleArtboardsFromDocument } = await import('./modao_canvas_pages.mjs');
  const artboards = await page.evaluate(extractVisibleArtboardsFromDocument);
  const stickyMap = mapStickiesToArtboards(stickies, artboards);
  return { stickies, artboards, stickyMap };
}
