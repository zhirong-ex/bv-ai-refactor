import { join, basename } from 'node:path';
import { downloadModaoImageAsset } from './modao_canvas_pages.mjs';

const FIGURE_LABEL = /^图\s*(\d+)\s*$/;
const RIGHT_IMAGE = /（?\s*右图\s*）?/;

/** Browser-side: non-phone pasted images on the canvas. */
export function extractCanvasReferenceImagesFromDocument() {
  const canvas = document.querySelector('.tree-node.rResCanvas');
  if (!canvas) return [];

  const canvasRect = canvas.getBoundingClientRect();
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
    if (width < 40 || height < 40 || isPhoneLike(width, height)) return;

    const img = element.querySelector('img');
    const rawSrc = img?.currentSrc || img?.src || img?.getAttribute('src') || '';
    if (!rawSrc) return;

    const imageUrl = rawSrc.startsWith('http') ? rawSrc : new URL(rawSrc, location.origin).href;
    if (seen.has(imageUrl)) return;
    seen.add(imageUrl);

    results.push({
      elementIndex,
      imageUrl,
      rect: {
        x: Math.round(rect.x - canvasRect.x),
        y: Math.round(rect.y - canvasRect.y),
        width,
        height,
      },
    });
  });

  return results.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}

/** Browser-side: short canvas labels such as 图1 / 图2. */
export function extractCanvasTextLabelsFromDocument() {
  const canvas = document.querySelector('.tree-node.rResCanvas');
  if (!canvas) return [];

  const canvasRect = canvas.getBoundingClientRect();
  const out = [];

  const figureLabel = /^图\s*(\d+)\s*$/;

  canvas.querySelectorAll('.widget.tree-node.wRichText').forEach((element) => {
    const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 12) return;
    if (!figureLabel.test(text)) return;

    const rect = element.getBoundingClientRect();
    out.push({
      text,
      canvasX: Math.round(rect.x - canvasRect.x),
      canvasY: Math.round(rect.y - canvasRect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  });

  return out.sort((a, b) => a.canvasY - b.canvasY || a.canvasX - b.canvasX);
}

/** Node-side: merge vertically adjacent rich-text blocks in the same column. */
export function mergeAdjacentRichTextBlocks(blocks, { columnTolerance = 48 } = {}) {
  if (!blocks?.length) return [];

  const sorted = [...blocks].sort((a, b) => a.canvasY - b.canvasY || a.canvasX - b.canvasX);
  const groups = [[sorted[0]]];

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = groups[groups.length - 1][groups[groups.length - 1].length - 1];
    const next = sorted[index];
    const sameColumn = Math.abs(previous.canvasX - next.canvasX) <= columnTolerance;
    if (sameColumn) {
      groups[groups.length - 1].push(next);
    } else {
      groups.push([next]);
    }
  }

  return groups.map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    return {
      text: group.map((block) => block.text).join('\n\n'),
      author: '',
      canvasX: first.canvasX,
      canvasY: first.canvasY,
      width: Math.max(...group.map((block) => block.canvasX + block.width)) - first.canvasX,
      height: (last.canvasY + last.height) - first.canvasY,
      kind: 'canvas-spec',
    };
  });
}

/**
 * Browser-side: long spec rich-text blocks on the artboard (not phone UI labels).
 * Includes widgets in the canvas container but outside `.rResCanvas` (e.g. 文案 section).
 */
