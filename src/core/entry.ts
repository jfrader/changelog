/**
 * Entry loading, validation and file-naming helpers.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter.js';
import {
  AUDIENCES,
  KIND_ORDER,
  type ChangelogConfig,
  type ChangelogEntry,
  type ChangelogKind,
  type ChangelogAudience,
} from './types.js';

export const ENTRY_PATTERN = /^(\d{4}-\d{2}-\d{2})--(.+)\.md$/;

export function isKnownKind(value: unknown): value is ChangelogKind {
  return typeof value === 'string' && (KIND_ORDER as readonly string[]).includes(value);
}

export function isKnownAudience(value: unknown): value is ChangelogAudience {
  return typeof value === 'string' && (AUDIENCES as readonly string[]).includes(value);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'entry';
}

export function entryFileName(date: string, slug: string): string {
  return `${date}--${slug}.md`;
}

export function stripTitle(body: string): { title?: string; rest: string } {
  const lines = body.split(/\r?\n/);
  const firstNonEmpty = lines.findIndex((line) => line.trim().length > 0);
  if (firstNonEmpty === -1) return { rest: body };
  const candidate = lines[firstNonEmpty];
  const match = /^#\s+(.+)$/.exec(candidate.trim());
  if (!match) return { rest: body };
  const title = match[1].trim();
  const restLines = [...lines.slice(0, firstNonEmpty), ...lines.slice(firstNonEmpty + 1)];
  return { title, rest: restLines.join('\n').trim() };
}

export interface ParseEntryInput {
  fileName: string;
  source: string;
  config: ChangelogConfig;
}

const LANGUAGE_HEADING_RE = /^##\s+([A-Za-z]{2,5})\s*$/;

/**
 * Splits a body into per-language sections marked with `## <code>` headings.
 * Content before the first language heading belongs to the default language
 * (single-language entries simply have no headings at all).
 */
export function parseBodyLanguageSections(
  body: string,
  defaultLanguage: string,
): { byLang: Record<string, string>; order: string[] } {
  const byLang: Record<string, string> = {};
  const order: string[] = [];
  let currentLang: string | null = null;
  const buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    buffer.length = 0;
    if (!text) return;
    const lang = currentLang ?? defaultLanguage;
    if (byLang[lang] === undefined) order.push(lang);
    byLang[lang] = byLang[lang] ? `${byLang[lang]}\n\n${text}` : text;
  };

  for (const line of body.split(/\r?\n/)) {
    const match = LANGUAGE_HEADING_RE.exec(line.trim());
    if (match) {
      flush();
      currentLang = match[1].toLowerCase();
      continue;
    }
    buffer.push(line);
  }
  flush();
  return { byLang, order };
}

