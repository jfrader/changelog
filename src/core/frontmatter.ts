/**
 * Minimal, dependency-free frontmatter parser for `---`-delimited YAML-ish
 * blocks. Supports the subset of YAML the changelog entries need:
 * scalars, booleans, numbers, quoted strings, and `[a, b]` tag lists.
 */

export interface Frontmatter {
  [key: string]: string | number | boolean | string[] | undefined;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function splitList(raw: string): string[] {
  return raw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
    .filter((part) => part.length > 0);
}

function coerce(raw: string): string | number | boolean {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return value.replace(/^['"]|['"]$/g, '');
}

export function parseFrontmatter(source: string): {
  frontmatter: Frontmatter;
  body: string;
  hasFrontmatter: boolean;
} {
  const match = FRONTMATTER_RE.exec(source);
  if (!match) {
    return { frontmatter: {}, body: source, hasFrontmatter: false };
  }

  const raw = match[1];
  const frontmatter: Frontmatter = {};

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (!key) continue;
    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = splitList(value);
    } else if (value === '' || value === '~' || value === 'null') {
      frontmatter[key] = undefined;
    } else {
      frontmatter[key] = coerce(value);
    }
  }

  const body = source.slice(match[0].length);
  return { frontmatter, body, hasFrontmatter: true };
}

export function serializeFrontmatter(fields: Frontmatter): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.join(', ')}]`);
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${String(value)}`);
    } else {
      const needsQuotes = /[:#\[\]{}]/.test(value);
      lines.push(`${key}: ${needsQuotes ? JSON.stringify(value) : value}`);
    }
  }
  return `---\n${lines.join('\n')}\n---\n`;
}
