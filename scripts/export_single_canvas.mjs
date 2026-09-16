#!/usr/bin/env node
/**
 * Export a single Modao canvas URL (screen=...) — pages inside the canvas only.
 * Uses read_only design view (not device simulator) so wide canvases and stickies are captured.
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_TIMEOUT_MS,
  createPlaywrightAutomation,
  loadPrototypePage,
} from '/Users/lizhirong/tools/modao-prototype-mcp/dist/image-capture.js';
import { buildPngFileName } from '/Users/lizhirong/tools/modao-prototype-mcp/dist/filename.js';
import { writeExportArtifacts } from '/Users/lizhirong/tools/modao-prototype-mcp/dist/output-writer.js';
import { normalizeAnnotationText } from './annotation_text.mjs';
import {
  buildReadOnlyPageUrl,
  captureDiagramRegionScreenshot,
  countLayoutCanvasElementsFromDocument,
  downloadModaoImageAsset,
  expandArtboardWithContentImages,
  expandArtboardWithDiagramRegions,
  extractCanvasPageTabsFromDocument,
  extractContentImagesFromDocument,
  extractDiagramRegionsFromCanvasIndex,
  extractDiagramRegionsFromDocument,
  extractLayoutCanvasArtboardsFromDocument,
  extractVisibleArtboardsFromDocument,
  fetchCanvasPagesFromP2meta,
  filterLayoutContentImages,
  fitDesignCanvasView,
  mergeArtboardLists,
  matchOrphanPhoneToArtboard,
  mergeLayoutCanvasArtboards,
  extractOrphanPhoneImagesFromDocument,
  screenshotDesignArtboard,
  screenshotLayoutCanvasElement,
  selectCanvasPageTab,
  shouldUseMultiCanvasLayout,
} from './modao_canvas_pages.mjs';
import {
  extractCanvasStickiesFromDocument,
  mapStickiesToArtboards,
} from './extract_modao_annotations.mjs';
import {
  downloadReferenceImages,
  downloadAnnotationEmbeddedImages,
  enrichAnnotations,
  extractCanvasReferenceImagesFromDocument,
  extractCanvasRichTextSpecsFromDocument,
  extractCanvasTextLabelsFromDocument,
  mergeCanvasLabelsAsAnnotations,
} from './annotation_assets.mjs';

function usage() {
  console.error('Usage: node export_single_canvas.mjs "<canvas-url>" <output-dir> [--timeout-ms N]');
  process.exit(1);
}

function parseArgs(argv) {
  const url = argv[2];
  const outputDir = argv[3];
  if (!url || !outputDir) usage();
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  for (let i = 4; i < argv.length; i++) {
    if (argv[i] === '--timeout-ms' && argv[i + 1]) timeoutMs = Number(argv[++i]);
  }
  return { url, outputDir, timeoutMs };
}

function normalizeAnnotations(raw) {
  return (raw || []).map(({
    text,
    author,
    images,
    kind,
    canvasX,
    canvasY,
    width,
    height,
    x,
    y,
  }) => ({
    text: normalizeAnnotationText(text),
    author: author || '',
    images: images || [],
    kind: kind || '',
    canvasX: canvasX ?? x ?? null,
    canvasY: canvasY ?? y ?? null,
    width: width ?? null,
    height: height ?? null,
  }));
}

async function prepareAnnotations(raw, referenceImages, imagesDir) {
  const normalized = normalizeAnnotations(raw);
  const withCanvasRefs = enrichAnnotations(normalized, referenceImages);
  return downloadAnnotationEmbeddedImages(withCanvasRefs, imagesDir);
}

function resolveLayoutKind(diagramRegions, contentImages, artboard, orphanPhone) {
  if (diagramRegions.length > 0) return 'layout';
  if (contentImages.length > 0) return 'screenshot';
  if (orphanPhone?.imageUrl) return 'screenshot';
  if (artboard?.rect?.width && artboard?.rect?.height) return 'screenshot';
  return 'annotation-only';
}

async function extractAnnotationMap(page) {
  const stickies = await page.evaluate(extractCanvasStickiesFromDocument);
  const artboards = await page.evaluate(extractVisibleArtboardsFromDocument);
  const stickyMap = mapStickiesToArtboards(stickies, artboards);
  return { stickies, artboards, stickyMap };
}

async function captureMultiCanvasLayoutPages(page, sourceUrl, imagesDir, artboards, timeoutMs) {
  const pages = [];
  const seenIds = new Map();
  let outputIndex = 0;

  await loadPrototypePage(page, sourceUrl, timeoutMs);
  await fitDesignCanvasView(page);

  const orphanPhones = await page.evaluate(extractOrphanPhoneImagesFromDocument);
  const usedOrphanPhones = new Set();

  const artboardPlans = [];
  for (const artboard of artboards) {
    const canvasIndex = artboard.canvasIndex ?? 0;
    const diagramRegions = await page.evaluate(extractDiagramRegionsFromCanvasIndex, canvasIndex);
    const contentImagesRaw = diagramRegions.length === 0
      ? await page.evaluate(extractContentImagesFromDocument)
      : [];
    const contentImages = filterLayoutContentImages(contentImagesRaw);
    const orphanPhone = diagramRegions.length === 0
      ? matchOrphanPhoneToArtboard(orphanPhones, artboard, usedOrphanPhones)
      : null;
    if (orphanPhone) usedOrphanPhones.add(orphanPhone.elementIndex);
    const exportTargets = diagramRegions.length > 0
      ? expandArtboardWithDiagramRegions(artboard, diagramRegions)
      : expandArtboardWithContentImages(artboard, contentImages);
    const layoutKind = resolveLayoutKind(diagramRegions, contentImages, artboard, orphanPhone);
    artboardPlans.push({
      artboard,
      canvasIndex,
      diagramRegions,
      contentImages,
      orphanPhone,
      exportTargets: exportTargets.map((target) => ({
        ...target,
        rect: target.rect ?? orphanPhone?.rect ?? artboard.rect ?? null,
      })),
      layoutKind,
    });
  }

  const stickies = await page.evaluate(extractCanvasStickiesFromDocument);
  const labels = await page.evaluate(extractCanvasTextLabelsFromDocument);
  const richTextSpecs = await page.evaluate(extractCanvasRichTextSpecsFromDocument);
  const mergedStickies = mergeCanvasLabelsAsAnnotations(stickies, labels, richTextSpecs);
  const allTargets = artboardPlans.flatMap((plan) => plan.exportTargets);
  const globalStickyMap = mapStickiesToArtboards(mergedStickies, allTargets);

  const referenceImagesRaw = await page.evaluate(extractCanvasReferenceImagesFromDocument);
  const downloadedRefs = referenceImagesRaw.length
    ? await downloadReferenceImages(referenceImagesRaw, imagesDir)
    : [];

  for (const plan of artboardPlans) {
    const {
      artboard,
      canvasIndex,
      diagramRegions,
      contentImages,
      orphanPhone,
      exportTargets,
      layoutKind,
    } = plan;

    const targetFiles = exportTargets.map((target) => {
      outputIndex += 1;
      const baseId = target.id.trim() || `artboard-${outputIndex}`;
      const count = seenIds.get(baseId) ?? 0;
      seenIds.set(baseId, count + 1);
      const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
      const fileName = buildPngFileName(outputIndex, target.title, id);
      return { target, id, fileName, imagePath: join(imagesDir, fileName) };
    });

    if (diagramRegions.length > 0) {
      for (const [regionIndex, region] of diagramRegions.entries()) {
        await captureDiagramRegionScreenshot(
          page,
          region,
          targetFiles[regionIndex].imagePath,
          canvasIndex,
        );
      }
    } else if (contentImages.length > 0) {
      for (const [imageIndex, image] of contentImages.entries()) {
        await downloadModaoImageAsset(image.imageUrl, targetFiles[imageIndex].imagePath);
      }
    } else if (orphanPhone?.imageUrl && targetFiles.length > 0) {
      await downloadModaoImageAsset(orphanPhone.imageUrl, targetFiles[0].imagePath);
    } else if (layoutKind !== 'annotation-only' && targetFiles.length > 0) {
      await screenshotLayoutCanvasElement(page, artboard, targetFiles[0].imagePath, canvasIndex);
    }

    for (const { target, id, fileName } of targetFiles) {
      const rawAnnotations = globalStickyMap.get(target.id) || globalStickyMap.get('__canvas__') || [];
      const annotations = await prepareAnnotations(rawAnnotations, downloadedRefs, imagesDir);
      pages.push({
        id,
        title: target.title,
        url: sourceUrl,
        image: layoutKind === 'annotation-only' ? '' : `images/${fileName}`,
        layoutKind,
        annotations,
      });
    }
  }

  return pages;
}

async function captureDesignPages(page, sourceUrl, imagesDir, artboards, timeoutMs) {
  const pages = [];
  const seenIds = new Map();
  let outputIndex = 0;

  for (const [index, artboard] of artboards.entries()) {
    const pageUrl = buildReadOnlyPageUrl(sourceUrl, artboard.id);
    await loadPrototypePage(page, pageUrl, timeoutMs);
    await fitDesignCanvasView(page);
    if (typeof artboard.tabIndex === 'number') {
      await selectCanvasPageTab(page, artboard.tabIndex);
      await fitDesignCanvasView(page);
    }

    const diagramRegions = await page.evaluate(extractDiagramRegionsFromCanvasIndex);
    const contentImagesRaw = diagramRegions.length === 0
      ? await page.evaluate(extractContentImagesFromDocument)
      : [];
    const contentImages = filterLayoutContentImages(contentImagesRaw);
    const exportTargets = diagramRegions.length > 0
      ? expandArtboardWithDiagramRegions(artboard, diagramRegions)
      : expandArtboardWithContentImages(artboard, contentImages);
    const layoutKind = resolveLayoutKind(diagramRegions, contentImages, artboard, null);

    const referenceImagesRaw = await page.evaluate(extractCanvasReferenceImagesFromDocument);
    const downloadedRefs = referenceImagesRaw.length
      ? await downloadReferenceImages(referenceImagesRaw, imagesDir)
      : [];

    const stickies = await page.evaluate(extractCanvasStickiesFromDocument);
    const labels = await page.evaluate(extractCanvasTextLabelsFromDocument);
    const richTextSpecs = await page.evaluate(extractCanvasRichTextSpecsFromDocument);
    const mergedStickies = mergeCanvasLabelsAsAnnotations(stickies, labels, richTextSpecs);
    const stickyMap = mapStickiesToArtboards(mergedStickies, exportTargets);
    const domArtboards = await page.evaluate(extractVisibleArtboardsFromDocument);
    const domArtboard = domArtboards.find((item) => item.id === artboard.id) || domArtboards[index] || artboard;

    const targetFiles = exportTargets.map((target) => {
      outputIndex += 1;
      const baseId = target.id.trim() || `artboard-${outputIndex}`;
      const count = seenIds.get(baseId) ?? 0;
      seenIds.set(baseId, count + 1);
      const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
      const fileName = buildPngFileName(outputIndex, target.title, id);
      return { target, id, fileName, imagePath: join(imagesDir, fileName) };
    });

    if (diagramRegions.length > 0) {
      for (const [regionIndex, region] of diagramRegions.entries()) {
        await captureDiagramRegionScreenshot(page, region, targetFiles[regionIndex].imagePath);
      }
    } else if (contentImages.length > 0) {
      for (const [imageIndex, image] of contentImages.entries()) {
        await downloadModaoImageAsset(image.imageUrl, targetFiles[imageIndex].imagePath);
      }
    } else if (layoutKind !== 'annotation-only' && targetFiles.length > 0) {
      await screenshotDesignArtboard(page, domArtboard, targetFiles[0].imagePath);
    }

    for (const { target, id, fileName, imagePath } of targetFiles) {
      const rawAnnotations = stickyMap.get(target.id) || stickyMap.get('__canvas__') || [];
      const annotations = await prepareAnnotations(rawAnnotations, downloadedRefs, imagesDir);
      pages.push({
        id,
        title: target.title,
        url: pageUrl,
        image: layoutKind === 'annotation-only' ? '' : `images/${fileName}`,
        layoutKind,
        annotations,
      });
    }
  }

  return pages;
}

async function main() {
  const { url, outputDir, timeoutMs } = parseArgs(process.argv);
  const automation = createPlaywrightAutomation();
  const browser = await automation.launch({ headless: true, timeoutMs });

  try {
    const page = await browser.newPage();
    await loadPrototypePage(page, url, timeoutMs);
    await fitDesignCanvasView(page);

    const p2metaPages = await fetchCanvasPagesFromP2meta(url).catch(() => []);
    const pageTabs = await page.evaluate(extractCanvasPageTabsFromDocument);
    const domArtboards = await page.evaluate(extractVisibleArtboardsFromDocument);
    const { stickyMap } = await extractAnnotationMap(page);

    const layoutCanvasCount = await page.evaluate(countLayoutCanvasElementsFromDocument);
    const useMultiCanvasLayout = shouldUseMultiCanvasLayout(p2metaPages.length, layoutCanvasCount);

    let artboards;
    if (useMultiCanvasLayout) {
      const layoutArtboards = await page.evaluate(extractLayoutCanvasArtboardsFromDocument);
      artboards = mergeLayoutCanvasArtboards(p2metaPages, layoutArtboards);
    } else {
      artboards = mergeArtboardLists(
        p2metaPages,
        domArtboards,
        pageTabs.map((tab) => tab.title),
      );
    }

    const imagesDir = join(outputDir, 'images');
    await mkdir(imagesDir, { recursive: true });

    const referenceImagesRaw = await page.evaluate(extractCanvasReferenceImagesFromDocument);
    const downloadedRefs = referenceImagesRaw.length
      ? await downloadReferenceImages(referenceImagesRaw, imagesDir)
      : [];
    const labels = await page.evaluate(extractCanvasTextLabelsFromDocument);
    const richTextSpecs = await page.evaluate(extractCanvasRichTextSpecsFromDocument);
    const mergedStickies = mergeCanvasLabelsAsAnnotations(
      stickyMap.get('__canvas__') || [],
      labels,
      richTextSpecs,
    );
    const contentImagesFallbackRaw = await page.evaluate(extractContentImagesFromDocument);
    const contentImagesFallback = filterLayoutContentImages(contentImagesFallbackRaw);
    const layoutKind = resolveLayoutKind([], contentImagesFallback, null, null);

    let pages;
    if (artboards.length === 0) {
      const canvasName = new URL(url).searchParams.get('screen') || 'canvas';
      const fileName = buildPngFileName(1, canvasName, canvasName);
      const imagePath = join(imagesDir, fileName);
      const annotations = await prepareAnnotations(mergedStickies, downloadedRefs, imagesDir);
      if (contentImagesFallback.length > 0) {
        await downloadModaoImageAsset(contentImagesFallback[0].imageUrl, imagePath);
      } else if (layoutKind !== 'annotation-only') {
        await screenshotDesignArtboard(page, { id: canvasName, title: canvasName, rect: null }, imagePath);
      }
      pages = [{
        id: canvasName,
        title: canvasName,
        url,
        image: layoutKind === 'annotation-only' ? '' : `images/${fileName}`,
        layoutKind,
        annotations,
      }];
    } else if (useMultiCanvasLayout) {
      pages = await captureMultiCanvasLayoutPages(page, url, imagesDir, artboards, timeoutMs);
    } else {
      pages = await captureDesignPages(page, url, imagesDir, artboards, timeoutMs);
    }

    const result = await writeExportArtifacts({ sourceUrl: url, outputDir, pages });
    const annotationCount = result.pages.reduce((n, p) => n + (p.annotations?.length || 0), 0);
    console.log(JSON.stringify({ pageCount: result.pageCount, annotationCount, outputDir }, null, 2));
  } finally {
    await browser.close().catch(() => undefined);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
