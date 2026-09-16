#!/usr/bin/env node
import { createPlaywrightAutomation, loadPrototypePage } from '/Users/lizhirong/tools/modao-prototype-mcp/dist/image-capture.js';

const url =
  process.argv[2] ||
  'https://modao.cc/proto/k2a0Owfvsd3xbucI4UGL/sharing?view_mode=read_only&screen=rbpV9NHXDLngNGkE5';

function extractStickyDetails() {
  return Array.from(document.querySelectorAll('.wSticky')).map((el) => {
    const text = (el.innerText || el.textContent || '').replace(/\r/g, '').trim();
    const author =
      el.querySelector('.sticky-author, .author-name, [class*="author"], [class*="user-name"]')
        ?.textContent?.trim() || '';
    const cls = el.className;
    const rect = el.getBoundingClientRect();
    return { text, author, cls, y: rect.y, html: el.innerHTML.slice(0, 300) };
  });
}

const automation = createPlaywrightAutomation();
const browser = await automation.launch({ headless: true, timeoutMs: 90000 });
try {
  const page = await browser.newPage();
  await loadPrototypePage(page, url, 90000);
  const hits = await page.evaluate(extractStickyDetails);
  console.log(JSON.stringify(hits, null, 2));
} finally {
  await browser.close().catch(() => undefined);
}