export function extractCanvasRichTextSpecsFromDocument() {
  const canvas = document.querySelector('.tree-node.rResCanvas');
  if (!canvas) return [];

  const scope = canvas.closest('[class*="CanvasContainer"]') || canvas.parentElement || canvas;
  const canvasRect = canvas.getBoundingClientRect();
  const figureLabel = /^图\s*(\d+)\s*$/;
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

  function pointInsideRect(x, y, rect, padding = 8) {
    return x >= rect.x - padding
      && x <= rect.x + rect.width + padding
      && y >= rect.y - padding
      && y <= rect.y + rect.height + padding;
  }

  const phoneCandidates = [];
  canvas.querySelectorAll('.widget.tree-node.wImage').forEach((element) => {
    const rect = element.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (!isPhoneLike(width, height)) return;
    phoneCandidates.push({ canvasRect: toCanvasRect(rect) });
  });

  const deduped = [];
  for (const candidate of phoneCandidates) {
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
  const diagramBounds = [];
  for (const group of deduped) {
    let bounds = { ...group.canvasRect };
    for (const element of canvas.querySelectorAll(overlaySelectors)) {
      const layer = toCanvasRect(element.getBoundingClientRect());
      if (layer.width < 8 || layer.height < 8) continue;
      if (rectsOverlap(bounds, layer)) {
        bounds = unionRect(bounds, layer);
      }
    }
    diagramBounds.push(bounds);
  }

  const blocks = [];
  const seenText = new Set();

  for (const element of scope.querySelectorAll('.widget.tree-node.wRichText')) {
    const text = (element.innerText || element.textContent || '').replace(/\r/g, '').trim();
    if (!text || text.length < 2) continue;
    const normalized = text.replace(/\s+/g, ' ');
    if (figureLabel.test(normalized)) continue;
    if (seenText.has(text)) continue;
    seenText.add(text);

    const rect = element.getBoundingClientRect();
    const canvasX = Math.round(rect.x - canvasRect.x);
    const canvasY = Math.round(rect.y - canvasRect.y);
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const cx = canvasX + width / 2;
    const cy = canvasY + height / 2;

    if (diagramBounds.some((bounds) => pointInsideRect(cx, cy, bounds))) continue;

    blocks.push({ text, canvasX, canvasY, width, height });
  }

  if (!blocks.length) return [];

  const columnTolerance = 48;
  const sorted = blocks.slice().sort((a, b) => a.canvasY - b.canvasY || a.canvasX - b.canvasX);
  const groups = [[sorted[0]]];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = groups[groups.length - 1][groups[groups.length - 1].length - 1];
    const next = sorted[index];
    if (Math.abs(previous.canvasX - next.canvasX) <= columnTolerance) {
      groups[groups.length - 1].push(next);
    } else {
      groups.push([next]);
    }
  }

  return groups.map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    return {
      text: group.map((block) => block.text).join('\n\n'),
      author: '',
      canvasX: first.canvasX,
      canvasY: first.canvasY,
      width: Math.max(...group.map((block) => block.canvasX + block.width)) - first.canvasX,
      height: (last.canvasY + last.height) - first.canvasY,
      kind: 'canvas-spec',
    };
  });
}

export function imageInBounds(image, bounds) {
  if (!bounds?.width || !bounds?.height) return true;
  const cx = image.rect.x + image.rect.width / 2;
  const cy = image.rect.y + image.rect.height / 2;
  return cx >= bounds.x
    && cx <= bounds.x + bounds.width
    && cy >= bounds.y
    && cy <= bounds.y + bounds.height;
}

export function filterImagesInBounds(images, bounds) {
  const filtered = images.filter((image) => imageInBounds(image, bounds));
  return filtered.length ? filtered : images;
}

export function annotationBounds(annotation) {
  const x = annotation.canvasX ?? annotation.x ?? null;
  const y = annotation.canvasY ?? annotation.y ?? null;
  const width = annotation.width ?? null;
  const height = annotation.height ?? null;
  if (x == null || y == null || !width || !height) return null;
  return { x, y, width, height };
}

export function boundsOverlap(a, b, padding = 0) {
  return a.x - padding < b.x + b.width
    && a.x + a.width + padding > b.x
    && a.y - padding < b.y + b.height
    && a.y + a.height + padding > b.y;
}

/** Match downloaded inline assets to canvas-spec blocks by spatial overlap. */
export function referenceImagesForAnnotation(annotation, referenceImages, usedPaths, { padding = 120 } = {}) {
  const bounds = annotationBounds(annotation);
  if (!bounds) return [];

  return referenceImages
    .filter((image) => {
      if (!image.localPath || usedPaths.has(image.localPath) || !image.rect) return false;
      return boundsOverlap(bounds, image.rect, padding) || imageInBounds(image, bounds);
    })
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}

export function shouldAttachNearbyReferenceImages(annotation) {
  if (annotation.inlineImage || annotation.embeddedImages?.length) return false;
  return annotation.kind === 'canvas-spec';
}

export function attachNearbyReferenceImages(annotation, referenceImages, usedPaths) {
  if (!shouldAttachNearbyReferenceImages(annotation)) return annotation;

  const nearby = referenceImagesForAnnotation(annotation, referenceImages, usedPaths);
  if (!nearby.length) return annotation;

  for (const image of nearby) usedPaths.add(image.localPath);
  return {
    ...annotation,
    embeddedImages: nearby.map((image) => image.localPath),
  };
}

