#!/usr/bin/env node
/**
 * Post-build: palette-quantize the PNGs inside dist/ with pngquant.
 * The flat doodle art survives 256-color quantization visually unchanged,
 * at roughly a quarter of the size. Dimensions are untouched, so rig
 * pixel coordinates stay valid. Sources in assets/ are never modified.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/assets', import.meta.url).pathname;

let before = 0;
let after = 0;

for (const name of readdirSync(DIST)) {
  if (!name.endsWith('.png')) continue;

  const path = join(DIST, name);
  const original = statSync(path).size;

  try {
    execFileSync('pngquant', ['--force', '--skip-if-larger', '--quality=70-95', '--output', path, path]);
  } catch (error) {
    // 98/99 = quality/size skip: keep the original file.
    if (error.status !== 98 && error.status !== 99) throw error;
  }

  before += original;
  after += statSync(path).size;
}

console.log(
  `compress_dist: png ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB`
);
