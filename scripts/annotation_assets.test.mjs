import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachNearbyReferenceImages,
  enrichAnnotation,
  enrichAnnotations,
  mergeAdjacentRichTextBlocks,
  mergeCanvasLabelsAsAnnotations,
  referenceImagesForAnnotation,
  resolveFigureImage,
} from './annotation_assets.mjs';
import { filterLayoutContentImages, isLayoutContentImage } from './modao_canvas_pages.mjs';

test('resolveFigureImage maps 图1 to first reference image', () => {
  const refs = [{ localPath: 'images/inline-01-a.png' }, { localPath: 'images/inline-02-b.png' }];
  assert.equal(resolveFigureImage('图1', refs)?.localPath, 'images/inline-01-a.png');
  assert.equal(resolveFigureImage('图 2', refs)?.localPath, 'images/inline-02-b.png');
});

test('enrichAnnotation replaces 图1 label with inline image', () => {
  const refs = [{ localPath: 'images/inline-01-a.png' }];
  const out = enrichAnnotation({ text: '图1', author: '' }, refs);
  assert.equal(out.inlineImage, 'images/inline-01-a.png');
  assert.equal(out.inlineMode, 'replace');
});

test('enrichAnnotation inlines 右图 inside sticky body', () => {
  const refs = [{ localPath: 'images/inline-01-a.png', rect: { x: 900, y: 0, width: 100, height: 100 } }];
  const out = enrichAnnotation({ text: '1. 原逻辑（右图）', author: '' }, refs);
  assert.equal(out.inlineImage, 'images/inline-01-a.png');
  assert.equal(out.inlineMode, 'right-image');
});

test('mergeAdjacentRichTextBlocks merges same-column blocks', () => {
  const merged = mergeAdjacentRichTextBlocks([
    { text: '标题', canvasX: 534, canvasY: 42, width: 100, height: 20 },
    { text: '【界面】', canvasX: 534, canvasY: 89, width: 80, height: 20 },
    { text: '1、说明', canvasX: 534, canvasY: 130, width: 200, height: 40 },
  ]);
  assert.equal(merged.length, 1);
  assert.match(merged[0].text, /标题/);
  assert.match(merged[0].text, /【界面】/);
  assert.equal(merged[0].kind, 'canvas-spec');
});

test('mergeCanvasLabelsAsAnnotations includes rich text specs', () => {
  const merged = mergeCanvasLabelsAsAnnotations(
    [],
    [{ text: '图1', canvasY: 20, canvasX: 10, width: 20, height: 10 }],
    [{ text: 'GoogleCast协议镜像说明：', kind: 'canvas-spec', canvasY: 42, canvasX: 534, width: 100, height: 20 }],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].text, '图1');
  assert.equal(merged[1].kind, 'canvas-spec');
});

test('mergeCanvasLabelsAsAnnotations keeps canvas order', () => {
  const merged = mergeCanvasLabelsAsAnnotations(
    [{ text: 'sticky', canvasY: 100, canvasX: 0 }],
    [{ text: '图1', canvasY: 20, canvasX: 10 }],
  );
  assert.equal(merged[0].text, '图1');
  assert.equal(merged[1].text, 'sticky');
});

test('isLayoutContentImage ignores thin canvas strips', () => {
  assert.equal(isLayoutContentImage({ height: 69, width: 867 }), false);
  assert.equal(isLayoutContentImage({ height: 804, width: 3858 }), true);
});

test('filterLayoutContentImages keeps only layout-sized assets', () => {
  const filtered = filterLayoutContentImages([
    { height: 69, width: 867, imageUrl: 'https://example.com/a.png' },
    { height: 804, width: 3858, imageUrl: 'https://example.com/b.png' },
  ]);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].imageUrl, 'https://example.com/b.png');
});

test('referenceImagesForAnnotation matches inline assets in canvas-spec bounds', () => {
  const annotation = {
    kind: 'canvas-spec',
    canvasX: 500,
    canvasY: 200,
    width: 300,
    height: 400,
    text: '打开APPLE TV/MAC的系统设置',
  };
  const refs = [
    { localPath: 'images/inline-01-a.png', rect: { x: 100, y: 100, width: 80, height: 80 } },
    { localPath: 'images/inline-02-b.png', rect: { x: 520, y: 350, width: 120, height: 90 } },
  ];
  const used = new Set();
  const matched = referenceImagesForAnnotation(annotation, refs, used);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].localPath, 'images/inline-02-b.png');
});

test('enrichAnnotations attaches nearby inline images to canvas-spec', () => {
  const annotations = [{
    kind: 'canvas-spec',
    text: '打开APPLE TV/MAC的系统设置',
    author: '',
    canvasX: 500,
    canvasY: 200,
    width: 300,
    height: 400,
  }];
  const refs = [
    { localPath: 'images/inline-01-a.png', rect: { x: 520, y: 350, width: 120, height: 90 } },
    { localPath: 'images/inline-02-b.png', rect: { x: 530, y: 460, width: 100, height: 80 } },
  ];
  const enriched = enrichAnnotations(annotations, refs);
  assert.deepEqual(enriched[0].embeddedImages, [
    'images/inline-01-a.png',
    'images/inline-02-b.png',
  ]);
});

test('attachNearbyReferenceImages skips annotations that already have inline refs', () => {
  const used = new Set();
  const out = attachNearbyReferenceImages(
    { kind: 'canvas-spec', inlineImage: 'images/inline-01-a.png', canvasX: 0, canvasY: 0, width: 10, height: 10 },
    [{ localPath: 'images/inline-02-b.png', rect: { x: 0, y: 0, width: 10, height: 10 } }],
    used,
  );
  assert.equal(out.embeddedImages, undefined);
});
