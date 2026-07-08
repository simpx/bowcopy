#!/usr/bin/env node
// ARCHIVED 2026-07-08: this one-off migration converted the legacy per-
// character eye values into the container system. The eye templates have
// since been redesigned by hand (src/characters/eyeEmotionTemplates.ts is a
// designed asset, NOT generated) — rerunning this script would destroy that
// design, so it now refuses to run. Kept for the record of the conversion
// math only.
console.error('migrate_eyes.mjs is archived; it must not be rerun. See header comment.');
process.exit(1);
/**
 * One-off migration to the docs/studio/eyes.md eye system.
 *
 * Reads the old per-character gaze data (image-relative units, three ad-hoc
 * families) plus the fitted socket containers from tools/fit_eyes.py, then:
 *   1. rewrites every rig.json gaze section to { eyes: containers,
 *      pupilOffsetScale (eye-local), emotions: { template, overrides } }
 *   2. generates src/characters/eyeEmotionTemplates.ts with the two shared
 *      templates (round / cut) in normalized eye-local units.
 *
 * The kaboomlet / slime / spooper magic numbers that used to live in their
 * renderers become rig overrides here (single source of truth).
 *
 * Usage: node tools/migrate_eyes.mjs <path-to-fit-json>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fitPath = process.argv[2];

if (!fitPath) {
  console.error('usage: node tools/migrate_eyes.mjs <fit-json>');
  process.exit(1);
}

const fits = JSON.parse(readFileSync(fitPath, 'utf-8'));

const rigPath = (id) => join(REPO_ROOT, 'assets', 'characters', id, 'rig.json');
const loadRig = (id) => JSON.parse(readFileSync(rigPath(id), 'utf-8'));

const round4 = (value) => Math.round(value * 10000) / 10000;

const meanRadii = (id) => {
  const eyes = fits[id].eyes;
  return {
    rx: (eyes.left.radiusX + eyes.right.radiusX) / 2,
    ry: (eyes.left.radiusY + eyes.right.radiusY) / 2
  };
};

/** Convert an old emotion (embedded family) to a normalized expression. */
const convertEmbedded = (rig, id, emotion, { dropCut }) => {
  const { rx, ry } = meanRadii(id);
  const eye = rig.gaze.eyes.left;
  const pupilRadiusX = (eye.radiusX * emotion.pupilScale * emotion.eyeScaleX) / rx;
  const pupilRadiusY = (eye.radiusY * emotion.pupilScale * emotion.eyeScaleY) / ry;
  const pupilShiftX = emotion.pupilShiftX / rx;
  const pupilShiftY = emotion.pupilShiftY / ry;

  const expression = {
    style: emotion.shape === 'spiral' ? 'spiral' : emotion.shape === 'x' ? 'x' : 'dot',
    tiltAdd: emotion.eyeTiltAdd,
    ...(emotion.eyeTiltMode ? { tiltMode: emotion.eyeTiltMode } : {}),
    pupilRadiusX: round4(pupilRadiusX),
    pupilRadiusY: round4(pupilRadiusY),
    pupilShiftX: round4(pupilShiftX),
    pupilShiftY: round4(pupilShiftY),
    upperLid: emotion.upperLid,
    lowerLid: emotion.lowerLid
  };

  if (emotion.shape === 'cut-ellipse' && !dropCut) {
    // Old cut lived in pupil-local units; re-express in eye-local units
    // around the resting pupil position.
    const slope = (emotion.cutSlope ?? 1.6) * (pupilRadiusY / pupilRadiusX);
    const offset =
      (emotion.cutOffset ?? -0.42) * pupilRadiusY +
      pupilShiftY -
      (emotion.cutSlope ?? 1.6) * (pupilRadiusY / pupilRadiusX) * pupilShiftX;

    expression.cuts = [{ slope: round4(slope), offset: round4(offset) }];
  }

  return expression;
};

/** Convert an old bowbert emotion (attached family) to normalized units. */
const convertBowbert = (rig, id, emotion) => {
  const { rx, ry } = meanRadii(id);
  const { width, height } = rig.base.imageSize;
  const eye = rig.gaze.eyes.left;
  const pupilBase = eye.outerRadius * eye.whiteRatio * eye.pupilRatio; // /width units
  const basis = 2 * eye.outerRadius; // shift basis, /width units

  return {
    style: 'dot',
    tiltAdd: emotion.eyeTiltAdd,
    pupilRadiusX: round4((pupilBase * emotion.pupilScale * emotion.eyeScaleX) / rx),
    pupilRadiusY: round4(((pupilBase * emotion.pupilScale * emotion.eyeScaleY) * width) / height / ry),
    pupilShiftX: round4((emotion.pupilShiftX * basis) / rx),
    pupilShiftY: round4(((emotion.pupilShiftY * basis * width) / height) / ry),
    upperLid: emotion.upperLid,
    lowerLid: emotion.lowerLid
  };
};