export function parseEntry(input: ParseEntryInput): {
  entry?: ChangelogEntry;
  issues: { level: 'warn' | 'error'; message: string }[];
} {
  const issues: { level: 'warn' | 'error'; message: string }[] = [];
  const { frontmatter, body, hasFrontmatter } = parseFrontmatter(input.source);

  if (!hasFrontmatter) {
    issues.push({ level: 'error', message: 'Missing frontmatter block' });
  }

  const fileNameMatch = ENTRY_PATTERN.exec(input.fileName);
  if (!fileNameMatch) {
    issues.push({
      level: 'warn',
      message: `File name does not follow YYYY-MM-DD--slug.md convention: ${input.fileName}`,
    });
  }

  const kind = frontmatter['kind'] as unknown;
  if (!isKnownKind(kind)) {
    issues.push({
      level: 'error',
      message: `Invalid or missing kind "${String(kind)}" (expected one of ${KIND_ORDER.join(', ')})`,
    });
  }

  const date = typeof frontmatter['date'] === 'string' ? frontmatter['date'] : fileNameMatch?.[1] ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    issues.push({ level: 'error', message: `Invalid date "${date}" (expected YYYY-MM-DD)` });
  }

  const audience = frontmatter['audience'] as unknown;
  if (audience !== undefined && !isKnownAudience(audience)) {
    issues.push({
      level: 'warn',
      message: `Unknown audience "${String(audience)}" (falling back to "all")`,
    });
  }

  const published = frontmatter['published'] === undefined ? true : frontmatter['published'] !== false;

  // --- i18n: resolve per-language titles and bodies ---
  const configLanguages = input.config.languages;
  const defaultLanguage = input.config.defaultLanguage;

  // Per-language titles from frontmatter (`title.<lang>`); plain `title` is the
  // default language.
  const frontTitleByLang: Record<string, string> = {};
  const plainTitle =
    typeof frontmatter['title'] === 'string' && frontmatter['title'].trim()
      ? frontmatter['title'].trim()
      : undefined;
  if (plainTitle) frontTitleByLang[defaultLanguage] = plainTitle;

  for (const [key, value] of Object.entries(frontmatter)) {
    if (!key.startsWith('title.') || typeof value !== 'string' || !value.trim()) continue;
    const lang = key.slice('title.'.length).toLowerCase();
    if (!configLanguages.includes(lang)) {
      issues.push({
        level: 'warn',
        message: `Unknown language "${lang}" in title (expected one of ${configLanguages.join(', ')})`,
      });
    }
    frontTitleByLang[lang] = value.trim();
  }

  // Body language sections.
  const { byLang: sectionBodyByLang, order } = parseBodyLanguageSections(body, defaultLanguage);
  for (const lang of order) {
    if (!configLanguages.includes(lang)) {
      issues.push({
        level: 'warn',
        message: `Unknown language section "## ${lang}" (expected one of ${configLanguages.join(', ')})`,
      });
    }
  }

  // Languages this entry actually provides (frontmatter titles or body sections).
  const langsSet = new Set<string>();
  for (const lang of [...Object.keys(frontTitleByLang), ...order]) {
    if (lang) langsSet.add(lang);
  }
  if (langsSet.size === 0) langsSet.add(defaultLanguage);

  const titleByLang: Record<string, string> = {};
  const resolvedBodyByLang: Record<string, string> = {};
  for (const lang of langsSet) {
    const section = sectionBodyByLang[lang] ?? '';
    const { title: heading, rest } = stripTitle(section);
    titleByLang[lang] = frontTitleByLang[lang] ?? heading ?? '';
    resolvedBodyByLang[lang] = heading ? rest : section;
  }

  const entryLanguages = configLanguages.filter((lang) => langsSet.has(lang));
  for (const lang of langsSet) {
    if (!entryLanguages.includes(lang)) entryLanguages.push(lang);
  }

  const title = titleByLang[defaultLanguage] ?? '';
  if (!title) {
    issues.push({ level: 'error', message: 'Entry has no title (frontmatter `title`/`title.<lang>` or `# heading`)' });
  }

  const tags = Array.isArray(frontmatter['tags'])
    ? frontmatter['tags'].map(String)
    : [];

  const entry: ChangelogEntry = {
    id: fileNameMatch ? `${fileNameMatch[1]}--${fileNameMatch[2]}` : slugify(title || input.fileName),
    kind: isKnownKind(kind) ? kind : 'chore',
    title: title || input.fileName,
    body: resolvedBodyByLang[defaultLanguage] ?? '',
    languages: entryLanguages,
    titleByLang,
    bodyByLang: resolvedBodyByLang,
    date,
    product: typeof frontmatter['product'] === 'string' && frontmatter['product'].trim()
      ? frontmatter['product'].trim()
      : input.config.product,
    productName: input.config.productName,
    version: typeof frontmatter['version'] === 'string' ? frontmatter['version'] : undefined,
    tags,
    audience: isKnownAudience(audience) ? audience : 'all',
    published,
    fileName: input.fileName,
    relPath: path.join('entries', input.fileName),
  };

  return { entry, issues };
}

export async function readEntries(
  entryDir: string,
  config: ChangelogConfig,
): Promise<{ entries: ChangelogEntry[]; issues: { level: 'warn' | 'error'; message: string; file: string }[] }> {
  const issues: { level: 'warn' | 'error'; message: string; file: string }[] = [];
  const entries: ChangelogEntry[] = [];

  let files: string[] = [];
  try {
    files = await fs.readdir(entryDir);
  } catch {
    return { entries, issues };
  }

  files = files.filter((file) => file.endsWith('.md') && !file.startsWith('.')).sort();

  for (const file of files) {
    const fullPath = path.join(entryDir, file);
    let source: string;
    try {
      source = await fs.readFile(fullPath, 'utf8');
    } catch (error) {
      issues.push({ level: 'error', message: `Could not read file: ${String(error)}`, file });
      continue;
    }
    const { entry, issues: entryIssues } = parseEntry({ fileName: file, source, config });
    for (const issue of entryIssues) {
      issues.push({ ...issue, file });
    }
    if (entry && !entryIssues.some((issue) => issue.level === 'error')) {
      entries.push(entry);
    }
  }

  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

  return { entries, issues };
}
