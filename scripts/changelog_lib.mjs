/**
 * Parse Boostvision-style ChangeLog files (version header + indented bullet items).
 *
 * Example:
 *   v1.5.3
 *       * item one
 *       * item two
 *
 *   v1.5.2
 *       * only sdk bump
 */

const VERSION_RE = /^v(\d+\.\d+\.\d+)\b/i;

/** @returns {{ major: number, minor: number, patch: number, key: string, label: string }} */
export function parseSemver(versionLabel) {
  const m = String(versionLabel).trim().match(VERSION_RE);
  if (!m) return null;
  const [major, minor, patch] = m[1].split('.').map(Number);
  return {
    major,
    minor,
    patch,
    key: m[1],
    label: `v${m[1]}`,
  };
}

export function compareSemver(a, b) {
  if (!a || !b) return 0;
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * @param {string} content
 * @returns {{ version: string, semver: ReturnType<typeof parseSemver>, items: string[], rawBody: string }[]}
 */
export function parseChangeLog(content) {
  const entries = [];
  let current = null;
  const bodyLines = [];

  const flush = () => {
    if (!current) return;
    entries.push({
      version: current.version,
      semver: current.semver,
      items: [...current.items],
      rawBody: bodyLines.join('\n').trim(),
    });
    bodyLines.length = 0;
  };

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const header = parseSemver(trimmed);
    if (header && line.trimStart() === trimmed) {
      flush();
      current = { version: trimmed, semver: header, items: [] };
      continue;
    }

    if (!current) continue;

    const bullet = trimmed.match(/^\*\s+(.*)$/);
    if (bullet) {
      current.items.push(bullet[1].trim());
      bodyLines.push(trimmed);
      continue;
    }

    if (/^\S/.test(trimmed)) {
      current.items.push(trimmed);
      bodyLines.push(trimmed);
    }
  }

  flush();
  return entries.filter((entry) => entry.semver);
}

export function semverKeys(entries) {
  return new Set(entries.map((entry) => entry.semver.key));
}

export function formatChangeLogSupplementMd(entry, gitRef) {
  const lines = [
    `# ${entry.version}`,
    '',
    '> 来源：`ChangeLog`（Git 补充，非墨刀 Archive）',
    `> Git：${gitRef}`,
    '',
    '## 更新说明',
    '',
  ];

  if (entry.items.length) {
    for (const item of entry.items) {
      lines.push(`- ${item}`);
    }
  } else if (entry.rawBody) {
    lines.push(entry.rawBody);
  } else {
    lines.push('- （ChangeLog 无条目）');
  }

  lines.push('');
  return `${lines.join('\n')}`;
}
