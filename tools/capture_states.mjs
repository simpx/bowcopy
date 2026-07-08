#!/usr/bin/env node
/**
 * Captures runtime state screenshots for character review.
 *
 * Drives the workbench focus page (real game sim + renderers) through the
 * window.__workbench automation hooks and saves key states — spawn, move,
 * attack, hit, death (player: dodge) — into the character folder:
 *
 *   assets/characters/<id>/playtest/states/<state>.png
 *
 * This is how the agent "sees" its own output before asking a human to
 * review. Usage:
 *
 *   node tools/capture_states.mjs red-shroom            # one character
 *   node tools/capture_states.mjs --all                 # every slot
 *   node tools/capture_states.mjs --url http://localhost:5173 red-shroom
 *
 * Browser resolution order: $STUDIO_CHROME, then common Chromium/Chrome
 * install paths. Starts its own Vite dev server unless --url is given.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEV_PORT = 5199;

const BROWSER_CANDIDATES = [
  process.env.STUDIO_CHROME,
  '/opt/pw-browsers/chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
].filter(Boolean);

const findBrowser = () => {
  for (const candidate of BROWSER_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'No Chromium/Chrome found. Set STUDIO_CHROME=/path/to/chrome and retry.'
  );
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const characters = [];
  let url;
  let all = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--url') {
      url = args[(index += 1)];
    } else if (arg === '--all') {
      all = true;
    } else {
      characters.push(arg);
    }
  }

  return { characters, url, all };
};

const waitForServer = async (url, timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status === 404) {
        return;
      }
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Dev server did not become ready at ${url}`);
};

const startDevServer = async () => {
  const child = spawn('npm', ['run', 'dev', '--', '--port', String(DEV_PORT), '--strictPort'], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
    detached: false
  });
  const url = `http://localhost:${DEV_PORT}`;
  await waitForServer(`${url}/workbench.html`);
  return { url, stop: () => child.kill() };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const captureCharacter = async (browser, baseUrl, characterId) => {
  const outDir = join(REPO_ROOT, 'assets', 'characters', characterId, 'playtest', 'states');
  mkdirSync(outDir, { recursive: true });

  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto(`${baseUrl}/workbench.html?focus=${characterId}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__workbench?.ready, undefined, { timeout: 15000 });

  const knownSlot = await page.evaluate(
    (id) => window.__workbench.slotIds.includes(id),
    characterId
  );
  if (!knownSlot) {
    await page.close();
    throw new Error(`workbench has no slot named '${characterId}'`);
  }

  const canvas = page.locator('canvas');
  await canvas.waitFor({ state: 'visible' });
  const clip = await canvas.boundingBox();

  const shot = async (state) => {
    await page.screenshot({ path: join(outDir, `${state}.png`), clip });
    process.stdout.write(`  ${characterId}: ${state}.png\n`);
  };

  // Keep the aim target inside the cell so gaze/attack read clearly.
  await page.mouse.move(clip.x + clip.width * 0.72, clip.y + clip.height * 0.35);

  await sleep(700);
  await shot('spawn');

  await sleep(1700);
  await shot('move');

  await sleep(1600);
  await shot('attack');

  await page.evaluate((id) => window.__workbench.hit(id), characterId);
  await sleep(120);
  await shot('hit');

  const isPlayer = characterId === 'bowbert';
  if (isPlayer) {
    await page.evaluate((id) => window.__workbench.dodge(id), characterId);
    await sleep(110);
    await shot('dodge');
  } else {
    await sleep(700);
    await page.evaluate((id) => window.__workbench.kill(id), characterId);
    await sleep(240);
    await shot('death');
  }

  await page.close();

  if (pageErrors.length > 0) {
    throw new Error(`page errors while capturing ${characterId}:\n${pageErrors.join('\n')}`);
  }

  return outDir;
};

const main = async () => {
  const { characters, url, all } = parseArgs();
  const server = url ? undefined : await startDevServer();
  const baseUrl = (url ?? server.url).replace(/\/$/, '');
  const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });

  try {
    let targets = characters;
    if (all || targets.length === 0) {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/workbench.html`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__workbench?.ready, undefined, { timeout: 15000 });
      targets = await page.evaluate(() => window.__workbench.slotIds);
      await page.close();
    }

    for (const characterId of targets) {
      process.stdout.write(`capturing ${characterId}...\n`);
      const outDir = await captureCharacter(browser, baseUrl, characterId);
      process.stdout.write(`  -> ${outDir}\n`);
    }
  } finally {
    await browser.close();
    server?.stop();
  }
};

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
