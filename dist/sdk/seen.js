export const DEFAULT_SEEN_KEY = 'changelog.lastSeenDate';
/** Parse a stored date, tolerating junk from older versions. */
export function readSeenDate(storage, key = DEFAULT_SEEN_KEY) {
    const raw = storage.getItem(key);
    if (!raw)
        return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}
export function writeSeenDate(storage, date, key = DEFAULT_SEEN_KEY) {
    storage.setItem(key, date);
}
/** Today as YYYY-MM-DD in local time. */
export function localToday(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
/**
 * Published entries the player has not seen yet, newest first. `lastSeenDate`
 * of null means "never seen" → everything published is new.
 */
export function entriesSince(entries, lastSeenDate) {
    const cutoff = lastSeenDate ?? '0000-00-00';
    return entries
        .filter((entry) => entry.published !== false)
        .filter((entry) => entry.date > cutoff)
        .sort((a, b) => {
        if (a.date !== b.date)
            return a.date < b.date ? 1 : -1;
        return a.id < b.id ? 1 : -1;
    });
}
/** Whether the modal should open: at least one new published entry exists. */
export function shouldShowWhatsNew(entries, lastSeenDate) {
    return entriesSince(entries, lastSeenDate).length > 0;
}
/** One-call state computation for a modal component or hook. */
export function computeWhatsNew(entries, lastSeenDate) {
    const newEntries = entriesSince(entries, lastSeenDate);
    return { entries: newEntries, hasNew: newEntries.length > 0 };
}
/** Mark today as seen; returns the date stored. */
export function markSeenToday(storage, key = DEFAULT_SEEN_KEY) {
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
export function markSeen(storage, entries, key = DEFAULT_SEEN_KEY) {
    const seen = entries.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), localToday());
    writeSeenDate(storage, seen, key);
    return seen;
}
//# sourceMappingURL=seen.js.map