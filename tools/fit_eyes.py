#!/usr/bin/env python3
"""Fit eye-socket container geometry from baked eye whites in base.png.

Implements the calibration step of docs/studio/eyes.md: the eye whites are
baked into the art, so the rig's container geometry (ellipse + optional
half-plane cuts, normalized to the base image) is *derived from the image*
instead of hand-tuned.

Usage:
  python3 tools/fit_eyes.py <id> [<id>...]      # report fits as JSON
  python3 tools/fit_eyes.py --all               # every character with base.png
  python3 tools/fit_eyes.py --all --overlay DIR # save debug overlays into DIR

Output per eye: x, y (center / image size), radiusX (/width), radiusY
(/height), rotation (radians), cuts [{slope, offset}] in eye-local
normalized coordinates where the container is |u| <= 1 intersected with
u.y - slope*u.x - offset >= 0 for every cut (matches the runtime renderer).
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parent.parent
CHARACTERS_DIR = REPO_ROOT / "assets" / "characters"

WHITE_THRESHOLD = 215
ALPHA_THRESHOLD = 180
MIN_AREA_RATIO = 0.0012
CUT_DEFICIT_RATIO = 0.06
CUT_MIN_NY = 0.18
IOU_WARN = 0.90


def load_white_mask(image: Image.Image) -> np.ndarray:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    rgb_min = rgba[..., :3].min(axis=-1)
    return (rgb_min >= WHITE_THRESHOLD) & (rgba[..., 3] >= ALPHA_THRESHOLD)


def connected_components(mask: np.ndarray) -> list[np.ndarray]:
    """Return per-component boolean masks, largest first (4-connectivity)."""
    height, width = mask.shape
    labels = np.zeros((height, width), dtype=np.int32)
    current = 0
    components: list[np.ndarray] = []
    ys, xs = np.nonzero(mask)

    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if labels[y0, x0]:
            continue

        current += 1
        queue: deque[tuple[int, int]] = deque([(y0, x0)])
        labels[y0, x0] = current
        pixels: list[tuple[int, int]] = []

        while queue:
            y, x = queue.popleft()
            pixels.append((y, x))

            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < height and 0 <= nx < width and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = current
                    queue.append((ny, nx))

        component = np.zeros((height, width), dtype=bool)
        arr = np.array(pixels)
        component[arr[:, 0], arr[:, 1]] = True
        components.append(component)

    components.sort(key=lambda c: int(c.sum()), reverse=True)
    return components


def pick_eye_pair(components: list[np.ndarray], width: int, height: int) -> tuple[np.ndarray, np.ndarray]:
    min_area = MIN_AREA_RATIO * width * height
    candidates = [c for c in components if c.sum() >= min_area][:8]

    best: tuple[float, tuple[np.ndarray, np.ndarray]] | None = None

    for i in range(len(candidates)):
        for j in range(i + 1, len(candidates)):
            a, b = candidates[i], candidates[j]
            area_a, area_b = float(a.sum()), float(b.sum())

            if min(area_a, area_b) / max(area_a, area_b) < 0.45:
                continue

            ya, xa = np.nonzero(a)
            yb, xb = np.nonzero(b)
            ca = (float(xa.mean()), float(ya.mean()))
            cb = (float(xb.mean()), float(yb.mean()))

            if abs(ca[1] - cb[1]) > 0.16 * height:
                continue

            if abs(ca[0] - cb[0]) < 0.16 * width:
                continue

            score = area_a + area_b - abs(area_a - area_b)

            if best is None or score > best[0]:
                pair = (a, b) if ca[0] < cb[0] else (b, a)
                best = (score, pair)

    if best is None:
        raise ValueError("could not find a symmetric pair of white eye sockets")

    return best[1]


def fit_ellipse(component: np.ndarray) -> dict:
    ys, xs = np.nonzero(component)
    cx, cy = float(xs.mean()), float(ys.mean())
    dx, dy = xs - cx, ys - cy
    cov = np.array([
        [float((dx * dx).mean()), float((dx * dy).mean())],
        [float((dx * dy).mean()), float((dy * dy).mean())]
    ])
    eigenvalues, eigenvectors = np.linalg.eigh(cov)
    # eigh returns ascending; use the major axis as the local x direction.
    major = eigenvectors[:, 1]
    rotation = math.atan2(float(major[1]), float(major[0]))

    if rotation > math.pi / 2:
        rotation -= math.pi
    elif rotation < -math.pi / 2:
        rotation += math.pi

    radius_major = 2.0 * math.sqrt(max(float(eigenvalues[1]), 1e-6))
    radius_minor = 2.0 * math.sqrt(max(float(eigenvalues[0]), 1e-6))

    return {"cx": cx, "cy": cy, "rx": radius_major, "ry": radius_minor, "rotation": rotation}


def to_local(ellipse: dict, xs: np.ndarray, ys: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    cos_r, sin_r = math.cos(-ellipse["rotation"]), math.sin(-ellipse["rotation"])
    dx, dy = xs - ellipse["cx"], ys - ellipse["cy"]
    ux = (dx * cos_r - dy * sin_r) / ellipse["rx"]
    uy = (dx * sin_r + dy * cos_r) / ellipse["ry"]
    return ux, uy


def container_mask(ellipse: dict, cuts: list[dict], shape: tuple[int, int]) -> np.ndarray:
    height, width = shape
    ys, xs = np.mgrid[0:height, 0:width]
    ux, uy = to_local(ellipse, xs.astype(np.float64), ys.astype(np.float64))
    inside = ux * ux + uy * uy <= 1.0

    for cut in cuts:
        inside &= uy - cut["slope"] * ux - cut["offset"] >= 0

    return inside


def iou(a: np.ndarray, b: np.ndarray) -> float:
    union = float(np.logical_or(a, b).sum())
    return float(np.logical_and(a, b).sum()) / union if union else 0.0


def evaluate(params: list[float], xs: np.ndarray, ys: np.ndarray, blob_at: np.ndarray) -> float:
    """IoU of the container described by params against the blob samples.

    params = [cx, cy, rx, ry, rotation] or [..., slope, offset] with one cut.
    """
    ellipse = {"cx": params[0], "cy": params[1], "rx": params[2], "ry": params[3], "rotation": params[4]}
    ux, uy = to_local(ellipse, xs, ys)
    inside = ux * ux + uy * uy <= 1.0

    if len(params) == 7:
        inside &= uy - params[5] * ux - params[6] >= 0

    union = float(np.logical_or(inside, blob_at).sum())
    return float(np.logical_and(inside, blob_at).sum()) / union if union else 0.0


def refine(params: list[float], xs: np.ndarray, ys: np.ndarray, blob_at: np.ndarray) -> tuple[list[float], float]:
    """Coordinate-descent hill climb over container parameters."""
    radius_scale = max(params[2], params[3])
    best = list(params)
    best_score = evaluate(best, xs, ys, blob_at)

    for step_scale in (0.08, 0.04, 0.015, 0.006):
        improved = True

        while improved:
            improved = False

            for index in range(len(best)):
                if index < 2:
                    delta = radius_scale * step_scale
                elif index < 4:
                    delta = radius_scale * step_scale
                elif index == 4:
                    delta = 0.6 * step_scale
                elif index == 5:
                    delta = 3.0 * step_scale
                else:
                    delta = 1.2 * step_scale

                for direction in (delta, -delta):
                    candidate = list(best)
                    candidate[index] += direction

                    if candidate[2] <= 2 or candidate[3] <= 2:
                        continue

                    score = evaluate(candidate, xs, ys, blob_at)

                    if score > best_score + 1e-5:
                        best, best_score = candidate, score
                        improved = True

    return best, best_score


def initial_cut(ellipse: dict, xs: np.ndarray, ys: np.ndarray, blob_at: np.ndarray) -> list[float] | None:
    """Grid-search a starting half-plane cut for the refiner."""
    ux, uy = to_local(ellipse, xs, ys)
    inside = ux * ux + uy * uy <= 1.0
    best: tuple[float, list[float]] | None = None

    for phi_deg in range(0, 360, 6):
        phi = math.radians(phi_deg)
        nx, ny = math.cos(phi), math.sin(phi)

        if ny < CUT_MIN_NY:
            continue

        projection = nx * ux + ny * uy

        for threshold in np.arange(-0.8, 0.55, 0.1):
            kept = inside & (projection >= threshold)
            union = float(np.logical_or(kept, blob_at).sum())
            score = float(np.logical_and(kept, blob_at).sum()) / union if union else 0.0

            if best is None or score > best[0]:
                # kept side nx*ux + ny*uy >= t  <=>  uy - slope*ux - offset >= 0 (ny > 0)
                best = (score, [-nx / ny, float(threshold) / ny])

    return best[1] if best else None


def fit_character(character_id: str) -> dict:
    base_path = CHARACTERS_DIR / character_id / "base.png"

    if not base_path.exists():
        raise FileNotFoundError(f"{base_path} missing")

    image = Image.open(base_path)
    width, height = image.size
    mask = load_white_mask(image)
    left_blob, right_blob = pick_eye_pair(connected_components(mask), width, height)

    eyes: dict[str, dict] = {}
    debug: dict[str, dict] = {}

    for name, blob in (("left", left_blob), ("right", right_blob)):
        moments = fit_ellipse(blob)

        # Sample grid: blob bbox expanded 60%, capped at ~40k samples.
        blob_ys, blob_xs = np.nonzero(blob)
        pad_x = int((blob_xs.max() - blob_xs.min()) * 0.6) + 4
        pad_y = int((blob_ys.max() - blob_ys.min()) * 0.6) + 4
        x0, x1 = max(0, blob_xs.min() - pad_x), min(width, blob_xs.max() + pad_x)
        y0, y1 = max(0, blob_ys.min() - pad_y), min(height, blob_ys.max() + pad_y)
        step = max(1, round(math.sqrt((x1 - x0) * (y1 - y0) / 40000)))
        grid_y, grid_x = np.mgrid[y0:y1:step, x0:x1:step]
        xs = grid_x.ravel().astype(np.float64)
        ys = grid_y.ravel().astype(np.float64)
        blob_at = blob[grid_y.ravel(), grid_x.ravel()]

        params = [moments["cx"], moments["cy"], moments["rx"], moments["ry"], moments["rotation"]]
        params, plain_score = refine(params, xs, ys, blob_at)

        ellipse = {"cx": params[0], "cy": params[1], "rx": params[2], "ry": params[3], "rotation": params[4]}
        cuts: list[dict] = []
        quality = plain_score
        cut_start = initial_cut(ellipse, xs, ys, blob_at)

        if cut_start is not None:
            cut_params, cut_score = refine(params + cut_start, xs, ys, blob_at)

            if cut_score > plain_score + 0.02:
                ellipse = {
                    "cx": cut_params[0], "cy": cut_params[1],
                    "rx": cut_params[2], "ry": cut_params[3], "rotation": cut_params[4]
                }
                cuts = [{"slope": round(cut_params[5], 4), "offset": round(cut_params[6], 4)}]
                quality = cut_score

        eyes[name] = {
            "x": round(ellipse["cx"] / width, 4),
            "y": round(ellipse["cy"] / height, 4),
            "radiusX": round(ellipse["rx"] / width, 4),
            "radiusY": round(ellipse["ry"] / height, 4),
            "rotation": round(ellipse["rotation"], 4),
            "cuts": cuts
        }
        debug[name] = {"iou": round(quality, 4), "ellipse": ellipse, "cuts": cuts, "blob": blob}

    return {"id": character_id, "imageSize": {"width": width, "height": height}, "eyes": eyes, "debug": debug}


def draw_overlay(result: dict, out_path: Path) -> None:
    base_path = CHARACTERS_DIR / result["id"] / "base.png"
    image = Image.open(base_path).convert("RGBA")
    draw = ImageDraw.Draw(image)

    for name in ("left", "right"):
        info = result["debug"][name]
        ellipse = info["ellipse"]
        points = []

        for step in range(96):
            angle = 2 * math.pi * step / 96
            ux, uy = math.cos(angle), math.sin(angle)
            keep = all(uy - cut["slope"] * ux - cut["offset"] >= -0.02 for cut in info["cuts"])

            if not keep:
                continue

            cos_r, sin_r = math.cos(ellipse["rotation"]), math.sin(ellipse["rotation"])
            px = ellipse["cx"] + ux * ellipse["rx"] * cos_r - uy * ellipse["ry"] * sin_r
            py = ellipse["cy"] + ux * ellipse["rx"] * sin_r + uy * ellipse["ry"] * cos_r
            points.append((px, py))

        for point in points:
            draw.ellipse([point[0] - 2, point[1] - 2, point[0] + 2, point[1] + 2], fill=(255, 60, 60, 255))

        draw.text((ellipse["cx"] - 20, ellipse["cy"] + ellipse["ry"] + 6),
                  f"{name} IoU {info['iou']}", fill=(255, 60, 60, 255))

    image.save(out_path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("ids", nargs="*")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--overlay", metavar="DIR")
    args = parser.parse_args()

    ids = args.ids

    if args.all:
        ids = sorted(
            p.parent.name for p in CHARACTERS_DIR.glob("*/base.png")
        )

    if not ids:
        parser.error("give character ids or --all")

    report = {}
    failed = False

    for character_id in ids:
        try:
            result = fit_character(character_id)
        except Exception as error:  # noqa: BLE001 - report and continue
            report[character_id] = {"error": str(error)}
            failed = True
            continue

        if args.overlay:
            overlay_dir = Path(args.overlay)
            overlay_dir.mkdir(parents=True, exist_ok=True)
            draw_overlay(result, overlay_dir / f"{character_id}.png")

        report[character_id] = {
            "imageSize": result["imageSize"],
            "eyes": {
                name: {**eye}
                for name, eye in result["eyes"].items()
            },
            "iou": {name: result["debug"][name]["iou"] for name in ("left", "right")}
        }

    print(json.dumps(report, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
