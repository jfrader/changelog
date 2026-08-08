import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
