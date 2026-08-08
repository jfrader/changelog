import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry, slugify, entryFileName, ENTRY_PATTERN, isKnownKind } from '../src/core/entry.ts';
import { DEFAULT_CONFIG } from '../src/core/project.ts';

const CONFIG = { ...DEFAULT_CONFIG, product: 'mifulbo', productName: 'MiFulbo' };

test('parses a valid entry', () => {
  const source = `---
kind: feature
date: 2026-08-07
title: "Match replays"
tags: [match, replay]
---

# Match replays

You can now rewatch every settled match.
`;
  const { entry, issues } = parseEntry({ fileName: '2026-08-07--match-replays.md', source, config: CONFIG });
  assert.equal(issues.length, 0);
  assert.equal(entry?.kind, 'feature');
  assert.equal(entry?.title, 'Match replays');
  assert.equal(entry?.date, '2026-08-07');
  assert.deepEqual(entry?.tags, ['match', 'replay']);
  assert.equal(entry?.product, 'mifulbo');
  assert.equal(entry?.body, 'You can now rewatch every settled match.');
  assert.equal(entry?.id, '2026-08-07--match-replays');
});

test('title can come from the body heading when frontmatter has none', () => {
  const source = `---
kind: fix
date: 2026-08-06
---

# Auction closes on time

The auction extension now finishes before kickoff.
`;
  const { entry, issues } = parseEntry({ fileName: '2026-08-06--auction.md', source, config: CONFIG });
  assert.equal(issues.length, 0);
  assert.equal(entry?.title, 'Auction closes on time');
  assert.equal(entry?.body, 'The auction extension now finishes before kickoff.');
});

test('reports errors for missing kind, date and title', () => {
  const source = `---
tags: [x]
---

No kind, no date, no title here.
`;
  const { entry, issues } = parseEntry({ fileName: 'odd-name.md', source, config: CONFIG });
  const kinds = issues.map((i) => i.message);
  assert.ok(kinds.some((m) => m.includes('kind')));
  assert.ok(kinds.some((m) => m.includes('Invalid date')));
  assert.ok(kinds.some((m) => m.includes('title')));
  assert.ok(kinds.some((m) => m.includes('Missing frontmatter') === false));
  assert.ok(entry); // still produces a best-effort entry
});

test('draft entries keep published=false', () => {
  const source = `---
kind: feature
date: 2026-08-05
published: false
title: "Secret thing"
---

WIP
`;
  const { entry } = parseEntry({ fileName: '2026-08-05--secret.md', source, config: CONFIG });
  assert.equal(entry?.published, false);
});

test('unknown audience falls back with a warning', () => {
  const source = `---
kind: fix
date: 2026-08-04
audience: everyone
title: "X"
---

Body
`;
  const { entry, issues } = parseEntry({ fileName: '2026-08-04--x.md', source, config: CONFIG });
  assert.equal(entry?.audience, 'all');
  assert.ok(issues.some((i) => i.level === 'warn' && i.message.includes('audience')));
});

test('slugify and entryFileName produce stable file names', () => {
  assert.equal(slugify('Match Replays!'), 'match-replays');
  assert.equal(slugify('Café & Juegos'), 'cafe-juegos');
  assert.equal(entryFileName('2026-08-07', 'match-replays'), '2026-08-07--match-replays.md');
  assert.ok(ENTRY_PATTERN.test('2026-08-07--match-replays.md'));
  assert.equal(ENTRY_PATTERN.test('not-a-date.md'), false);
});

test('isKnownKind validates kinds', () => {
  assert.equal(isKnownKind('feature'), true);
  assert.equal(isKnownKind('fix'), true);
  assert.equal(isKnownKind('bogus'), false);
});
