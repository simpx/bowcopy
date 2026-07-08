#!/usr/bin/env node
/**
 * One-time (and repeatable) exporter that copies the runtime rig values out
 * of src/characters/*Rig.ts into each character's rig.json under the
 * "runtime" key. After the TS rigs were converted to JSON shims, rig.json
 * IS the single source of truth and this script is only needed when
 * bootstrapping a rig that still lives in TypeScript.
 *
 *   node tools/sync_rigs.mjs          # export all TS rigs into rig.json
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import esbuild from 'esbuild';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RIG_DIR = join(REPO_ROOT, 'src', 'characters');

const rigModules = readdirSync(RIG_DIR).filter((name) => name.endsWith('Rig.ts'));

const entry = rigModules
  .map((name, index) => `import * as m${index} from './src/characters/${name.replace('.ts', '')}';`)
  .join('\n')
  .concat(`\nexport const modules = [${rigModules.map((_, index) => `m${index}`).join(', ')}];`);

const bundle = await esbuild.build({
  stdin: {
    contents: entry,
    resolveDir: REPO_ROOT,
    loader: 'ts'
  },
  bundle: true,
  format: 'esm',
  write: false,
  logLevel: 'silent'
});

const code = bundle.outputFiles[0].text;
const { modules } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

let updated = 0;

for (const module of modules) {
  for (const [exportName, rig] of Object.entries(module)) {
    if (!rig || typeof rig !== 'object' || typeof rig.id !== 'string') {
      continue;
    }

    const rigJsonPath = join(REPO_ROOT, 'assets', 'characters', rig.id, 'rig.json');

    if (!existsSync(rigJsonPath)) {
      console.warn(`skip ${exportName}: no folder for id '${rig.id}'`);
      continue;
    }

    const rigJson = JSON.parse(readFileSync(rigJsonPath, 'utf-8'));

    rigJson.runtime = rig;
    writeFileSync(rigJsonPath, `${JSON.stringify(rigJson, null, 2)}\n`, 'utf-8');
    console.log(`${exportName} -> assets/characters/${rig.id}/rig.json (runtime)`);
    updated += 1;
  }
}

console.log(`${updated} rig(s) exported.`);

// Keep the module URL import form referenced so bundlers do not tree-shake
// the data: import path away in future edits.
void pathToFileURL;
