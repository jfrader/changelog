import { type ChangelogConfig, type ChangelogEntry, type ChangelogKind, type ChangelogAudience } from './types.js';
export declare const ENTRY_PATTERN: RegExp;
export declare function isKnownKind(value: unknown): value is ChangelogKind;
export declare function isKnownAudience(value: unknown): value is ChangelogAudience;
export declare function slugify(input: string): string;
export declare function entryFileName(date: string, slug: string): string;
export declare function stripTitle(body: string): {
    title?: string;
    rest: string;
};
export interface ParseEntryInput {
    fileName: string;
    source: string;
    config: ChangelogConfig;
}
/**
 * Splits a body into per-language sections marked with `## <code>` headings.
 * Content before the first language heading belongs to the default language
 * (single-language entries simply have no headings at all).
 */
export declare function parseBodyLanguageSections(body: string, defaultLanguage: string): {
    byLang: Record<string, string>;
    order: string[];
};
export declare function parseEntry(input: ParseEntryInput): {
    entry?: ChangelogEntry;
    issues: {
        level: 'warn' | 'error';
        message: string;
    }[];
};
export declare function readEntries(entryDir: string, config: ChangelogConfig): Promise<{
    entries: ChangelogEntry[];
    issues: {
        level: 'warn' | 'error';
        message: string;
        file: string;
    }[];
}>;
