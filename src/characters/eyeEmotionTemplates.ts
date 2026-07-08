import type { EyeEmotionTuning } from './rigSchema';

/**
 * Accepted eye-emotion templates for this project's three proven eye
 * archetypes. Every character in Bowcopy expresses emotion through runtime
 * eyes over a fixed base image, so new characters should START from one of
 * these sets instead of inventing values:
 *
 * - `ROUND_EXTERNAL_EYE_EMOTIONS`  -> gaze mode `attached-eye-pupils` (Bowbert)
 * - `ANGRY_EMBEDDED_EYE_EMOTIONS`  -> gaze mode `embedded-eye-pupils` (goobers)
 * - `SHROOM_EMBEDDED_EYE_EMOTIONS` -> gaze mode `embedded-eye-pupils` + dizzy (shrooms)
 *
 * The values below are the accepted, playtested sets referenced by the
 * canonical rigs (bowbertRig / dartGooberRig / redShroomRig). Variants
 * (dart-tri-goober, purple-shroom) tune their own copies; use
 * `withEyeEmotionOverrides` when a variant only needs to nudge a few fields.
 */

/** Bowbert-style attached round external eyes: big white circles mounted on the body edge, black round pupils. */
export const ROUND_EXTERNAL_EYE_EMOTIONS = {
  default: {
    eyeTiltAdd: 0,
    eyeScaleX: 1,
    eyeScaleY: 1,
    pupilScale: 1,
    pupilShiftX: 0,
    pupilShiftY: 0,
    upperLid: 0,
    lowerLid: 0
  },
  aim: {
    eyeTiltAdd: 0,
    eyeScaleX: 0.96,
    eyeScaleY: 0.96,
    pupilScale: 0.98,
    pupilShiftX: 0,
    pupilShiftY: -0.004,
    upperLid: 0,
    lowerLid: 0
  },
  focused: {
    eyeTiltAdd: 0,
    eyeScaleX: 1.12,
    eyeScaleY: 0.68,
    pupilScale: 0.92,
    pupilShiftX: 0,
    pupilShiftY: -0.002,
    upperLid: 0.18,
    lowerLid: 0.04
  },
  alert: {
    eyeTiltAdd: 0,
    eyeScaleX: 0.82,
    eyeScaleY: 0.82,
    pupilScale: 0.72,
    pupilShiftX: 0,
    pupilShiftY: -0.006,
    upperLid: 0,
    lowerLid: 0
  },
  scared: {
    eyeTiltAdd: 0,
    eyeScaleX: 0.68,
    eyeScaleY: 0.68,
    pupilScale: 0.58,
    pupilShiftX: 0,
    pupilShiftY: -0.012,
    upperLid: 0,
    lowerLid: 0
  },
  confused: {
    eyeTiltAdd: 0.18,
    eyeScaleX: 0.92,
    eyeScaleY: 1.08,
    pupilScale: 0.9,
    pupilShiftX: 0.004,
    pupilShiftY: -0.002,
    upperLid: 0.02,
    lowerLid: 0
  },
  squint: {
    eyeTiltAdd: 0,
    eyeScaleX: 1.04,
    eyeScaleY: 0.34,
    pupilScale: 0.74,
    pupilShiftX: 0,
    pupilShiftY: 0.012,
    upperLid: 0.56,
    lowerLid: 0.12
  },
  hit: {
    eyeTiltAdd: 0,
    eyeScaleX: 0.9,
    eyeScaleY: 0.58,
    pupilScale: 0.82,
    pupilShiftX: -0.004,
    pupilShiftY: -0.006,
    upperLid: 0.22,
    lowerLid: 0.1
  }
} as const satisfies Record<string, EyeEmotionTuning>;

