import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { add, build, init } from '../src/core/commands.ts';
import { findProject } from '../src/core/project.ts';
import { startServer } from '../src/server/server.ts';

test('the raw-entry route never serves drafts', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'changelog-server-test-'));
  await init({ root, product: 'x', productName: 'X' });
  const published = await add({
    root,
    title: 'Published note',
    kind: 'feature',
    date: '2026-08-08',
    body: 'Visible.',
  });
  const draft = await add({
    root,
    title: 'Private draft',
    kind: 'feature',
    date: '2026-08-08',
    body: 'Secret.',
    draft: true,
  });
  await build({ root });
  const project = await findProject(root);
  assert.ok(project);
  const server = await startServer(project, { host: '127.0.0.1', port: 0 });

  try {
    const base = `http://127.0.0.1:${server.port}/entries/`;
    assert.equal((await fetch(base + path.basename(published))).status, 200);
    assert.equal((await fetch(base + path.basename(draft))).status, 404);

    const changedSource = (await fs.readFile(published, 'utf8'))
      .replace('published: true', 'published: false')
      .replace('Visible.', 'A secret added after the last build.');
    await fs.writeFile(published, changedSource, 'utf8');
    assert.equal(
      (await fetch(base + path.basename(published))).status,
      404,
      'live draft state must win over a stale built allowlist',
    );
  } finally {
    await server.close();
  }
});
