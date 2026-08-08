/**
 * Framework-agnostic helpers for the in-app "What's New" modal pattern.
 *
 * Each game stores the changelog date and entry ids the player saw (via
 * `SeenStorage`, typically localStorage) and shows every published entry not
 * yet dismissed. The modal shell itself is rendered by each game in its own
 * UI style; this module only owns the state and filtering.
 */
import type { ChangelogEntry } from '../core/types.js';

export const DEFAULT_SEEN_KEY = 'changelog.lastSeenDate';
export const DEFAULT_SEEN_IDS_KEY = 'changelog.seenEntryIds';

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

export type SeenStorageSource =
  | SeenStorage
  | (() => SeenStorage | null | undefined)
  | null
  | undefined;

export interface SeenStorageOptions {
  dateKey?: string;
  entryIdsKey?: string;
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

function resolveSeenStorage(source: SeenStorageSource): SeenStorage | undefined {
  try {
    return (typeof source === 'function' ? source() : source) ?? undefined;
  } catch {
    // Accessing window.localStorage itself can throw under browser policy.
    return undefined;
  }
}

interface SeenEntryIdState {
  ids: ReadonlySet<string>;
  present: boolean;
}

function readSeenEntryIdState(
  storage: SeenStorage,
  key: string = DEFAULT_SEEN_IDS_KEY,
): SeenEntryIdState {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { ids: new Set(), present: false };
    const parsed: unknown = JSON.parse(raw);
    return {
      ids: new Set(
        Array.isArray(parsed)
          ? parsed.filter((value): value is string => typeof value === 'string')
          : [],
      ),
      present: true,
    };
  } catch {
    // A blocked read has no state; corrupt stored JSON is present but unusable.
    return { ids: new Set(), present: false };
  }
}

const newestFirst = (entries: ChangelogEntry[]): ChangelogEntry[] =>
  [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

/**
 * Compute unread entries directly from browser-like storage. Entry ids keep a
 * second release on the same calendar day visible; the older date key remains
 * a migration floor so already-dismissed history does not return.
 *
 * Storage access is deliberately best-effort. Private browsing and browser
 * policy can reject it, but What's New must never take down the host app.
 */
export function computeWhatsNewFromStorage(
  entries: ChangelogEntry[],
  storageSource: SeenStorageSource,
  options: SeenStorageOptions = {},
): WhatsNewState {
  const publishedEntries = newestFirst(entries.filter((entry) => entry.published !== false));
  const storage = resolveSeenStorage(storageSource);
  if (!storage) return { entries: publishedEntries, hasNew: publishedEntries.length > 0 };

  let lastSeenDate: string | null = null;
  try {
    lastSeenDate = readSeenDate(storage, options.dateKey ?? DEFAULT_SEEN_KEY);
  } catch {
    // Treat blocked storage as a first visit.
  }
  const entryIdsKey = options.entryIdsKey ?? DEFAULT_SEEN_IDS_KEY;
  const seenState = readSeenEntryIdState(storage, entryIdsKey);

  /* Date-only consumers predate id tracking. Seed every entry already present
     on their cutoff day and preserve the old strict-date behavior once, so an
     SDK upgrade does not replay news they dismissed. A later entry appended
     to that day then has a new id and remains visible. */
  if (lastSeenDate && !seenState.present) {
    const cutoffIds = publishedEntries
      .filter((entry) => entry.date === lastSeenDate)
      .map((entry) => entry.id)
      .reverse();
    try {
      storage.setItem(entryIdsKey, JSON.stringify(cutoffIds));
    } catch {
      // Migration is best-effort when storage is read-only.
    }
    const newEntries = publishedEntries.filter((entry) => entry.date > lastSeenDate);
    return { entries: newEntries, hasNew: newEntries.length > 0 };
  }

  const cutoff = lastSeenDate ?? '0000-00-00';
  const newEntries = publishedEntries.filter(
    (entry) => entry.date > cutoff || (entry.date === cutoff && !seenState.ids.has(entry.id)),
  );

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

/**
 * Persist the entries dismissed by a What's New surface. Writes both the
 * legacy date and the ids dismissed on that cutoff day. Older dates need no
 * ids because the date floor covers them. Storage failure silently degrades
 * so dismissal still works for the current visit.
 */
export function markWhatsNewSeen(
  storageSource: SeenStorageSource,
  entries: ChangelogEntry[],
  options: SeenStorageOptions = {},
): void {
  const storage = resolveSeenStorage(storageSource);
  if (!storage) return;

  const dateKey = options.dateKey ?? DEFAULT_SEEN_KEY;
  let existingDate: string | null = null;
  try {
    existingDate = readSeenDate(storage, dateKey);
  } catch {
    // The id write below may still be available.
  }

  const entryIdsKey = options.entryIdsKey ?? DEFAULT_SEEN_IDS_KEY;
  const latestEntryDate = entries.reduce(
    (latest, entry) => (entry.date > latest ? entry.date : latest),
    existingDate ?? '0000-00-00',
  );
  if (latestEntryDate === '0000-00-00') return;

  const newEntries = entries
    .filter((entry) => entry.date === latestEntryDate)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const newIds = new Set(newEntries.map((entry) => entry.id));
  const existingState = readSeenEntryIdState(storage, entryIdsKey);
  const existingIds =
    existingDate === latestEntryDate
      ? [...existingState.ids].filter((entryId) => !newIds.has(entryId))
      : [];
  const mergedIds = [...existingIds, ...newIds];
  try {
    writeSeenDate(storage, latestEntryDate, dateKey);
  } catch {
    // Entry ids may still be writable even if the date state is blocked.
  }
  try {
    storage.setItem(entryIdsKey, JSON.stringify(mergedIds));
  } catch {
    // Persistence is optional; the host app can still close its current dialog.
  }
}
