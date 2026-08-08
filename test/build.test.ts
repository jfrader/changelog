import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { init, add, build, listEntries } from '../src/core/commands.ts';
import { findProject } from '../src/core/project.ts';
import { renderPage } from '../src/ui/page.ts';
import { renderMarkdown } from '../src/core/render-md.ts';

async function makeRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'changelog-test-'));
}

test('full init → add → build → serve-less flow', async () => {
  const root = await makeRoot();
  await init({ root, product: 'mifulbo', productName: 'MiFulbo', tagline: 'What is new', accent: '#22c55e' });

  const project = await findProject(root);
  assert.ok(project, 'project should be found by walking up');
  assert.equal(project.config.product, 'mifulbo');

  // init wrote the docs
  for (const file of ['README.md', 'RUNBOOK.md', 'SKILL.md', 'AGENTS.snippet.md', 'CHANGELOG.md', 'config.json']) {
    await fs.access(path.join(project.changelogDir, file));
  }

  const first = await add({
    root,
    kind: 'feature',
    title: 'Match replays',
    date: '2026-08-07',
    tags: ['match', 'replay'],
    version: '0.2.0',
    body: 'Rewatch every settled match from the report.',
  });
  assert.match(first, /2026-08-07--match-replays\.md$/);

  const second = await add({
    root,
    kind: 'fix',
    title: 'Auction closes on time',
    date: '2026-08-06',
    draft: true,
    body: 'Pending verification.',
  });
  assert.match(second, /2026-08-06--auction-closes-on-time\.md$/);

  const listed = await listEntries({ root });
  assert.equal(listed.length, 1, 'drafts are hidden by default');
  const all = await listEntries({ root, all: true });
  assert.equal(all.length, 2);

  const result = await build({ root });
  assert.equal(result.counts.entries, 2);
  assert.equal(result.counts.published, 1);
  assert.equal(result.errors.length, 0);
  assert.equal(result.outputs.length, 3);

  const md = await fs.readFile(path.join(project.changelogDir, 'CHANGELOG.md'), 'utf8');
  assert.match(md, /Match replays/);
  assert.ok(!md.includes('Auction closes on time'), 'draft must not appear in markdown');
  assert.match(md, /2026-08-07/);

  const json = JSON.parse(await fs.readFile(path.join(project.changelogDir, 'changelog.json'), 'utf8'));
  assert.equal(json.product, 'mifulbo');
  assert.equal(json.entries.length, 1, 'drafts must not leak through the public JSON feed');
  assert.equal(json.entries[0].published, true);
  // newest first
  assert.equal(json.entries[0].date, '2026-08-07');

  const html = await fs.readFile(path.join(project.changelogDir, 'index.html'), 'utf8');
  assert.match(html, /changelog-data/);
  assert.match(html, /Match replays/);
  assert.ok(!html.includes('Auction closes on time'), 'draft must not be embedded in the page payload');
  assert.match(html, /function readPreference\(key\) \{\s+try \{/u);
  assert.match(html, /function writePreference\(key, value\) \{\s+try \{/u);
  assert.match(html, /#22c55e/);
});

test('build reports issues and skips invalid entries', async () => {
  const root = await makeRoot();
  await init({ root, product: 'x', productName: 'X' });
  const project = await findProject(root);
  const entriesDir = path.join(project!.changelogDir, 'entries');
  await fs.writeFile(
    path.join(entriesDir, 'broken.md'),
    'This file has no frontmatter, no kind, no date.\n',
    'utf8',
  );
  const result = await build({ root });
  assert.ok(result.errors.length >= 1, 'broken entry should produce errors');
  assert.equal(result.counts.published, 0);
});

test('renderPage embeds JSON safely', async () => {
  const document = {
    schema: 1,
    product: 'x',
    productName: 'X',
    tagline: 't',
    accent: '#000000',
    generatedAt: new Date().toISOString(),
    entries: [
      {
        id: 'a',
        kind: 'feature' as const,
        title: '</script><script>alert(1)</script>',
        body: 'safe',
        date: '2026-08-07',
        product: 'x',
        productName: 'X',
        tags: [],
        audience: 'all' as const,
        published: true,
        fileName: 'a.md',
        relPath: 'entries/a.md',
      },
    ],
  };
  const html = renderPage(document);
  assert.ok(!html.includes('</script><script>alert'), 'script tag must be escaped in embedded JSON');
  assert.ok(html.includes('<\\/script>'));
});

test('renderMarkdown groups by date newest first', () => {
  const document = {
    schema: 1,
    product: 'x',
    productName: 'X',
    tagline: 't',
    accent: '#000',
    generatedAt: new Date().toISOString(),
    entries: [
      { id: 'old', kind: 'fix' as const, title: 'Old fix', body: '', date: '2026-08-01', product: 'x', productName: 'X', tags: [], audience: 'all' as const, published: true, fileName: 'a.md', relPath: 'a.md' },
      { id: 'new', kind: 'feature' as const, title: 'New feature', body: 'Body', date: '2026-08-07', product: 'x', productName: 'X', tags: ['t'], audience: 'all' as const, published: true, fileName: 'b.md', relPath: 'b.md' },
    ],
  };
  const md = renderMarkdown(document);
  const newIndex = md.indexOf('New feature');
  const oldIndex = md.indexOf('Old fix');
  assert.ok(newIndex !== -1 && oldIndex !== -1 && newIndex < oldIndex);
});
