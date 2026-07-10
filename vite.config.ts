import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ServerResponse } from 'node:http';

import { defineConfig, type Connect, type Plugin } from 'vite';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * Review-note endpoint used by the workbench cards (dev and preview servers):
 *   POST /__studio/note/<character-id>  (body: { note: string })
 * appends the note to assets/characters/review-inbox.md — a git-ignored
 * scratch inbox of raw human review feedback: free-text comments and rig
 * tuning proposals alike. Humans never write rig.json/brief.md directly;
 * the AI reads the inbox and selectively applies accepted changes.
 */
const handleReviewNote = (req: Connect.IncomingMessage, res: ServerResponse) => {
  const id = (req.url ?? '').split('?')[0].replace(/^\//, '');
  const characterDir = join(REPO_ROOT, 'assets', 'characters', id);
  const inboxPath = join(REPO_ROOT, 'assets', 'characters', 'review-inbox.md');

  // 'eye-templates' / 'audio' are pseudo-targets for feedback on shared
  // eye assets and the audio audition page respectively.
  if (
    req.method !== 'POST' ||
    !/^[a-z0-9-]+$/.test(id) ||
    (id !== 'eye-templates' && id !== 'audio' && !existsSync(characterDir))
  ) {
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: 'unknown character or bad request' }));
    return;
  }

  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const { note } = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { note?: unknown };

      if (typeof note !== 'string' || note.trim().length === 0) {
        throw new Error('body must be { note: string } with a non-empty note');
      }

      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const entry = `- [${stamp}] ${id}: ${note.trim().replace(/\s+/g, ' ')}`;
      const header = existsSync(inboxPath)
        ? ''
        : '# Review inbox(生成物,不进 git)\n\n人工评审的原始意见,待讨论后才形成决策落进 brief.md/rig.json。\n\n';

      appendFileSync(inboxPath, `${header}${entry}\n`, 'utf-8');
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, entry }));
    } catch (error) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: String(error) }));
    }
  });
};

const ASSET_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac'
};

/**
 * Preview-only static serving for /assets/characters/*: the dev server serves
 * repo files natively, but `vite preview` only serves dist/, which would 404
 * the workbench's base.png / comparison.png / brief.md / qc-report.json.
 */
const handleRepoAsset = (
  base: string
): ((req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => void) => (
  req,
  res,
  next
) => {
  const relative = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\//, '');
  const filePath = join(REPO_ROOT, 'assets', base, relative);

  if (req.method !== 'GET' || relative.includes('..') || !existsSync(filePath) || !statSync(filePath).isFile()) {
    next();
    return;
  }

  res.setHeader(
    'content-type',
    ASSET_CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  );
  res.end(readFileSync(filePath));
};

const studioReviewInbox = (): Plugin => ({
  name: 'bowcopy-studio-review-inbox',
  configureServer(server) {
    server.middlewares.use('/__studio/note', handleReviewNote);
  },
  configurePreviewServer(server) {
    server.middlewares.use('/__studio/note', handleReviewNote);
    server.middlewares.use('/assets/characters', handleRepoAsset('characters'));
    server.middlewares.use('/assets/audio', handleRepoAsset('audio'));
    // Hashed build assets never change: let phones cache them so repeat
    // visits don't re-download megabytes. The HTML shell must never be
    // cached, or a stale page would reference deleted hashed files.
    server.middlewares.use('/assets', (_req, res, next) => {
      res.setHeader('cache-control', 'public, max-age=31536000, immutable');
      next();
    });
    server.middlewares.use((req, res, next) => {
      const path = (req.url ?? '').split('?')[0];

      if (path === '/' || path.endsWith('.html')) {
        res.setHeader('cache-control', 'no-cache');
      }

      next();
    });
  }
});

export default defineConfig({
  // GitHub Pages serves the game at /<repo>/ — CI sets DEPLOY_BASE.
  base: process.env.DEPLOY_BASE ?? '/',
  plugins: [studioReviewInbox()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: new URL('index.html', import.meta.url).pathname,
        workbench: new URL('workbench.html', import.meta.url).pathname,
        audition: new URL('audition.html', import.meta.url).pathname
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.nip.io', '.sslip.io'],
    port: 4173
  }
});
