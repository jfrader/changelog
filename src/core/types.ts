/**
 * Shared types for the changelog system.
 */

export const KIND_ORDER = ['feature', 'improvement', 'fix', 'breaking', 'chore'] as const;
export type ChangelogKind = (typeof KIND_ORDER)[number];

export const AUDIENCES = ['all', 'player', 'manager', 'guest', 'admin'] as const;
export type ChangelogAudience = (typeof AUDIENCES)[number];

export interface ChangelogEntry {
  /** Stable id derived from the file name, e.g. "2026-08-07--match-replays". */
  id: string;
  /** Frontmatter `kind`. */
  kind: ChangelogKind;
  /** Default-language title (mirrors `titleByLang[defaultLanguage]`). */
  title: string;
  /** Default-language markdown body (mirrors `bodyByLang[defaultLanguage]`). */
  body: string;
  /** Language codes this entry provides content for (subset of config.languages). */
  languages: string[];
  /** Titles keyed by language code. */
  titleByLang: Record<string, string>;
  /** Bodies keyed by language code. */
  bodyByLang: Record<string, string>;
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** Product slug (from config unless overridden). */
  product: string;
  /** Display name of the product. */
  productName: string;
  /** Version the change landed in, when known. */
  version?: string;
  /** Free-form tags. */
  tags: string[];
  /** Who should care about this change. */
  audience: ChangelogAudience;
  /** Draft entries are excluded from builds. */
  published: boolean;
  /** Raw file name. */
  fileName: string;
  /** Relative path from the changelog root. */
  relPath: string;
}

export interface ChangelogConfig {
  /** Product slug used in JSON / URLs, e.g. "mifulbo". */
  product: string;
  /** Human product name, e.g. "MiFulbo". */
  productName: string;
  /** Short tagline shown in the end-user page header. */
  tagline: string;
  /** Accent color for the end-user page (hex). */
  accent: string;
  /** Language codes entries may provide, e.g. ["en", "es"]. */
  languages: string[];
  /** Language used for unmarked/legacy content, the human doc and fallbacks. */
  defaultLanguage: string;
  /** Where entries live, relative to the changelog root. */
  entryDir: string;
  /** Where build output lives, relative to the changelog root. */
  outDir: string;
}

export interface ChangelogProject {
  /** Absolute path to the folder containing `changelog/`. */
  root: string;
  /** Absolute path to the `changelog/` folder itself. */
  changelogDir: string;
  config: ChangelogConfig;
}

export interface ChangelogDocument {
  schema: number;
  product: string;
  productName: string;
  tagline: string;
  accent: string;
  /** Language codes the entries may provide. */
  languages: string[];
  /** Language used as the default / fallback. */
  defaultLanguage: string;
  generatedAt: string;
  entries: ChangelogEntry[];
}

export interface BuildIssue {
  file?: string;
  level: 'warn' | 'error';
  message: string;
}

export interface BuildResult {
  document: ChangelogDocument;
  issues: BuildIssue[];
  markdown: string;
  entryCount: number;
  publishedCount: number;
  skippedCount: number;
}
