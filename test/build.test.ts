import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { init, add, build, listEntries } from '../src/core/commands.ts';
import { findProject } from '../src/core/project.ts';
import { renderPage } from '../src/ui/page.ts';
import { renderMarkdown } from '../src/core/render-md.ts';
import type { ChangelogDocument } from '../src/core/types.ts';

async function makeRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'changelog-test-'));
}

class PageElement {
  textContent = '';
  innerHTML = '';
  className = '';
  value = '';
  placeholder = '';
  dataset: Record<string, string> = {};
  children: PageElement[] = [];
  style = { setProperty: (_name: string, _value: string) => undefined };
  private readonly attributes = new Map<string, string>();

  appendChild(child: PageElement): PageElement {
    this.children.push(child);
    return child;
  }

  addEventListener(): void {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

function runStandalonePage(
  document: ChangelogDocument,
  browserLanguages: string[] = ['en'],
): { content: string; pageTitle: string; homeLabel?: string } {
  const page = renderPage(document);
  const dataSource = page.match(
    /<script type="application\/json" id="changelog-data">([\s\S]*?)<\/script>/u,
  )?.[1];
  const scripts = [...page.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/gu)];
  const runtime = scripts.at(-1)?.[1];
  assert.ok(dataSource);
  assert.ok(runtime);

  const elements = new Map<string, PageElement>();
  const elementIds = [
    'changelog-data',
    'content',
    'filters',
    'hero-eyebrow',
    'page-title',
    'search',
    'page-footer',
    'langs',
    'summary',
    'theme-toggle',
  ];
  // The back-link label only exists when the page rendered a home link.
  if (page.includes('id="home-label"')) elementIds.push('home-label');
  for (const id of elementIds) {
    elements.set(id, new PageElement());
  }
  elements.get('changelog-data')!.textContent = dataSource;

  const documentElement = new PageElement();
  const browserDocument = {
    documentElement,
    getElementById: (id: string) => elements.get(id),
    createElement: () => new PageElement(),
    createTextNode: (text: string) => Object.assign(new PageElement(), { textContent: text }),
  };

  vm.runInNewContext(runtime, {
    document: browserDocument,
    getComputedStyle: () => ({ getPropertyValue: () => '#000000' }),
    localStorage: { getItem: () => null, setItem: () => undefined },
    navigator: { language: browserLanguages.at(-1) ?? 'en', languages: browserLanguages },
    URL,
    window: { matchMedia: () => ({ matches: false }) },
  });

  return {
    content: elements.get('content')!.innerHTML,
    pageTitle: elements.get('page-title')!.textContent,
    homeLabel: elements.get('home-label')?.textContent,
  };
}

function standaloneDocument(
  entry: Partial<ChangelogDocument['entries'][number]>,
): ChangelogDocument {
  return {
    schema: 1,
    product: 'x',
    productName: 'X',
    tagline: 't',
    accent: '#000000',
    generatedAt: '2026-08-08T00:00:00.000Z',
    languages: ['en'],
    defaultLanguage: 'en',
    entries: [
      {
        id: 'safe-rendering',
        kind: 'fix',
        title: 'Safe rendering',
        body: '',
        date: '2026-08-08',
        product: 'x',
        productName: 'X',
        tags: [],
        audience: 'all',
        published: true,
        fileName: 'safe-rendering.md',
        relPath: 'entries/safe-rendering.md',
        ...entry,
      },
    ],
  };
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
  const skill = await fs.readFile(path.join(project.changelogDir, 'SKILL.md'), 'utf8');
  assert.match(skill, /`kind` controls the category shown/u);
  assert.match(skill, /material simulation-engine behavior/u);
  assert.match(skill, /`tags` only describe topics/u);

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

test('standalone page keeps language and theme controls in the header corner', () => {
  const html = renderPage(standaloneDocument({}));

  const hero = html.match(/<header class="hero">([\s\S]*?)<\/header>/u)?.[1];
  const toolbar = html.match(/<nav class="toolbar">([\s\S]*?)<\/nav>/u)?.[1];
  assert.ok(hero?.includes('id="langs"'), 'language controls live in the header');
  assert.ok(hero?.includes('id="theme-toggle"'), 'theme toggle lives in the header');
  assert.ok(toolbar, 'toolbar is present');
  assert.ok(!toolbar.includes('id="langs"'), 'toolbar keeps only filters and search');
  assert.ok(!toolbar.includes('theme-toggle'), 'toolbar keeps only filters and search');

  assert.match(html, /\.hero-top \{ display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; \}/u);
  assert.match(html, /\.hero-controls \{ display: flex; align-items: center; gap: 8px; flex: none; \}/u);
  assert.match(html, /\.eyebrow \{\s+display: inline-flex; align-items: center; gap: 8px;\s+min-width: 0; overflow-wrap: anywhere;/u);
  assert.match(html, /\.search \{\s+margin-left: auto; flex: 1 1 180px; min-width: 0; max-width: 260px; height: 36px;/u);
  assert.match(html, /@media \(max-width: 620px\) \{[\s\S]*?\.toolbar-inner \{\s+display: grid; grid-template-columns: minmax\(0, 1fr\); gap: 10px; align-items: center;/u);
  assert.match(html, /\.filters \{ grid-row: 1; \}/u);
  assert.match(html, /\.search \{\s+grid-row: 2; width: 100%; max-width: none; height: 40px;\s+margin-left: 0; flex: none;/u);
  assert.match(html, /\.lang, \.theme-toggle \{ height: 40px; \}/u);
  assert.ok(!html.includes('grid-row: 3'), 'controls no longer wrap to a third toolbar row');
});

test('standalone page links back to the product only when homeUrl is safe', () => {
  const plain = renderPage(standaloneDocument({}));
  assert.ok(!plain.includes('id="home-link"'), 'no back link without homeUrl');

  const linked = standaloneDocument({});
  linked.homeUrl = '/diario';
  const html = renderPage(linked);
  assert.match(html, /<a class="back" id="home-link" href="\/diario">/u);
  assert.match(html, /id="home-label">Back</u);
  assert.match(html, /\.back \{\s+display: inline-flex; align-items: center; gap: 6px;/u);

  linked.homeUrl = 'https://example.test/home';
  assert.match(renderPage(linked), /href="https:\/\/example\.test\/home"/u);

  for (const unsafe of ['javascript:alert(1)', 'data:text/html,boom', '//evil.test/', 'not a url']) {
    linked.homeUrl = unsafe;
    assert.ok(!renderPage(linked).includes('id="home-link"'), `${unsafe} must not render a link`);
  }
});

test('back link label follows the page language', () => {
  const document = standaloneDocument({});
  document.languages = ['en', 'es'];
  document.homeUrl = '/';

  assert.equal(runStandalonePage(document, ['en-US']).homeLabel, 'Back');
  assert.equal(runStandalonePage(document, ['es-AR']).homeLabel, 'Volver');
});

test('build carries homeUrl into the feed and the page', async () => {
  const root = await makeRoot();
  await init({ root, product: 'x', productName: 'X' });
  const project = await findProject(root);
  const configPath = path.join(project!.changelogDir, 'config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  config.homeUrl = '/';
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  await build({ root });

  const json = JSON.parse(await fs.readFile(path.join(project!.changelogDir, 'changelog.json'), 'utf8'));
  assert.equal(json.homeUrl, '/');
  const html = await fs.readFile(path.join(project!.changelogDir, 'index.html'), 'utf8');
  assert.match(html, /id="home-link" href="\/"/u);
});

test('standalone page sanitizes markdown link destinations', () => {
  const { content } = runStandalonePage(
    standaloneDocument({
      body: [
        '[Safe](https://example.test/docs)',
        '[Attribute](https://example.test/" autofocus onfocus="alert)',
        '[Script](javascript:alert)',
        '[Data](data:text/html,boom)',
      ].join(' '),
    }),
  );
  assert.match(content, /<a href="https:\/\/example\.test\/docs"/u);
  assert.ok(
    !content.includes('href="https://example.test/" autofocus onfocus="alert"'),
    'quotes in destinations must stay inside the href attribute',
  );
  assert.match(
    content,
    /href="https:\/\/example\.test\/&quot; autofocus onfocus=&quot;alert"/u,
  );
  assert.ok(!content.includes('<a href="javascript:'), 'script URLs must render without a link');
  assert.ok(!content.includes('<a href="data:'), 'data URLs must render without a link');
});

test('standalone page escapes entry versions before rendering', () => {
  const { content } = runStandalonePage(
    standaloneDocument({ version: '1.1.3</span><img src=x onerror=alert(1)>' }),
  );
  assert.ok(!content.includes('<img'), 'version metadata must not create HTML elements');
  assert.match(content, /v1\.1\.3&lt;\/span&gt;&lt;img src=x onerror=alert\(1\)&gt;/u);
});

test('standalone page follows the first supported ordered browser language', () => {
  const document = standaloneDocument({
    languages: ['en', 'es'],
    titleByLang: { en: 'Safe rendering', es: 'Contenido seguro' },
    bodyByLang: { en: '', es: '' },
  });
  document.languages = ['en', 'es'];

  const rendered = runStandalonePage(document, ['fr-FR', 'es-AR', 'en-US']);

  assert.equal(rendered.pageTitle, 'Novedades');
  assert.match(rendered.content, /Contenido seguro/u);
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
