import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWhatsNew,
  entriesSince,
  localToday,
  markSeen,
  markSeenToday,
  readSeenDate,
  shouldShowWhatsNew,
  writeSeenDate,
  DEFAULT_SEEN_KEY,
  type SeenStorage,
} from '../src/sdk/seen.ts';
import type { ChangelogEntry } from '../src/core/types.ts';

function makeEntry(overrides: Partial<ChangelogEntry>): ChangelogEntry {
  return {
    id: 'x',
    kind: 'feature',
    title: 'X',
    body: '',
    date: '2026-08-07',
    product: 'p',
    productName: 'P',
    tags: [],
    audience: 'all',
    published: true,
    fileName: 'x.md',
    relPath: 'entries/x.md',
    ...overrides,
  };
}

function memoryStorage(): SeenStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

test('readSeenDate tolerates missing and junk values', () => {
  const storage = memoryStorage();
  assert.equal(readSeenDate(storage), null);
  storage.setItem(DEFAULT_SEEN_KEY, 'not-a-date');
  assert.equal(readSeenDate(storage), null);
  storage.setItem(DEFAULT_SEEN_KEY, '2026-08-06');
  assert.equal(readSeenDate(storage), '2026-08-06');
});

test('writeSeenDate and markSeenToday persist and round-trip', () => {
  const storage = memoryStorage();
  writeSeenDate(storage, '2026-08-01');
  assert.equal(readSeenDate(storage), '2026-08-01');
  const today = markSeenToday(storage);
  assert.equal(today, localToday());
  assert.equal(readSeenDate(storage), today);
});

test('entriesSince returns only newer published entries, newest first', () => {
  const older = makeEntry({ id: 'a', date: '2026-08-05', title: 'Old' });
  const same = makeEntry({ id: 'b', date: '2026-08-06', title: 'Same day' });
  const newer = makeEntry({ id: 'c', date: '2026-08-07', title: 'New' });
  const draft = makeEntry({ id: 'd', date: '2026-08-07', title: 'Draft', published: false });

  const result = entriesSince([older, same, newer, draft], '2026-08-05');
  assert.deepEqual(result.map((e) => e.id), ['c', 'b']);
});

test('entriesSince with null lastSeen returns all published entries', () => {
  const a = makeEntry({ id: 'a', date: '2026-08-01' });
  const draft = makeEntry({ id: 'd', date: '2026-08-02', published: false });
  const result = entriesSince([a, draft], null);
  assert.deepEqual(result.map((e) => e.id), ['a']);
});

test('shouldShowWhatsNew and computeWhatsNew agree', () => {
  const entries = [makeEntry({ date: '2026-08-07' })];
  assert.equal(shouldShowWhatsNew(entries, '2026-08-06'), true);
  assert.equal(shouldShowWhatsNew(entries, '2026-08-07'), false);
  const state = computeWhatsNew(entries, '2026-08-06');
  assert.equal(state.hasNew, true);
  assert.equal(state.entries.length, 1);
});

test('markSeen stores the latest of local date and newest entry date', () => {
  const storage = memoryStorage();
  const entries = [makeEntry({ date: '2026-08-08' }), makeEntry({ id: 'z', date: '2026-08-09' })];
  const seen = markSeen(storage, entries);
  assert.equal(seen, '2026-08-09');
  assert.equal(readSeenDate(storage), '2026-08-09');
  // After marking, the shown entries never reappear, even behind UTC.
  assert.equal(shouldShowWhatsNew(entries, readSeenDate(storage)), false);
});