/** Dart Goober-style angry embedded eyes: slanted white sockets baked into the base, black cut-ellipse gaze fill. */
export const ANGRY_EMBEDDED_EYE_EMOTIONS = {
  default: {
    shape: 'cut-ellipse',
    eyeTiltAdd: 0,
    eyeScaleX: 1.32,
    eyeScaleY: 1.35,
    pupilScale: 1.12,
    pupilShiftX: 0,
    pupilShiftY: 0.01,
    cutSlope: 1.6,
    cutOffset: -0.42,
    upperLid: 0,
    lowerLid: 0
  },
  angry: {
    shape: 'cut-ellipse',
    eyeTiltAdd: -0.015,
    eyeScaleX: 1.4,
    eyeScaleY: 1.42,
    pupilScale: 1.16,
    pupilShiftX: 0,
    pupilShiftY: 0.012,
    cutSlope: 1.72,
    cutOffset: -0.46,
    upperLid: 0,
    lowerLid: 0
  },
  alert: {
    eyeTiltAdd: 0,
    eyeScaleX: 0.82,
    eyeScaleY: 0.9,
    pupilScale: 0.62,
    pupilShiftX: 0,
    pupilShiftY: 0,
    upperLid: 0,
    lowerLid: 0
  },
  scared: {
    eyeTiltAdd: 0.01,
    eyeScaleX: 0.66,
    eyeScaleY: 0.76,
    pupilScale: 0.46,
    pupilShiftX: -0.006,
    pupilShiftY: -0.014,
    upperLid: 0.04,
    lowerLid: 0.02
  },
  hit: {
    eyeTiltAdd: 0.02,
    eyeScaleX: 0.82,
    eyeScaleY: 0.56,
    pupilScale: 0.68,
    pupilShiftX: -0.008,
    pupilShiftY: -0.006,
    upperLid: 0.36,
    lowerLid: 0.18
  },
  aim: {
    shape: 'cut-ellipse',
    eyeTiltAdd: 0.01,
    eyeScaleX: 1.18,
    eyeScaleY: 1.2,
    pupilScale: 1.02,
    pupilShiftX: 0,
    pupilShiftY: 0.006,
    cutSlope: 1.85,
    cutOffset: -0.38,
    upperLid: 0,
    lowerLid: 0
  }
} as const satisfies Record<string, EyeEmotionTuning>;

/** Shroom-style embedded eyes: cut-ellipse angry gaze plus a spiral dizzy state used while releasing spores. */
export const SHROOM_EMBEDDED_EYE_EMOTIONS = {
  default: {
    shape: 'cut-ellipse',
    eyeTiltAdd: 0.02,
    eyeScaleX: 1.22,
    eyeScaleY: 1.02,
    pupilScale: 1.1,
    pupilShiftX: 0,
    pupilShiftY: -0.002,
    cutSlope: 1.42,
    cutOffset: -0.42,
    upperLid: 0,
    lowerLid: 0
  },
  angry: {
    shape: 'cut-ellipse',
    eyeTiltAdd: 0.065,
    eyeScaleX: 1.32,
    eyeScaleY: 1.08,
    pupilScale: 1.14,
    pupilShiftX: 0,
    pupilShiftY: -0.001,
    cutSlope: 1.52,
    cutOffset: -0.44,
    upperLid: 0,
    lowerLid: 0
  },
  alert: {
    eyeTiltAdd: 0,
    eyeScaleX: 0.72,
    eyeScaleY: 0.72,
    pupilScale: 0.64,
    pupilShiftX: 0,
    pupilShiftY: -0.006,
    upperLid: 0,
    lowerLid: 0
  },
  aim: {
    shape: 'cut-ellipse',
    eyeTiltAdd: 0.04,
    eyeScaleX: 1.22,
    eyeScaleY: 1.02,
    pupilScale: 1.08,
    pupilShiftX: 0,
    pupilShiftY: -0.004,
    cutSlope: 1.5,
    cutOffset: -0.43,
    upperLid: 0,
    lowerLid: 0
  },
  hit: {
    eyeTiltAdd: 0,
    eyeScaleX: 0.82,
    eyeScaleY: 0.54,
    pupilScale: 0.76,
    pupilShiftX: -0.004,
    pupilShiftY: -0.006,
    upperLid: 0.28,
    lowerLid: 0.12
  },
  dizzy: {
    shape: 'spiral',
    eyeTiltAdd: 0.12,
    eyeScaleX: 1.28,
    eyeScaleY: 1.28,
    pupilScale: 1.12,
    pupilShiftX: 0,
    pupilShiftY: 0,
    upperLid: 0,
    lowerLid: 0
  }
} as const satisfies Record<string, EyeEmotionTuning>;

/**
 * Derive a variant emotion set from a template: replaces whole emotion
 * entries and/or nudges individual fields of existing ones.
 */
export const withEyeEmotionOverrides = <T extends Record<string, EyeEmotionTuning>>(
  template: T,
  overrides: { [K in keyof T]?: Partial<EyeEmotionTuning> } & Record<string, Partial<EyeEmotionTuning>>
): Record<string, EyeEmotionTuning> => {
  const result: Record<string, EyeEmotionTuning> = { ...template };

  for (const [emotion, patch] of Object.entries(overrides)) {
    const base = result[emotion];

    result[emotion] = base
      ? { ...base, ...patch }
      : ({ ...patch } as EyeEmotionTuning);
  }

  return result;
};
