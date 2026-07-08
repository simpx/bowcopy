import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, type Plugin } from 'vite';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * Dev-only endpoint used by the workbench tuning panel:
 *   POST /__studio/rig/<character-id>  (body: the runtime rig object)
 * writes the body into assets/characters/<id>/rig.json under "runtime",
 * which is the single source of truth the game imports.
 */
const studioRigWriteback = (): Plugin => ({
  name: 'bowcopy-studio-rig-writeback',
  configureServer(server) {
    server.middlewares.use('/__studio/rig', (req, res) => {
      const id = (req.url ?? '').split('?')[0].replace(/^\//, '');
      const rigPath = join(REPO_ROOT, 'assets', 'characters', id, 'rig.json');

      if (req.method !== 'POST' || !/^[a-z0-9-]+$/.test(id) || !existsSync(rigPath)) {
        res.statusCode = 404;
        res.end(JSON.stringify({ ok: false, error: 'unknown character or bad request' }));
        return;
      }

      const chunks: Buffer[] = [];

      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const runtime = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

          if (!runtime || typeof runtime !== 'object' || runtime.id !== id) {
            throw new Error('body must be the runtime rig object with a matching id');
          }

          const rigJson = JSON.parse(readFileSync(rigPath, 'utf-8'));

          rigJson.runtime = runtime;
          writeFileSync(rigPath, `${JSON.stringify(rigJson, null, 2)}\n`, 'utf-8');
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: String(error) }));
        }
      });
    });
  }
});

export default defineConfig({
  plugins: [studioRigWriteback()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: new URL('index.html', import.meta.url).pathname,
        workbench: new URL('workbench.html', import.meta.url).pathname
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
});
