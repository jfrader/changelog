#!/usr/bin/env node
import path from 'node:path';
import { add, build, init, listEntries, serve } from './core/commands.js';
import { KIND_ORDER } from './core/types.js';
const VERSION = '0.1.0';
function parseArgs(args) {
    const command = args[0] ?? '';
    const positional = [];
    const flags = {};
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--') {
            positional.push(...args.slice(i + 1));
            break;
        }
        if (arg.startsWith('--')) {
            const eq = arg.indexOf('=');
            if (eq !== -1) {
                flags[arg.slice(2, eq)] = arg.slice(eq + 1);
            }
            else {
                const next = args[i + 1];
                if (next !== undefined && !next.startsWith('--')) {
                    flags[arg.slice(2)] = next;
                    i++;
                }
                else {
                    flags[arg.slice(2)] = true;
                }
            }
        }
        else if (arg.startsWith('-') && arg.length > 1) {
            const name = arg.slice(1);
            const next = args[i + 1];
            if (next !== undefined && !next.startsWith('-')) {
                flags[name] = next;
                i++;
            }
            else {
                flags[name] = true;
            }
        }
        else {
            positional.push(arg);
        }
    }
    return { command, positional, flags };
}
function str(flags, name, fallback = '') {
    const value = flags[name];
    return typeof value === 'string' ? value : fallback;
}
function bool(flags, name) {
    const value = flags[name];
    return value === true || value === 'true' || value === '1';
}
function printHelp() {
    console.log(`changelog ${VERSION} — reusable changelog system

Usage: changelog <command> [options]

Commands:
  init                 Scaffold changelog/ (config, entries/, docs).
       --product slug          Product id (default: from existing config)
       --name "Product Name"   Display name
       --tagline "..."         One-line tagline for the page
       --accent #hex           Accent color for the page
       --root <dir>            Repo root (default: cwd)
       --force                 Re-create config + templates
  add                  Scaffold a new entry.
       --title "..."           Required
       --kind <kind>           feature|improvement|fix|breaking|chore (default: feature)
       --date YYYY-MM-DD       Default: today
       --version x.y.z         Optional
       --tags a,b,c            Optional
       --audience <a>          all|player|manager|guest|admin (default: all)
       --draft                 Create as unpublished
       --body "..."            Optional end-user copy
       --root <dir>
  list                 List entries (--all includes drafts).
  build                Generate CHANGELOG.md, changelog.json, index.html.
       --root <dir>
  serve                Serve the end-user page + JSON.
       --port <n>              Default: 4567 (0 = free port)
       --host <h>              Default: 127.0.0.1
       --root <dir>
  --help, -h           Show this help.
  --version, -v        Print version.
`);
}
function isKind(value) {
    return KIND_ORDER.includes(value);
}
async function main() {
    const { command, positional, flags } = parseArgs(process.argv.slice(2));
    if (command === '--help' || command === '-h' || command === 'help' || command === '') {
        printHelp();
        return;
    }
    if (command === '--version' || command === '-v' || command === 'version') {
        console.log(VERSION);
        return;
    }
    const root = str(flags, 'root', process.cwd());
    switch (command) {
        case 'init': {
            const dir = await init({
                root,
                product: str(flags, 'product') || undefined,
                productName: str(flags, 'name') || undefined,
                tagline: str(flags, 'tagline') || undefined,
                accent: str(flags, 'accent') || undefined,
                force: bool(flags, 'force'),
            });
            console.log(`Initialized changelog at ${dir}`);
            console.log('Next: append changelog/AGENTS.snippet.md to AGENTS.md, then `changelog add --title "..."`.');
            return;
        }
        case 'add': {
            const title = str(flags, 'title', positional[0] ?? '');
            if (!title) {
                console.error('error: --title is required for `add`');
                process.exitCode = 1;
                return;
            }
            const kind = str(flags, 'kind', 'feature');
            if (!isKind(kind)) {
                console.error(`error: invalid kind "${kind}" (expected one of ${KIND_ORDER.join(', ')})`);
                process.exitCode = 1;
                return;
            }
            const target = await add({
                root,
                kind,
                title,
                date: str(flags, 'date') || undefined,
                version: str(flags, 'version') || undefined,
                tags: str(flags, 'tags') ? str(flags, 'tags').split(',').map((t) => t.trim()).filter(Boolean) : undefined,
                audience: str(flags, 'audience') || undefined,
                draft: bool(flags, 'draft'),
                body: str(flags, 'body') || undefined,
            });
            console.log(`Created ${target}`);
            return;
        }
        case 'list': {
            const files = await listEntries({ root, all: bool(flags, 'all') });
            if (files.length === 0) {
                console.log('No entries found.');
                return;
            }
            for (const file of files) {
                console.log(file);
            }
            return;
        }
        case 'build': {
            const result = await build({ root });
            for (const warning of result.warnings)
                console.warn(`warn: ${warning}`);
            for (const error of result.errors)
                console.error(`error: ${error}`);
            for (const output of result.outputs) {
                console.log(`wrote ${path.relative(process.cwd(), output)}`);
            }
            console.log(`built ${result.counts.published}/${result.counts.entries} published entries`);
            if (result.errors.length > 0) {
                console.warn(`${result.errors.length} entry error(s) — those entries were skipped.`);
            }
            return;
        }
        case 'serve': {
            const port = Number(str(flags, 'port', '4567'));
            const host = str(flags, 'host', '127.0.0.1');
            const server = await serve({ root, port: Number.isFinite(port) ? port : 4567, host });
            console.log(`changelog server listening on http://${host}:${server.port}`);
            console.log('  /                end-user page');
            console.log('  /changelog.json  feed');
            console.log('  /api/entries     JSON API');
            console.log('Press Ctrl+C to stop.');
            const stop = async () => {
                await server.close();
                process.exit(0);
            };
            process.on('SIGINT', stop);
            process.on('SIGTERM', stop);
            // The listening server keeps the event loop alive until SIGINT/SIGTERM.
            return;
        }
        default:
            console.error(`error: unknown command "${command}"`);
            printHelp();
            process.exitCode = 1;
    }
}
void main();
//# sourceMappingURL=cli.js.map