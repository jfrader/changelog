/**
 * Framework-agnostic helpers for the in-app "What's New" modal pattern.
 *
 * Each game stores the changelog date and entry ids the player saw (via
 * `SeenStorage`, typically localStorage) and shows every published entry not
 * yet dismissed. The modal shell itself is rendered by each game in its own
 * UI style; this module only owns the state and filtering.
 */
import type { ChangelogEntry } from '../core/types.js';
export declare const DEFAULT_SEEN_KEY = "changelog.lastSeenDate";
export declare const DEFAULT_SEEN_IDS_KEY = "changelog.seenEntryIds";
export interface LocalizedEntry {
    title: string;
    body: string;
}
/**
 * Returns the title/body for a language, falling back to the entry's default
 * language when that language has no content (empty strings fall back too).
 */
export declare function localize(entry: ChangelogEntry, language: string): LocalizedEntry;
export interface SeenStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export type SeenStorageSource = SeenStorage | (() => SeenStorage | null | undefined) | null | undefined;
export interface SeenStorageOptions {
    dateKey?: string;
    entryIdsKey?: string;
}
/** Parse a stored date, tolerating junk from older versions. */
export declare function readSeenDate(storage: SeenStorage, key?: string): string | null;
export declare function writeSeenDate(storage: SeenStorage, date: string, key?: string): void;
/** Today as YYYY-MM-DD in local time. */
export declare function localToday(date?: Date): string;
/**
 * Published entries the player has not seen yet, newest first. `lastSeenDate`
 * of null means "never seen" → everything published is new.
 */
export declare function entriesSince(entries: ChangelogEntry[], lastSeenDate: string | null): ChangelogEntry[];
/** Whether the modal should open: at least one new published entry exists. */
export declare function shouldShowWhatsNew(entries: ChangelogEntry[], lastSeenDate: string | null): boolean;
export interface WhatsNewState {
    /** Entries new since the last visit, newest first. */
    entries: ChangelogEntry[];
    /** True when there is at least one new entry. */
    hasNew: boolean;
}
/** One-call state computation for a modal component or hook. */
export declare function computeWhatsNew(entries: ChangelogEntry[], lastSeenDate: string | null): WhatsNewState;
/**
 * Compute unread entries directly from browser-like storage. Entry ids keep a
 * second release on the same calendar day visible; the older date key remains
 * a migration floor so already-dismissed history does not return.
 *
 * Storage access is deliberately best-effort. Private browsing and browser
 * policy can reject it, but What's New must never take down the host app.
 */
export declare function computeWhatsNewFromStorage(entries: ChangelogEntry[], storageSource: SeenStorageSource, options?: SeenStorageOptions): WhatsNewState;
/** Mark today as seen; returns the date stored. */
export declare function markSeenToday(storage: SeenStorage, key?: string): string;
/**
 * Mark the given entries as seen, storing the latest of the local date and the
 * newest entry date. This guarantees already-shown entries never reappear even
 * when entry dates are ahead of the browser's local date (e.g. UTC-dated
 * entries viewed from a timezone behind UTC).
 */
export declare function markSeen(storage: SeenStorage, entries: ChangelogEntry[], key?: string): string;
/**
 * Persist the entries dismissed by a What's New surface. Writes both the
 * legacy date and the ids dismissed on that cutoff day. Older dates need no
 * ids because the date floor covers them. Storage failure silently degrades
 * so dismissal still works for the current visit.
 */
export declare function markWhatsNewSeen(storageSource: SeenStorageSource, entries: ChangelogEntry[], options?: SeenStorageOptions): void;
