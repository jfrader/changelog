/**
 * Framework-agnostic helpers for the in-app "What's New" modal pattern.
 *
 * Each game stores the last changelog date the player saw (via `SeenStorage`,
 * typically localStorage) and shows every published entry dated after it. The
 * modal shell itself is rendered by each game in its own UI style; this module
 * only owns the state and the filtering.
 */
import type { ChangelogEntry } from '../core/types.js';
export declare const DEFAULT_SEEN_KEY = "changelog.lastSeenDate";
export interface SeenStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
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
/** Mark today as seen; returns the date stored. */
export declare function markSeenToday(storage: SeenStorage, key?: string): string;
/**
 * Mark the given entries as seen, storing the latest of the local date and the
 * newest entry date. This guarantees already-shown entries never reappear even
 * when entry dates are ahead of the browser's local date (e.g. UTC-dated
 * entries viewed from a timezone behind UTC).
 */
export declare function markSeen(storage: SeenStorage, entries: ChangelogEntry[], key?: string): string;
