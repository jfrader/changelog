/**
 * Tiny zero-dependency backend that serves the end-user changelog page and
 * the built JSON. Read-only by design: entries are edited in git, built, then
 * served.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseEntry } from '../core/entry.js';
import type { ChangelogProject } from '../core/types.js';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

export interface ServeOptions {
  port: number;
  host: string;
}

export async function startServer(project: ChangelogProject, options: ServeOptions): Promise<{ port: number; close: () => Promise<void> }> {
  const outDir = path.join(project.changelogDir, project.config.outDir);
  const entryDir = path.join(project.changelogDir, project.config.entryDir);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);

      if (pathname === '/api/health') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, product: project.config.product, time: new Date().toISOString() }));
        return;
      }

      if (pathname === '/api/entries') {
        const json = await fs.readFile(path.join(outDir, 'changelog.json'), 'utf8');
        res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
        res.end(json);
        return;
      }

      if (pathname.startsWith('/entries/')) {
        const rel = pathname.slice('/entries/'.length);
        const safe = path.basename(rel);
        if (safe !== rel || !safe.endsWith('.md')) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        const document = JSON.parse(
          await fs.readFile(path.join(outDir, 'changelog.json'), 'utf8'),
        ) as { entries?: Array<{ fileName?: string; published?: boolean }> };
        const isPublished = document.entries?.some(
          (entry) => entry.fileName === safe && entry.published !== false,
        );
        if (!isPublished) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        const file = path.join(entryDir, safe);
        let source: string;
        try {
          source = await fs.readFile(file, 'utf8');
        } catch {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        const current = parseEntry({ fileName: safe, source, config: project.config });
        if (
          !current.entry?.published ||
          current.issues.some((issue) => issue.level === 'error')
        ) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'content-type': MIME['.md'], 'cache-control': 'no-store' });
        res.end(source);
        return;
      }

      let filePath: string;
      if (
        pathname === '/' ||
        pathname === '/index.html' ||
        pathname === '/changelog' ||
        pathname === '/changelog/' ||
        pathname === '/changelog/index.html'
      ) {
        filePath = path.join(outDir, 'index.html');
      } else {
        filePath = path.join(outDir, pathname);
      }

      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(outDir))) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      let body: Buffer;
      try {
        body = await fs.readFile(resolved);
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found — run `changelog build` first.');
        return;
      }

      const ext = path.extname(resolved).toLowerCase();
      res.writeHead(200, {
        'content-type': MIME[ext] ?? 'application/octet-stream',
        'cache-control': pathname === '/changelog.json' ? 'no-store' : 'public, max-age=60',
      });
      res.end(body);
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`Server error: ${String(error)}`);
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server failed to bind an address');
  }
  const actualPort = address.port;

  return {
    port: actualPort,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
