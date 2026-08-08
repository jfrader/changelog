import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, serializeFrontmatter } from '../src/core/frontmatter.ts';

test('parses scalars, booleans, numbers and tag lists', () => {
  const source = `---
kind: feature
date: 2026-08-07
title: "Match replays"
tags: [match, replay, "two words"]
published: true
version: 0.1.0
count: 3
---

Body here
`;
  const { frontmatter, body, hasFrontmatter } = parseFrontmatter(source);
  assert.equal(hasFrontmatter, true);
  assert.equal(frontmatter['kind'], 'feature');
  assert.equal(frontmatter['date'], '2026-08-07');
  assert.equal(frontmatter['title'], 'Match replays');
  assert.deepEqual(frontmatter['tags'], ['match', 'replay', 'two words']);
  assert.equal(frontmatter['published'], true);
  assert.equal(frontmatter['version'], '0.1.0');
  assert.equal(frontmatter['count'], 3);
  assert.equal(body.trim(), 'Body here');
});

test('missing frontmatter returns empty fields', () => {
  const { frontmatter, body, hasFrontmatter } = parseFrontmatter('# Just a heading\n\nText');
  assert.equal(hasFrontmatter, false);
  assert.deepEqual(frontmatter, {});
  assert.match(body, /^# Just a heading/);
});

test('handles empty values as undefined and skips comments', () => {
  const source = `---
kind: fix
# a comment
date:
---

Body
`;
  const { frontmatter } = parseFrontmatter(source);
  assert.equal(frontmatter['kind'], 'fix');
  assert.equal(frontmatter['date'], undefined);
});

test('serialize round-trips arrays, booleans and quoted strings', () => {
  const fields = {
    kind: 'feature',
    tags: ['a', 'b'],
    published: true,
    title: 'Has: colon',
  };
  const serialized = serializeFrontmatter(fields);
  const { frontmatter } = parseFrontmatter(serialized);
  assert.deepEqual(frontmatter['tags'], ['a', 'b']);
  assert.equal(frontmatter['published'], true);
  assert.equal(frontmatter['title'], 'Has: colon');
});