// ---------------------------------------------------------------------------
// 1. Convert every character's states into normalized expressions.
// ---------------------------------------------------------------------------

const characters = {};

// Bowbert (attached family).
{
  const id = 'bowbert';
  const rig = loadRig(id);
  const states = {};

  for (const [name, emotion] of Object.entries(rig.runtime.gaze.emotions)) {
    states[name] = convertBowbert(rig.runtime, id, emotion);
  }

  const { rx, ry } = meanRadii(id);
  const basis = 2 * rig.runtime.gaze.eyes.left.outerRadius;
  const { width, height } = rig.runtime.base.imageSize;

  characters[id] = {
    rig,
    states,
    template: 'round',
    pupilOffsetScale: {
      x: round4((rig.runtime.gaze.pupilOffsetScale.x * basis) / rx),
      y: round4(((rig.runtime.gaze.pupilOffsetScale.y * basis * width) / height) / ry)
    }
  };
}

// Embedded emotion-driven families.
for (const [id, template, dropCut] of [
  ['dart-goober', 'cut', true],
  ['dart-tri-goober', 'cut', true],
  ['red-shroom', 'round', false],
  ['purple-shroom', 'round', false]
]) {
  const rig = loadRig(id);
  const states = {};

  for (const [name, emotion] of Object.entries(rig.runtime.gaze.emotions)) {
    states[name] = convertEmbedded(rig.runtime, id, emotion, { dropCut });
  }

  const { rx, ry } = meanRadii(id);

  characters[id] = {
    rig,
    states,
    template,
    pupilOffsetScale: {
      x: round4(rig.runtime.gaze.pupilOffsetScale.x / rx),
      y: round4(rig.runtime.gaze.pupilOffsetScale.y / ry)
    }
  };
}

// Simple families: renderer magic numbers become explicit states.
// pupil radii below are (multiplier / 2) * oldRadius / fitRadius.
const simple = {
  kaboomlet: {
    template: 'round',
    states: (rig, id) => {
      const { rx, ry } = meanRadii(id);
      const eye = rig.runtime.gaze.eyes.left;
      const make = (mx, my) => ({
        style: 'dot',
        tiltAdd: 0,
        pupilRadiusX: round4((eye.radiusX * mx) / 2 / rx),
        pupilRadiusY: round4((eye.radiusY * my) / 2 / ry),
        pupilShiftX: 0,
        pupilShiftY: 0,
        upperLid: 0,
        lowerLid: 0
      });

      return { default: make(1.2, 1.14), armed: make(1.48, 1.34) };
    }
  },
  slime: {
    template: 'round',
    states: (rig, id) => {
      const { rx, ry } = meanRadii(id);
      const eye = rig.runtime.gaze.eyes.left;
      const base = {
        style: 'dot',
        tiltAdd: 0,
        pupilRadiusX: round4((eye.radiusX * 1.05) / 2 / rx),
        pupilRadiusY: round4((eye.radiusY * 1.0) / 2 / ry),
        pupilShiftX: 0,
        pupilShiftY: 0,
        upperLid: 0,
        lowerLid: 0
      };

      return { default: base, jumping: { ...base, pupilShiftY: round4(-0.004 / ry) } };
    }
  },
  'slime-parent': {
    template: 'round',
    states: (rig, id) => simple.slime.states(rig, id)
  },
  'spooper-gooper': {
    template: 'round',
    states: (rig, id) => {
      const { rx, ry } = meanRadii(id);
      const eye = rig.runtime.gaze.eyes.left;
      const make = (mx, my) => ({
        style: 'dot',
        tiltAdd: 0,
        pupilRadiusX: round4((eye.radiusX * mx) / 2 / rx),
        pupilRadiusY: round4((eye.radiusY * my) / 2 / ry),
        pupilShiftX: 0,
        pupilShiftY: 0,
        upperLid: 0,
        lowerLid: 0
      });

      return { default: make(1.1, 1.05), charging: make(1.35, 1.21) };
    }
  }
};

for (const [id, config] of Object.entries(simple)) {
  const rig = loadRig(id);
  const { rx, ry } = meanRadii(id);

  characters[id] = {
    rig,
    states: config.states(rig, id),
    template: config.template,
    pupilOffsetScale: {
      x: round4(rig.runtime.gaze.pupilOffsetScale.x / rx),
      y: round4(rig.runtime.gaze.pupilOffsetScale.y / ry)
    }
  };
}

// ---------------------------------------------------------------------------
// 2. Build the two shared templates.
// ---------------------------------------------------------------------------

const templates = { round: {}, cut: {} };