export async function downloadReferenceImages(images, imagesDir, prefix = 'inline') {
  const downloaded = [];
  for (const [index, image] of images.entries()) {
    const name = basename(new URL(image.imageUrl).pathname);
    const localName = `${prefix}-${String(index + 1).padStart(2, '0')}-${name}`;
    const localPath = `images/${localName}`;
    await downloadModaoImageAsset(image.imageUrl, `${imagesDir}/${localName}`);
    downloaded.push({ ...image, localPath });
  }
  return downloaded;
}

export function resolveFigureImage(text, referenceImages) {
  const match = String(text || '').trim().match(FIGURE_LABEL);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return referenceImages[index] || null;
}

export function resolveRightImage(referenceImages) {
  if (!referenceImages.length) return null;
  return [...referenceImages].sort((a, b) => b.rect.x - a.rect.x)[0];
}

export function enrichAnnotation(annotation, referenceImages) {
  const text = String(annotation.text || '');
  const trimmed = text.trim();
  const figure = resolveFigureImage(trimmed, referenceImages);
  if (figure?.localPath) {
    return {
      ...annotation,
      text: trimmed,
      inlineImage: figure.localPath,
      inlineMode: 'replace',
    };
  }

  if (RIGHT_IMAGE.test(text) && referenceImages.length) {
    const right = resolveRightImage(referenceImages);
    if (right?.localPath) {
      return {
        ...annotation,
        inlineImage: right.localPath,
        inlineMode: 'right-image',
      };
    }
  }

  return annotation;
}

export function mergeCanvasLabelsAsAnnotations(stickies, labels, richTextSpecs) {
  const labelAnnotations = (labels || []).map((label) => ({
    text: label.text,
    author: '',
    canvasX: label.canvasX,
    canvasY: label.canvasY,
    width: label.width,
    height: label.height,
    kind: 'label',
  }));
  const merged = [...stickies, ...labelAnnotations, ...(richTextSpecs || [])];
  return merged.sort((a, b) => (a.canvasY ?? a.y ?? 0) - (b.canvasY ?? b.y ?? 0)
    || (a.canvasX ?? a.x ?? 0) - (b.canvasX ?? b.x ?? 0));
}

export function enrichAnnotations(annotations, referenceImages) {
  const usedPaths = new Set();

  const withExplicitRefs = (annotations || []).map((annotation) => {
    const available = referenceImages.filter((image) => !image.localPath || !usedPaths.has(image.localPath));
    const enriched = enrichAnnotation(annotation, available);
    if (enriched.inlineImage) usedPaths.add(enriched.inlineImage);
    return enriched;
  });

  const canvasSpecs = withExplicitRefs.filter((annotation) => annotation.kind === 'canvas-spec');
  const others = withExplicitRefs.filter((annotation) => annotation.kind !== 'canvas-spec');

  const enrichedSpecs = canvasSpecs.map(
    (annotation) => attachNearbyReferenceImages(annotation, referenceImages, usedPaths),
  );

  return [...others, ...enrichedSpecs].sort(
    (a, b) => (a.canvasY ?? a.y ?? 0) - (b.canvasY ?? b.y ?? 0)
      || (a.canvasX ?? a.x ?? 0) - (b.canvasX ?? b.x ?? 0),
  );
}

export async function downloadAnnotationEmbeddedImages(annotations, imagesDir) {
  const enriched = [];
  for (const [annotationIndex, annotation] of (annotations || []).entries()) {
    const embeddedImages = [...(annotation.embeddedImages || [])];
    const sources = annotation.images || annotation.embeddedImageUrls || [];
    for (const [imageIndex, source] of sources.entries()) {
      const imageUrl = typeof source === 'string' ? source : source?.imageUrl;
      if (!imageUrl) continue;
      const name = basename(new URL(imageUrl).pathname);
      const localName = `sticky-${String(annotationIndex + 1).padStart(2, '0')}-${String(imageIndex + 1).padStart(2, '0')}-${name}`;
      await downloadModaoImageAsset(imageUrl, join(imagesDir, localName));
      embeddedImages.push(`images/${localName}`);
    }
    const { images, embeddedImageUrls, ...rest } = annotation;
    enriched.push({ ...rest, embeddedImages });
  }
  return enriched;
}
