/**
 * Core build: aggregate entries into a document, then render Markdown and JSON.
 */
import path from 'node:path';
import { readEntries } from './entry.js';
import { renderMarkdown } from './render-md.js';
import type { ChangelogDocument, ChangelogProject, BuildResult } from './types.js';

export async function buildProject(project: ChangelogProject): Promise<BuildResult> {
  const entryDir = path.join(project.changelogDir, project.config.entryDir);
  const { entries, issues } = await readEntries(entryDir, project.config);

  const publishedCount = entries.filter((entry) => entry.published).length;
  const skippedCount = entries.length - publishedCount;
  const publishedEntries = entries.filter((entry) => entry.published);

  const document: ChangelogDocument = {
    schema: 1,
    product: project.config.product,
    productName: project.config.productName,
    tagline: project.config.tagline,
    accent: project.config.accent,
    languages: project.config.languages,
    defaultLanguage: project.config.defaultLanguage,
    generatedAt: new Date().toISOString(),
    entries: publishedEntries,
  };

  return {
    document,
    issues,
    markdown: renderMarkdown(document),
    entryCount: entries.length,
    publishedCount,
    skippedCount,
  };
}

export async function writeBuildOutputs(
  project: ChangelogProject,
  result: BuildResult,
  html: string,
): Promise<{ changelogMd: string; changelogJson: string; indexHtml: string }> {
  const outDir = path.join(project.changelogDir, project.config.outDir);
  const { mkdir } = await import('node:fs/promises');
  await mkdir(outDir, { recursive: true });

  const changelogMd = path.join(outDir, 'CHANGELOG.md');
  const changelogJson = path.join(outDir, 'changelog.json');
  const indexHtml = path.join(outDir, 'index.html');

  const { writeFile } = await import('node:fs/promises');
  await writeFile(changelogMd, result.markdown, 'utf8');
  await writeFile(changelogJson, `${JSON.stringify(result.document, null, 2)}\n`, 'utf8');
  await writeFile(indexHtml, html, 'utf8');

  return { changelogMd, changelogJson, indexHtml };
}