// round: bowbert is canonical for the states it defines; shrooms contribute
// angry / dizzy which bowbert does not have.
for (const [name, expression] of Object.entries(characters.bowbert.states)) {
  templates.round[name] = expression;
}

for (const name of ['angry', 'dizzy']) {
  if (characters['red-shroom'].states[name]) {
    templates.round[name] = characters['red-shroom'].states[name];
  }
}

// cut: dart-goober is canonical.
for (const [name, expression] of Object.entries(characters['dart-goober'].states)) {
  templates.cut[name] = expression;
}

// ---------------------------------------------------------------------------
// 3. Per-character overrides = diff against the template.
// ---------------------------------------------------------------------------

const FIELD_TOLERANCE = 0.006;

const diffExpression = (state, template) => {
  if (!template) {
    return state;
  }

  const override = {};

  for (const key of new Set([...Object.keys(state), ...Object.keys(template)])) {
    const a = state[key];
    const b = template[key];

    if (typeof a === 'number' && typeof b === 'number') {
      if (Math.abs(a - b) > FIELD_TOLERANCE) {
        override[key] = a;
      }
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      override[key] = a;
    }
  }

  return Object.keys(override).length > 0 ? override : null;
};

for (const [id, character] of Object.entries(characters)) {
  const template = templates[character.template];
  const overrides = {};

  for (const [name, state] of Object.entries(character.states)) {
    const diff = diffExpression(state, template[name]);

    if (diff) {
      overrides[name] = diff;
    }
  }

  const fitted = fits[id].eyes;
  const gaze = {
    eyes: {
      left: fitted.left,
      right: fitted.right
    },
    pupilOffsetScale: character.pupilOffsetScale,
    emotions: {
      template: character.template,
      ...(Object.keys(overrides).length > 0 ? { overrides } : {})
    }
  };

  character.rig.runtime.gaze = gaze;
  writeFileSync(rigPath(id), `${JSON.stringify(character.rig, null, 2)}\n`, 'utf-8');
  console.log(`${id}: template=${character.template} overrides=${Object.keys(overrides).join(',') || '(none)'}`);
}

// ---------------------------------------------------------------------------
// 4. Generate eyeEmotionTemplates.ts.
// ---------------------------------------------------------------------------

const literal = (value, indent) => JSON.stringify(value, null, 2)
  .split('\n')
  .map((line, index) => (index === 0 ? line : `${' '.repeat(indent)}${line}`))
  .join('\n')
  .replace(/"([a-zA-Z][a-zA-Z0-9]*)":/g, '$1:')
  .replace(/"/g, "'");

const templatesTs = `import type { EyeExpression, EyeTemplateName } from './rigSchema';

/**
 * The project's two reusable eye assets (docs/studio/eyes.md). Every
 * character references one of these via rig.json
 * (\`gaze.emotions.template\`) and overrides sparingly. All values are in
 * eye-local container units, so a template works in any character's eyes
 * regardless of size — that is what makes them shared assets.
 *
 * - round: no permanent socket cuts (Bowbert, shrooms, slimes, kaboomlet,
 *   spooper). Includes dizzy — characters use it or not, it is not special.
 * - cut: teardrop socket with a permanent inner cut baked in the art
 *   (goobers); the container cut comes from rig.json eyes[].cuts, fitted
 *   from base.png by tools/fit_eyes.py.
 *
 * Generated by tools/migrate_eyes.mjs on ${new Date().toISOString().slice(0, 10)};
 * hand-edit values freely afterwards (this file stays the single source of
 * truth for shared expressions).
 */

export const EYE_TEMPLATES: Record<EyeTemplateName, Record<string, EyeExpression>> = {
  round: ${literal(templates.round, 2)},
  cut: ${literal(templates.cut, 2)}
};

/** Union of state names available to behavior code. */
export type EyeEmotionName = keyof typeof EYE_TEMPLATES.round | keyof typeof EYE_TEMPLATES.cut;

/**
 * Resolve a rig's emotion reference into concrete expressions: template
 * states merged with per-character overrides (unknown override states start
 * from the template's default).
 */
export const resolveEyeExpressions = (emotions: {
  readonly template: string;
  readonly overrides?: Record<string, unknown>;
}): Record<string, EyeExpression> => {
  const template = EYE_TEMPLATES[emotions.template as EyeTemplateName] ?? EYE_TEMPLATES.round;
  const resolved: Record<string, EyeExpression> = { ...template };

  for (const [state, override] of Object.entries(emotions.overrides ?? {})) {
    const base = resolved[state] ?? template.default;

    resolved[state] = { ...base, ...(override as Partial<EyeExpression>) };
  }

  return resolved;
};
`;

writeFileSync(join(REPO_ROOT, 'src', 'characters', 'eyeEmotionTemplates.ts'), templatesTs, 'utf-8');
console.log('wrote src/characters/eyeEmotionTemplates.ts');
