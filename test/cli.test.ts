import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { init, build } from '../src/core/commands.ts';
import { parseEntry } from '../src/core/entry.ts';
import { findProject } from '../src/core/project.ts';
import { parseFrontmatter } from '../src/core/frontmatter.ts';

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));

test('CLI --version reports the package version', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')) as {
    version: string;
  };
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['--import', 'tsx', path.join(root, 'src/cli.ts'), '--version'],
    { cwd: root },
  );

  assert.equal(stderr, '');
  assert.equal(stdout.trim(), packageJson.version);
});

test('CLI add preserves configured audiences and warns before storing all for unknown values', async (t) => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'changelog-audiences-'));
  t.after(() => fs.rm(projectRoot, { recursive: true, force: true }));
  const changelogDir = await init({ root: projectRoot, product: 'training', productName: 'Training' });
  const configPath = path.join(changelogDir, 'config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  config.audiences = ['all', 'trainer', 'client'];
  await fs.writeFile(configPath, JSON.stringify(config));

  const runAdd = (title: string, audience?: string) => execFileAsync(process.execPath, [
    '--import', 'tsx', path.join(root, 'src/cli.ts'), 'add',
    '--root', projectRoot, '--title', title, '--kind', 'feature',
    '--date', '2026-08-07', '--body', 'Body',
    ...(audience === undefined ? [] : ['--audience', audience]),
  ], { cwd: root });

  const trainer = await runAdd('Trainer updates', 'trainer');
  assert.equal(trainer.stderr, '');
  const trainerFile = path.join(changelogDir, 'entries/2026-08-07--trainer-updates.md');
  const project = await findProject(projectRoot);
  assert.ok(project);
  const parsed = parseEntry({
    fileName: path.basename(trainerFile),
    source: await fs.readFile(trainerFile, 'utf8'),
    config: project.config,
  });
  assert.equal(parsed.entry?.audience, 'trainer');
  assert.deepEqual(parsed.issues, []);

  const invalid = await runAdd('Unknown updates', 'player');
  const invalidFile = path.join(changelogDir, 'entries/2026-08-07--unknown-updates.md');
  assert.equal(parseFrontmatter(await fs.readFile(invalidFile, 'utf8')).frontmatter['audience'], 'all');
  const handwritten = parseEntry({
    fileName: path.basename(invalidFile),
    source: (await fs.readFile(invalidFile, 'utf8')).replace('audience: "all"', 'audience: player'),
    config: project.config,
  });
  assert.equal(invalid.stderr.trim(), `warn: ${handwritten.issues[0].message}`);
  assert.match(invalid.stderr, /expected one of all, trainer, client/);
  assert.ok(!invalid.stderr.includes('manager'));

  const defaults = await runAdd('General updates');
  assert.equal(defaults.stderr, '');
  const result = await build({ root: projectRoot });
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.errors, []);
  const document = JSON.parse(await fs.readFile(path.join(changelogDir, 'changelog.json'), 'utf8'));
  assert.deepEqual(document.entries.map((entry: { audience: string }) => entry.audience).sort(), ['all', 'all', 'trainer']);
});
