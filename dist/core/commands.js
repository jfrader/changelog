/**
 * Command implementations used by the CLI.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildProject, writeBuildOutputs } from './build.js';
import { entryFileName, slugify, ENTRY_PATTERN } from './entry.js';
import { parseFrontmatter } from './frontmatter.js';
import { findProject, loadConfig, writeConfig, DEFAULT_CONFIG, CONFIG_FILE, entryDirOf, outDirOf } from './project.js';
import { localToday } from '../sdk/seen.js';
import { renderPage } from '../ui/page.js';
import { startServer } from '../server/server.js';
import { ENTRY_TEMPLATE, README_TEMPLATE, RUNBOOK_TEMPLATE, SKILL_TEMPLATE, AGENTS_SNIPPET_TEMPLATE, } from './templates.js';
function today() {
    // Local date: the day the author is on, which is what browsers on the same
    // timezone will consider "today" when tracking what the player has seen.
    return localToday();
}
export async function init(options) {
    const changelogDir = path.join(path.resolve(options.root), 'changelog');
    await fs.mkdir(changelogDir, { recursive: true });
    let config;
    try {
        const existing = await loadConfig(changelogDir);
        config = {
            ...existing,
            ...(options.product ? { product: options.product } : {}),
            ...(options.productName ? { productName: options.productName } : {}),
            ...(options.tagline ? { tagline: options.tagline } : {}),
            ...(options.accent ? { accent: options.accent } : {}),
        };
    }
    catch {
        config = { ...DEFAULT_CONFIG };
    }
    if (!options.force) {
        const existingConfig = await loadConfig(changelogDir);
        if (existingConfig.product !== DEFAULT_CONFIG.product || (await fs.readdir(changelogDir)).length > 0) {
            const configPath = path.join(changelogDir, CONFIG_FILE);
            const hasConfig = await fs
                .access(configPath)
                .then(() => true)
                .catch(() => false);
            if (hasConfig) {
                throw new Error(`A changelog already exists at ${changelogDir}. Re-run with --force to overwrite config and re-create templates.`);
            }
        }
    }
    config.product = options.product ?? config.product;
    config.productName = options.productName ?? config.productName;
    config.tagline = options.tagline ?? config.tagline;
    config.accent = options.accent ?? config.accent;
    await writeConfig(changelogDir, config);
    const entriesDir = path.join(changelogDir, config.entryDir);
    await fs.mkdir(entriesDir, { recursive: true });
    await fs.writeFile(path.join(entriesDir, '.gitkeep'), '', 'utf8');
    const fill = (template) => template.replace(/PRODUCT_NAME/g, config.productName).replace(/PRODUCT/g, config.product);
    await fs.writeFile(path.join(changelogDir, 'README.md'), fill(README_TEMPLATE), 'utf8');
    await fs.writeFile(path.join(changelogDir, 'RUNBOOK.md'), fill(RUNBOOK_TEMPLATE), 'utf8');
    await fs.writeFile(path.join(changelogDir, 'SKILL.md'), fill(SKILL_TEMPLATE), 'utf8');
    await fs.writeFile(path.join(changelogDir, 'AGENTS.snippet.md'), fill(AGENTS_SNIPPET_TEMPLATE), 'utf8');
    const project = await findProject(options.root);
    if (project) {
        const result = await buildProject(project);
        const html = renderPage(result.document);
        await writeBuildOutputs(project, result, html);
    }
    else {
        await fs.writeFile(path.join(changelogDir, 'CHANGELOG.md'), `# Changelog — ${config.productName}\n\nNo published entries yet.\n`, 'utf8');
    }
    return changelogDir;
}
export async function add(options) {
    const project = await findProject(options.root);
    if (!project) {
        throw new Error(`No changelog found at or above ${path.resolve(options.root)}. Run \`changelog init\` first.`);
    }
    const config = project.config;
    const date = options.date ?? today();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Invalid date "${date}" (expected YYYY-MM-DD).`);
    }
    const slug = slugify(options.title);
    const fileName = entryFileName(date, slug);
    const entriesDir = await entryDirOf(project);
    await fs.mkdir(entriesDir, { recursive: true });
    const target = path.join(entriesDir, fileName);
    if (await fs.access(target).then(() => true).catch(() => false)) {
        throw new Error(`Entry already exists: ${target}`);
    }
    const tags = options.tags?.filter(Boolean) ?? [];
    const audience = options.audience ?? 'all';
    const version = options.version ?? '';
    const kind = options.kind;
    const body = options.body?.trim() ?? '';
    const head = [
        '---',
        `kind: ${kind}`,
        `date: ${date}`,
        `title: "${options.title.replace(/"/g, '\\"')}"`,
        `tags: [${tags.join(', ')}]`,
        `audience: ${audience}`,
        `published: ${options.draft ? 'false' : 'true'}`,
        ...(version ? [`version: ${version}`] : []),
        '---',
        '',
    ].join('\n');
    const content = body
        ? `${head}# ${options.title}\n\n${body}\n`
        : `${head}# ${options.title}\n\n${ENTRY_TEMPLATE.split('\n\n').slice(2).join('\n\n').trim()}\n`;
    await fs.writeFile(target, content, 'utf8');
    return target;
}
export async function listEntries(options) {
    const project = await findProject(options.root);
    if (!project)
        return [];
    const entriesDir = await entryDirOf(project);
    let files = [];
    try {
        files = await fs.readdir(entriesDir);
    }
    catch {
        return [];
    }
    const matching = files
        .filter((file) => file.endsWith('.md') && !file.startsWith('.'))
        .sort()
        .reverse()
        .filter((file) => ENTRY_PATTERN.test(file));
    if (options.all)
        return matching;
    const published = [];
    for (const file of matching) {
        try {
            const source = await fs.readFile(path.join(entriesDir, file), 'utf8');
            const parsed = parseFrontmatter(source);
            if (parsed.frontmatter['published'] !== false)
                published.push(file);
        }
        catch {
            // Unreadable or malformed files stay visible so they get fixed.
            published.push(file);
        }
    }
    return published;
}
export async function build(options) {
    const project = await findProject(options.root);
    if (!project) {
        throw new Error(`No changelog found at or above ${path.resolve(options.root)}. Run \`changelog init\` first.`);
    }
    const result = await buildProject(project);
    const html = renderPage(result.document);
    const outputs = await writeBuildOutputs(project, result, html);
    const warnings = result.issues
        .filter((issue) => issue.level === 'warn')
        .map((issue) => `${issue.file ?? ''}: ${issue.message}`);
    const errors = result.issues
        .filter((issue) => issue.level === 'error')
        .map((issue) => `${issue.file ?? ''}: ${issue.message}`);
    return {
        outputs: [outputs.changelogMd, outputs.changelogJson, outputs.indexHtml],
        warnings,
        errors,
        counts: { entries: result.entryCount, published: result.publishedCount },
    };
}
export async function serve(options) {
    const project = await findProject(options.root);
    if (!project) {
        throw new Error(`No changelog found at or above ${path.resolve(options.root)}. Run \`changelog init\` first.`);
    }
    // Ensure the outputs exist so the first request is not a 404.
    try {
        await fs.access(path.join(await outDirOf(project), 'index.html'));
    }
    catch {
        await build({ root: options.root });
    }
    return startServer(project, { port: options.port, host: options.host });
}
//# sourceMappingURL=commands.js.map