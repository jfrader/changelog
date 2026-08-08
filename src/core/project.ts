/**
 * Locating a project's `changelog/` folder and loading its config.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ChangelogConfig, ChangelogProject } from './types.js';

export const DEFAULT_CONFIG: ChangelogConfig = {
  product: 'app',
  productName: 'App',
  tagline: 'What is new and what we fixed',
  accent: '#22c55e',
  languages: ['en'],
  defaultLanguage: 'en',
  entryDir: 'entries',
  outDir: '.',
};

export const CONFIG_FILE = 'config.json';

export async function configExists(changelogDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(changelogDir, CONFIG_FILE));
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(changelogDir: string): Promise<ChangelogConfig> {
  try {
    const raw = await fs.readFile(path.join(changelogDir, CONFIG_FILE), 'utf8');
    const parsed = JSON.parse(raw) as Partial<ChangelogConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      entryDir: parsed.entryDir ?? DEFAULT_CONFIG.entryDir,
      outDir: parsed.outDir ?? DEFAULT_CONFIG.outDir,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function writeConfig(changelogDir: string, config: ChangelogConfig): Promise<void> {
  await fs.mkdir(changelogDir, { recursive: true });
  await fs.writeFile(path.join(changelogDir, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

/**
 * Find the changelog root for the current working directory. Walks up until it
 * finds a `changelog/` folder, or falls back to `cwd`.
 */
export async function findProject(startDir: string = process.cwd()): Promise<ChangelogProject | null> {
  let dir = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(dir, 'changelog');
    if (await configExists(candidate)) {
      const config = await loadConfig(candidate);
      return { root: dir, changelogDir: candidate, config };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export async function entryDirOf(project: ChangelogProject): Promise<string> {
  return path.join(project.changelogDir, project.config.entryDir);
}

export async function outDirOf(project: ChangelogProject): Promise<string> {
  return path.join(project.changelogDir, project.config.outDir);
}
