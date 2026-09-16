import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dedupePhoneFrameCandidates,
  expandArtboardWithContentImages,
  expandArtboardWithDiagramRegions,
  expandArtboardWithPhoneFrames,
  isPhoneLikeFrameRect,
  matchOrphanPhoneToArtboard,
  mergeLayoutCanvasArtboards,
  shouldUseMultiCanvasLayout,
} from './modao_canvas_pages.mjs';
import { mapStickiesToArtboards } from './extract_modao_annotations.mjs';

test('isPhoneLikeFrameRect accepts typical Modao phone mockups', () => {
  assert.equal(isPhoneLikeFrameRect(390, 844), true);
  assert.equal(isPhoneLikeFrameRect(396, 847), true);
  assert.equal(isPhoneLikeFrameRect(250, 1152), false);
  assert.equal(isPhoneLikeFrameRect(600, 400), false);
});

test('dedupePhoneFrameCandidates removes overlapping shells', () => {
  const input = [
    { elementIndex: 0, rect: { x: 10, y: 20, width: 396, height: 847 } },
    { elementIndex: 1, rect: { x: 12, y: 22, width: 396, height: 847 } },
    { elementIndex: 2, rect: { x: 800, y: 20, width: 390, height: 844 } },
  ];
  const out = dedupePhoneFrameCandidates(input);
  assert.equal(out.length, 2);
  assert.equal(out[0].elementIndex, 0);
  assert.equal(out[1].elementIndex, 2);
});

test('shouldUseMultiCanvasLayout detects horizontal multi-page screens', () => {
  assert.equal(shouldUseMultiCanvasLayout(6, 6), true);
  assert.equal(shouldUseMultiCanvasLayout(1, 6), false);
  assert.equal(shouldUseMultiCanvasLayout(6, 1), false);
});

test('mergeLayoutCanvasArtboards preserves p2meta ids and canvas indices', () => {
  const p2meta = [
    { id: 'page-a', title: '页面 1' },
    { id: 'page-b', title: 'pin码' },
  ];
  const layout = [
    { id: 'page-a', title: '页面 1', canvasIndex: 3, rect: { x: 579, y: 110, width: 393, height: 852 } },
    { id: 'page-b', title: 'pin码', canvasIndex: 1, rect: { x: -882, y: 110, width: 393, height: 852 } },
  ];
  const merged = mergeLayoutCanvasArtboards(p2meta, layout);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].canvasIndex, 3);
  assert.equal(merged[1].id, 'page-b');
  assert.equal(merged[1].multiCanvasLayout, true);
});

test('expandArtboardWithDiagramRegions splits each diagram region', () => {
  const tab = { id: 'page-a', title: '页面 1', tabIndex: 0 };
  const single = expandArtboardWithDiagramRegions(tab, [{
    elementIndex: 0,
    rect: { x: 0, y: 0, width: 390, height: 844 },
    canvasRect: { x: 36, y: 49, width: 390, height: 844 },
  }]);
  assert.equal(single.length, 1);
  assert.equal(single[0].splitFrame, true);
  assert.equal(single[0].title, '页面 1');

  const frames = [
    {
      elementIndex: 0,
      rect: { x: 0, y: 0, width: 390, height: 844 },
      canvasRect: { x: 36, y: 49, width: 390, height: 844 },
    },
    {
      elementIndex: 1,
      rect: { x: 500, y: 0, width: 390, height: 844 },
      canvasRect: { x: 855, y: 24, width: 390, height: 844 },
    },
  ];
  const split = expandArtboardWithDiagramRegions(tab, frames);
  assert.equal(split.length, 2);
  assert.equal(split[0].title, '页面 1 — 1');
  assert.equal(split[1].title, '页面 1 — 2');
  assert.equal(split[0].canvasRect.x, 36);
  assert.equal(split[1].canvasRect.x, 855);
});

test('expandArtboardWithPhoneFrames remains compatible wrapper', () => {
  const tab = { id: 'page-a', title: '页面 1', tabIndex: 0 };
  const none = expandArtboardWithPhoneFrames(tab, []);
  assert.equal(none.length, 1);
  assert.equal(none[0].splitFrame, false);
});

test('expandArtboardWithContentImages splits pasted assets', () => {
  const tab = { id: 'page-a', title: '页面 1', tabIndex: 0 };
  const single = expandArtboardWithContentImages(tab, [{
    elementIndex: 0,
    width: 859,
    height: 69,
    imageUrl: 'https://modao.cc/uploads7/images/15814/158146820/v2_szf6mo.png',
    rect: { x: 0, y: 0, width: 859, height: 69 },
  }]);
  assert.equal(single.length, 1);
  assert.equal(single[0].id, 'page-a-asset-1');
  assert.equal(single[0].contentImage.imageUrl.includes('v2_szf6mo.png'), true);
});

test('mapStickiesToArtboards assigns by containment in canvas coordinates', () => {
  const artboards = [
    {
      id: 'page-diagram-1',
      canvasRect: { x: 36, y: 49, width: 390, height: 844 },
      splitFrame: true,
    },
    {
      id: 'page-diagram-2',
      canvasRect: { x: 855, y: 24, width: 390, height: 844 },
      splitFrame: true,
    },
  ];
  const stickies = [
    { text: 'left note', canvasX: 100, canvasY: 120, width: 120, height: 80 },
    { text: 'right note', canvasX: 900, canvasY: 100, width: 120, height: 80 },
  ];
  const map = mapStickiesToArtboards(stickies, artboards);
  assert.equal(map.get('page-diagram-1').length, 1);
  assert.equal(map.get('page-diagram-2').length, 1);
  assert.match(map.get('page-diagram-1')[0].text, /left/);
  assert.match(map.get('page-diagram-2')[0].text, /right/);
});

test('matchOrphanPhoneToArtboard pairs external phone frames by viewport proximity', () => {
  const orphans = [
    {
      elementIndex: 1,
      rect: { x: 1091, y: 183, width: 408, height: 882 },
      imageUrl: 'https://example.com/page2.jpg',
    },
  ];
  const artboard = {
    id: 'page-2',
    rect: { x: 1106, y: 209, width: 393, height: 852 },
  };
  const used = new Set();
  const match = matchOrphanPhoneToArtboard(orphans, artboard, used);
  assert.equal(match?.elementIndex, 1);
  assert.equal(match?.imageUrl.includes('page2.jpg'), true);
  used.add(match.elementIndex);
  assert.equal(matchOrphanPhoneToArtboard(orphans, artboard, used), null);
});

test('mapStickiesToArtboards uses viewport coords for side-by-side multi-canvas pages', () => {
  const artboards = [
    {
      id: 'page-1',
      rect: { x: 336, y: 198, width: 393, height: 852 },
      splitFrame: true,
    },
    {
      id: 'page-2',
      rect: { x: 1106, y: 209, width: 393, height: 852 },
      splitFrame: true,
    },
  ];
  const stickies = [
    { text: 'note for page 1', x: -6, y: 317, width: 290, height: 206 },
    { text: 'note for page 2', x: 794, y: 489, width: 297, height: 218 },
  ];
  const map = mapStickiesToArtboards(stickies, artboards);
  assert.equal(map.get('page-1').length, 1);
  assert.equal(map.get('page-2').length, 1);
  assert.match(map.get('page-1')[0].text, /page 1/);
  assert.match(map.get('page-2')[0].text, /page 2/);
});
