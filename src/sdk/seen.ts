/**
 * Framework-agnostic helpers for the in-app "What's New" modal pattern.
 *
 * Each game stores the last changelog date the player saw (via `SeenStorage`,
 * typically localStorage) and shows every published entry dated after it. The
 * modal shell itself is rendered by each game in its own UI style; this module
 * only owns the state and the filtering.
 */
import type { ChangelogEntry } from '../core/types.js';

export const DEFAULT_SEEN_KEY = 'changelog.lastSeenDate';

export interface LocalizedEntry {
  title: string;
  body: string;
}

/**
 * Returns the title/body for a language, falling back to the entry's default
 * language when that language has no content (empty strings fall back too).
 */
export function localize(entry: ChangelogEntry, language: string): LocalizedEntry {
  const title = entry.titleByLang?.[language] || entry.title;
  const body = entry.bodyByLang?.[language] || entry.body;
  return { title, body };
}

export interface SeenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Parse a stored date, tolerating junk from older versions. */
export function readSeenDate(storage: SeenStorage, key: string = DEFAULT_SEEN_KEY): string | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function writeSeenDate(storage: SeenStorage, date: string, key: string = DEFAULT_SEEN_KEY): void {
  storage.setItem(key, date);
}

/** Today as YYYY-MM-DD in local time. */
export function localToday(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Published entries the player has not seen yet, newest first. `lastSeenDate`
 * of null means "never seen" → everything published is new.
 */
export function entriesSince(
  entries: ChangelogEntry[],
  lastSeenDate: string | null,
): ChangelogEntry[] {
  const cutoff = lastSeenDate ?? '0000-00-00';
  return entries
    .filter((entry) => entry.published !== false)
    .filter((entry) => entry.date > cutoff)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });
}

/** Whether the modal should open: at least one new published entry exists. */
export function shouldShowWhatsNew(entries: ChangelogEntry[], lastSeenDate: string | null): boolean {
  return entriesSince(entries, lastSeenDate).length > 0;
}

export interface WhatsNewState {
  /** Entries new since the last visit, newest first. */
  entries: ChangelogEntry[];
  /** True when there is at least one new entry. */
  hasNew: boolean;
}

/** One-call state computation for a modal component or hook. */
export function computeWhatsNew(
  entries: ChangelogEntry[],
  lastSeenDate: string | null,
): WhatsNewState {
  const newEntries = entriesSince(entries, lastSeenDate);
  return { entries: newEntries, hasNew: newEntries.length > 0 };
}

/** Mark today as seen; returns the date stored. */
export function markSeenToday(storage: SeenStorage, key: string = DEFAULT_SEEN_KEY): string {
  const today = localToday();
  writeSeenDate(storage, today, key);
  return today;
}

/**
 * Mark the given entries as seen, storing the latest of the local date and the
 * newest entry date. This guarantees already-shown entries never reappear even
 * when entry dates are ahead of the browser's local date (e.g. UTC-dated
 * entries viewed from a timezone behind UTC).
 */
export function markSeen(
  storage: SeenStorage,
  entries: ChangelogEntry[],
  key: string = DEFAULT_SEEN_KEY,
): string {
  const seen = entries.reduce(
    (latest, entry) => (entry.date > latest ? entry.date : latest),
    localToday(),
  );
  writeSeenDate(storage, seen, key);
  return seen;
}
