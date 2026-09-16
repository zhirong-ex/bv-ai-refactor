/**
 * Normalize Modao sticky-note text for PRD output:
 * - drop <del> / strikethrough content (removed requirements)
 * - preserve list hierarchy (1. vs a.) via leading tabs
 */

/** Line is only a list marker, e.g. "1." or "a." */
const LIST_MARKER_ONLY = /^(\d+\.|[a-zA-Z]\.)$/;

const NUMBERED_LIST = /^(\d+)\.\s*(.*)$|^(\d+)\.$/;
const LETTER_LIST = /^([a-zA-Z])\.\s*(.*)$|^([a-zA-Z])\.(\s*)?$/;
const ROMAN_LIST =
  /^(I{1,3}|IV|VI{0,3}|IX|X{1,3}|XI{0,3}|XII|XIII|XIV|XV)\.\s*(.*)$|^(I{1,3}|IV|VI{0,3}|IX|X{1,3}|XI{0,3}|XII|XIII|XIV|XV)\.(\s*)?$/i;

export function classifyListLine(trimmed) {
  if (NUMBERED_LIST.test(trimmed)) return 'numbered';
  if (ROMAN_LIST.test(trimmed)) return 'roman';
  if (LETTER_LIST.test(trimmed)) return 'letter';
  return null;
}

export function inferListLineDepth(type, lastListType, lastListDepth = 0) {
  if (type === 'numbered') return 0;
  if (type === 'letter') {
    return lastListType === 'numbered' || lastListType === 'letter' ? 1 : 0;
  }
  if (type === 'roman') {
    if (lastListType === 'letter') return 2;
    if (lastListType === 'roman') return lastListDepth;
    if (lastListType === 'numbered') return 1;
    return 0;
  }
  return 0;
}

/** Infer tab indent for flat exported stickies (a./b. under 1./2., I. under a./b.). */
export function applyListHierarchy(text) {
  const lines = String(text || '').split('\n');
  let lastListType = null;
  let lastListDepth = 0;
  const out = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      lastListType = null;
      lastListDepth = 0;
      out.push('');
      continue;
    }

    const existingTabs = line.match(/^(\t*)/)[1].length;
    const type = classifyListLine(trimmed);

    if (type) {
      const inferredDepth = inferListLineDepth(type, lastListType, lastListDepth);
      const depth = Math.max(existingTabs, inferredDepth);
      lastListType = type;
      lastListDepth = depth;
      out.push(`${'\t'.repeat(depth)}${trimmed}`);
      continue;
    }

    if (lastListType !== null) {
      out.push(`${'\t'.repeat(lastListDepth)}${trimmed}`);
      continue;
    }

    out.push(existingTabs ? line : trimmed);
  }

  return out.join('\n');
}

export function parseMarginDepth(marginLeft) {
  const match = String(marginLeft || '').match(/([\d.]+)em/);
  if (!match) return 0;
  return Math.round(Number(match[1]));
}

/** Remove deleted / strikethrough nodes from a DOM subtree (browser context). */
export function textWithoutDeleted(root) {
  const clone = root.cloneNode(true);
  clone.querySelectorAll('del, s, strike, [style*="line-through"]').forEach((node) => node.remove());
  return (clone.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse Modao draft-editor sticky content with hierarchy and without deletions.
 * Self-contained for page.evaluate.
 */
export function extractStickyTextFromElement(stickyEl) {
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

export function normalizeAnnotationText(text) {
  const raw = String(text || '').replace(/\r/g, '');
  if (!raw.trim()) return raw;

  const lines = raw.split('\n');
  const merged = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      merged.push('');
      continue;
    }

    const indent = line.match(/^(\t*)/)[1];

    if (!indent && LIST_MARKER_ONLY.test(trimmed)) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j += 1;
      if (j < lines.length && !lines[j].startsWith('\t')) {
        merged.push(`${trimmed} ${lines[j].trim()}`);
        i = j;
        continue;
      }
    }

    merged.push(`${indent}${trimmed}`);
  }

  return applyListHierarchy(merged.join('\n').replace(/\n{3,}/g, '\n\n').trim());
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Render annotation body with line breaks and nested list indent. */
export function formatAnnotationBodyHtml(body) {
  return normalizeAnnotationText(body)
    .split('\n')
    .map((line) => {
      const tabs = line.match(/^\t*/)[0].length;
      const content = escapeHtml(line.slice(tabs));
      if (tabs === 0) return content;
      return `<span style="padding-left:${tabs * 2}em">${content}</span>`;
    })
    .join('<br>');
}
