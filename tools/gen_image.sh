#!/usr/bin/env bash
# Studio image generation via the Codex CLI's built-in image_generation tool
# (ChatGPT-subscription backend; `codex features list` must show
# image_generation=true).
#
# Usage:
#   tools/gen_image.sh "<prompt>" <output.png> [style-reference.png ...]
#
# Reference images are attached to the request; the standard style suffix
# below pins the Bowbert doodle look (flat colors, thick uniform outline).
# Prompts should follow docs/studio/prompt-rules.md, including the
# machine-fittable eye-white contract for character bases.
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 \"<prompt>\" <output.png> [reference.png ...]" >&2
  exit 1
fi

PROMPT="$1"
OUT="$(realpath -m "$2")"
shift 2

REF_ARGS=()
STYLE_NOTE=""
for ref in "$@"; do
  REF_ARGS+=(-i "$(realpath "$ref")")
  STYLE_NOTE=" Match the attached reference sprites' art style exactly: flat colors, no gradients or painterly shading, thick uniform black outline, simple hand-drawn doodle shapes, sticker-like readability."
done

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

codex exec \
  --skip-git-repo-check \
  -s workspace-write \
  -C "$WORKDIR" \
  "${REF_ARGS[@]}" \
  "Use your image generation tool to create exactly one image and save it in the current directory as out.png. Do nothing else. Image description: ${PROMPT}${STYLE_NOTE}" \
  >/dev/null

if [ ! -f "$WORKDIR/out.png" ]; then
  # Fall back to whatever single PNG the run produced.
  FOUND="$(find "$WORKDIR" -maxdepth 1 -name '*.png' | head -1)"
  if [ -z "$FOUND" ]; then
    echo "generation failed: no PNG produced" >&2
    exit 1
  fi
  mv "$FOUND" "$WORKDIR/out.png"
fi

mkdir -p "$(dirname "$OUT")"
mv "$WORKDIR/out.png" "$OUT"
echo "saved $OUT"
