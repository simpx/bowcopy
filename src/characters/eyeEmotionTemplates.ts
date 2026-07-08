import type { EyeExpression, EyeTemplateName } from './rigSchema';

/**
 * The project's single reusable eye asset (docs/studio/eyes.md), designed by
 * hand — NOT generated. Every character references it via rig.json
 * (`gaze.emotions.template: "standard"`); characters do not fork expression
 * values, only their container geometry (socket fit) is per-character.
 *
 * One template serves every socket shape because the pupil's rest position
 * is the centroid of the clipped container (eyeGeometry.ts): a teardrop or
 * crescent socket automatically seats the pupil lower — expressions carry
 * zero socket compensation.
 *
 * State catalog (fixed behavioral semantics; a new state may only be added
 * when a behavior actually triggers it):
 *
 * - default: at rest, wandering.
 * - aim:     tracking / lining up an attack — horizontal slit pupil.
 * - alert:   startled — pupils snap small.
 * - angry:   aggression — slanted upper lids (expression cuts), deep at the
 *            inner corner, enlarged glare.
 * - hit:     pain — classic cartoon X eyes.
 * - scared:  dilated pupils (panic, about to explode).
 * - dizzy:   stunned spiral.
 *
 * All quantities are eye-local container units. Expression cuts are authored
 * for the LEFT eye and mirrored automatically for the right.
 *
 * Review surface: the workbench overview page renders the template inside
 * both socket shapes ("眼睛模板" section); per-character sheets show the
 * same states on the real base art.
 */

const STANDARD: Record<string, EyeExpression> = {
  default: {
    style: 'dot',
    tiltAdd: 0,
    pupilRadiusX: 0.52,
    pupilRadiusY: 0.52,
    pupilShiftX: 0,
    pupilShiftY: 0,
    upperLid: 0,
    lowerLid: 0
  },
  aim: {
    style: 'dot',
    tiltAdd: 0,
    pupilRadiusX: 0.46,
    pupilRadiusY: 0.3,
    pupilShiftX: 0,
    pupilShiftY: 0,
    upperLid: 0,
    lowerLid: 0
  },
  alert: {
    style: 'dot',
    tiltAdd: 0,
    pupilRadiusX: 0.3,
    pupilRadiusY: 0.3,
    pupilShiftX: 0,
    pupilShiftY: -0.08,
    upperLid: 0,
    lowerLid: 0
  },
  angry: {
    style: 'dot',
    tiltAdd: 0.05,
    pupilRadiusX: 0.62,
    pupilRadiusY: 0.62,
    pupilShiftX: 0,
    pupilShiftY: 0.06,
    upperLid: 0,
    lowerLid: 0,
    cuts: [{ slope: 0.6, offset: -0.22 }]
  },
  hit: {
    style: 'x',
    tiltAdd: 0,
    pupilRadiusX: 0.5,
    pupilRadiusY: 0.5,
    pupilShiftX: 0,
    pupilShiftY: 0,
    upperLid: 0,
    lowerLid: 0
  },
  scared: {
    style: 'dot',
    tiltAdd: 0,
    pupilRadiusX: 0.72,
    pupilRadiusY: 0.72,
    pupilShiftX: 0,
    pupilShiftY: 0.04,
    upperLid: 0,
    lowerLid: 0.12
  },
  dizzy: {
    style: 'spiral',
    tiltAdd: 0,
    pupilRadiusX: 0.55,
    pupilRadiusY: 0.55,
    pupilShiftX: 0,
    pupilShiftY: 0,
    upperLid: 0,
    lowerLid: 0
  }
};

export const EYE_TEMPLATES: Record<EyeTemplateName, Record<string, EyeExpression>> = {
  standard: STANDARD
};

/** Union of state names available to behavior code. */
export type EyeEmotionName = keyof typeof STANDARD;

/**
 * Resolve a rig's emotion reference into concrete expressions: template
 * states merged with per-character overrides (unknown override states start
 * from the template's default). Overrides are an escape hatch — the design
 * default is a bare reference with none.
 */
export const resolveEyeExpressions = (emotions: {
  readonly template: string;
  readonly overrides?: Record<string, unknown>;
}): Record<string, EyeExpression> => {
  const template = EYE_TEMPLATES[emotions.template as EyeTemplateName] ?? EYE_TEMPLATES.standard;
  const resolved: Record<string, EyeExpression> = { ...template };

  for (const [state, override] of Object.entries(emotions.overrides ?? {})) {
    const base = resolved[state] ?? template.default;

    resolved[state] = { ...base, ...(override as Partial<EyeExpression>) };
  }

  return resolved;
};
