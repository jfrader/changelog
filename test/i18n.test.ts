import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry, parseBodyLanguageSections } from '../src/core/entry.ts';
import { localize } from '../src/sdk/seen.ts';
import { DEFAULT_CONFIG } from '../src/core/project.ts';

const CONFIG = {
  ...DEFAULT_CONFIG,
  product: 'mifulbo',
  productName: 'MiFulbo',
  languages: ['en', 'es'],
  defaultLanguage: 'en',
};

test('parseBodyLanguageSections splits marked sections and unmarked default', () => {
  const body = `Leading default content.\n\n## es\nContenido en español.\n\n## en\nEnglish again.\n`;
  const { byLang, order } = parseBodyLanguageSections(body, 'en');
  assert.equal(byLang['en'], 'Leading default content.\n\nEnglish again.');
  assert.equal(byLang['es'], 'Contenido en español.');
  assert.deepEqual(order, ['en', 'es']);
});

test('parses a bilingual entry with frontmatter titles and body sections', () => {
  const source = `---
kind: feature
date: 2026-08-07
title.en: "Match replays"
title.es: "Repeticiones"
tags: [match]
---

## en

Rewatch every settled match.

## es

Volvé a ver todos los partidos.
`;
  const { entry, issues } = parseEntry({
    fileName: '2026-08-07--match-replays.md',
    source,
    config: CONFIG,
  });
  assert.equal(issues.length, 0);
  assert.equal(entry?.title, 'Match replays'); // default language
  assert.equal(entry?.body, 'Rewatch every settled match.');
  assert.deepEqual(entry?.languages, ['en', 'es']);
  assert.equal(entry?.titleByLang['es'], 'Repeticiones');
  assert.equal(entry?.bodyByLang['es'], 'Volvé a ver todos los partidos.');
});

test('legacy single-language entries stay default-language', () => {
  const source = `---
kind: fix
date: 2026-08-06
title: "Auction closes on time"
---

The auction extension now finishes before kickoff.
`;
  const { entry, issues } = parseEntry({
    fileName: '2026-08-06--auction.md',
    source,
    config: CONFIG,
  });
  assert.equal(issues.length, 0);
  assert.deepEqual(entry?.languages, ['en']);
  assert.equal(entry?.bodyByLang['en'], 'The auction extension now finishes before kickoff.');
  assert.equal(entry?.body, 'The auction extension now finishes before kickoff.');
});

test('a section heading can serve as that language title', () => {
  const source = `---
kind: feature
date: 2026-08-07
---

## en

# Match replays

Rewatch every settled match.

## es

# Repeticiones

Volvé a ver todos los partidos.
`;
  const { entry } = parseEntry({ fileName: '2026-08-07--x.md', source, config: CONFIG });
  assert.equal(entry?.title, 'Match replays');
  assert.equal(entry?.titleByLang['es'], 'Repeticiones');
  assert.equal(entry?.bodyByLang['en'], 'Rewatch every settled match.');
});

test('unknown language in title or section warns', () => {
  const source = `---
kind: feature
date: 2026-08-07
title: "X"
title.de: "Y"
---

## de

Deutsch.
`;
  const { issues } = parseEntry({ fileName: '2026-08-07--x.md', source, config: CONFIG });
  const warns = issues.filter((i) => i.level === 'warn').map((i) => i.message);
  assert.ok(warns.some((m) => m.includes('Unknown language "de" in title')));
  assert.ok(warns.some((m) => m.includes('Unknown language section "## de"')));
});

test('localize picks the language and falls back to default', () => {
  const source = `---
kind: feature
date: 2026-08-07
title.en: "Match replays"
title.es: "Repeticiones"
---

## en

Rewatch every settled match.

## es

Volvé a ver todos los partidos.
`;
  const { entry } = parseEntry({ fileName: '2026-08-07--x.md', source, config: CONFIG });
  assert.ok(entry);
  assert.deepEqual(localize(entry, 'es'), { title: 'Repeticiones', body: 'Volvé a ver todos los partidos.' });
  assert.deepEqual(localize(entry, 'de'), { title: 'Match replays', body: 'Rewatch every settled match.' });
  assert.deepEqual(localize(entry, 'en'), { title: 'Match replays', body: 'Rewatch every settled match.' });
});
