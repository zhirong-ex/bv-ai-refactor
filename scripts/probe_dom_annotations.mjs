#!/usr/bin/env node
import { createPlaywrightAutomation, loadPrototypePage } from '/Users/lizhirong/tools/modao-prototype-mcp/dist/image-capture.js';

const url =
  process.argv[2] ||
  'https://modao.cc/proto/k2a0Owfvsd3xbucI4UGL/sharing?view_mode=read_only&screen=rbpV9NHXDLngNGkE5';

function extractAll() {
  const out = [];
  const seen = new Set();
  const sels = [
    '.wSticky',
    '.wRichText',
    '.widget.text',
    '.widget.sticky',
    '[class*="Sticky"]',
    '[class*="RichText"]',
    '[class*="sticky"]',
    '[class*="annotation"]',
    '[class*="comment"]',
    '.note-widget',
    '.canvas-item-text',
  ];

  for (const sel of sels) {
    for (const el of document.querySelectorAll(sel)) {
      const text = (el.innerText || el.textContent || '').replace(/\r/g, '').trim();
      if (!text || text.length < 5 || seen.has(text)) continue;
      seen.add(text);
      out.push({ sel, len: text.length, preview: text.slice(0, 120) });
    }
  }

  // also dump any large text blocks on canvas outside simulator
  const sim = document.querySelector('#simulator');
  for (const el of document.querySelectorAll('div, section, article')) {
    if (sim && sim.contains(el)) continue;
    const text = (el.innerText || '').replace(/\r/g, '').trim();
    if (text.length < 80 || text.length > 5000 || seen.has(text)) continue;
    if (/Android Remote|逻辑|文案|雷晨萌/.test(text)) {
      seen.add(text);
      out.push({ sel: 'heuristic', len: text.length, preview: text.slice(0, 120) });
    }
  }

  return out;
}

const automation = createPlaywrightAutomation();
const browser = await automation.launch({ headless: true, timeoutMs: 90000 });
try {
  const page = await browser.newPage();
  await loadPrototypePage(page, url, 90000);
  const hits = await page.evaluate(extractAll);
  console.log(JSON.stringify(hits, null, 2));
} finally {
  await browser.close().catch(() => undefined);
}
