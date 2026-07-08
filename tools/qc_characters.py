#!/usr/bin/env python3
"""Project-specific QC for Bowcopy character folders.

Checks every ``assets/characters/<id>/`` folder against this project's
character contract (fixed base image + runtime eyes/motion, transparent
background, rig.json as source of truth, brief.md status with evidence)
and writes ``assets/characters/qc-report.json`` for the workbench page.

Standard library only, so it runs in any agent or human environment:

    python3 tools/qc_characters.py            # human-readable summary
    python3 tools/qc_characters.py --json     # machine-readable report
"""

from __future__ import annotations

import argparse
import json
import struct
import sys
import zlib
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CHARACTERS_ROOT = REPO_ROOT / "assets" / "characters"
REPORT_PATH = CHARACTERS_ROOT / "qc-report.json"

ALLOWED_STATUSES = {
    "brief",
    "concept-generated",
    "reference-locked",
    "asset-generated",
    "rigged",
    "tuned",
    "runtime-integrated",
    "playtested",
    "needs-review",
    "done",
}
EVIDENCE_STATUSES = {"tuned", "runtime-integrated", "playtested", "done"}
PLAYTEST_STATUSES = {"playtested", "done"}

ALLOWED_ROOT_FILES = {
    "brief.md",
    "rig.json",
    "tuning.html",
    "comparison.png",
    "base.png",
    "base-source.png",
    "pipeline.md",
    ".gitkeep",
}
ALLOWED_ROOT_DIRS = {
    "source",
    "attachments",
    "projectiles",
    "vfx",
    "audio",
    "exports",
    "playtest",
    "candidates",
}

ALPHA_VISIBLE = 8  # alpha values above this count as visible content
MIN_MOBILE_RENDER_PX = 26
MAX_MOBILE_RENDER_PX = 240
MAX_PADDING_RATIO = 0.32


class PngImage:
    """Minimal PNG decoder: 8-bit RGB/RGBA/gray/gray+alpha, non-interlaced."""

    def __init__(self, width: int, height: int, channels: int, has_alpha: bool, pixels: bytearray | None):
        self.width = width
        self.height = height
        self.channels = channels
        self.has_alpha = has_alpha
        self.pixels = pixels  # None when the pixel data could not be decoded

    def alpha_at(self, x: int, y: int) -> int:
        if self.pixels is None:
            return 255
        if not self.has_alpha:
            return 255
        index = (y * self.width + x) * self.channels + (self.channels - 1)
        return self.pixels[index]


def decode_png(path: Path) -> PngImage | None:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None

    width = height = bit_depth = color_type = interlace = 0
    idat = bytearray()
    offset = 8
    while offset < len(data):
        length, chunk_type = struct.unpack(">I4s", data[offset : offset + 8])
        chunk = data[offset + 8 : offset + 8 + length]
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
        elif chunk_type == b"IDAT":
            idat.extend(chunk)
        elif chunk_type == b"IEND":
            break
        offset += 12 + length

    channels_by_type = {0: 1, 2: 3, 4: 2, 6: 4}
    channels = channels_by_type.get(color_type)
    has_alpha = color_type in (4, 6)

    if channels is None or bit_depth != 8 or interlace != 0:
        # Unsupported layout (palette, 16-bit, interlaced): keep size info only.
        return PngImage(width, height, channels or 0, has_alpha, None)

    raw = zlib.decompress(bytes(idat))
    stride = width * channels
    pixels = bytearray(width * height * channels)
    previous = bytearray(stride)

    pos = 0
    for row in range(height):
        filter_type = raw[pos]
        pos += 1
        line = bytearray(raw[pos : pos + stride])
        pos += stride

        if filter_type == 1:  # Sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif filter_type == 2:  # Up
            for i in range(stride):
                line[i] = (line[i] + previous[i]) & 0xFF
        elif filter_type == 3:  # Average
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((left + previous[i]) >> 1)) & 0xFF
        elif filter_type == 4:  # Paeth
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                up = previous[i]
                up_left = previous[i - channels] if i >= channels else 0
                p = left + up - up_left
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - up_left)
                if pa <= pb and pa <= pc:
                    predictor = left
                elif pb <= pc:
                    predictor = up
                else:
                    predictor = up_left
                line[i] = (line[i] + predictor) & 0xFF

        pixels[row * stride : (row + 1) * stride] = line
        previous = line

    return PngImage(width, height, channels, has_alpha, pixels)


def alpha_bbox(image: PngImage) -> tuple[int, int, int, int] | None:
    """Returns (min_x, min_y, max_x, max_y) of visible content."""
    if image.pixels is None or not image.has_alpha:
        return None
    min_x, min_y, max_x, max_y = image.width, image.height, -1, -1
    for y in range(image.height):
        row_base = y * image.width * image.channels + (image.channels - 1)
        for x in range(image.width):
            if image.pixels[row_base + x * image.channels] > ALPHA_VISIBLE:
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y
    if max_x < 0:
        return None
    return (min_x, min_y, max_x, max_y)


def sample_rgb(image: PngImage, x: int, y: int) -> tuple[int, int, int] | None:
    """Returns the RGB of a visible pixel, or None for transparent ones."""
    if image.pixels is None:
        return None
    channels = image.channels
    index = (y * image.width + x) * channels
    if image.has_alpha and image.pixels[index + channels - 1] <= ALPHA_VISIBLE:
        return None
    if channels >= 3:
        return (image.pixels[index], image.pixels[index + 1], image.pixels[index + 2])
    value = image.pixels[index]
    return (value, value, value)


def dominant_colors(image: PngImage, max_colors: int = 6) -> list[tuple[tuple[int, int, int], float]]:
    """Top quantized colors of visible pixels as (rgb, weight 0..1)."""
    if image.pixels is None:
        return []
    counts: dict[tuple[int, int, int], int] = {}
    step = max(1, max(image.width, image.height) // 220)
    total = 0
    for y in range(0, image.height, step):
        for x in range(0, image.width, step):
            rgb = sample_rgb(image, x, y)
            if rgb is None:
                continue
            key = (rgb[0] >> 4, rgb[1] >> 4, rgb[2] >> 4)
            counts[key] = counts.get(key, 0) + 1
            total += 1
    if total == 0:
        return []
    ranked = sorted(counts.items(), key=lambda item: -item[1])[:max_colors]
    return [(((r << 4) + 8, (g << 4) + 8, (b << 4) + 8), count / total) for (r, g, b), count in ranked]


PALETTE_DISTANCE_WARN = 72.0


def check_palette_against_reference(
    folder: Path,
    base_image_name: str,
    locked_reference: str,
    warnings: list[str],
    info: dict,
) -> None:
    """Warns when the accepted base art's dominant colors stray from the
    locked reference. The reference may include background colors, so the
    comparison is one-directional: every dominant base color should appear
    somewhere in the reference."""
    reference_path = folder / locked_reference
    base_path = folder / base_image_name
    if not reference_path.exists() or not base_path.exists():
        return
    reference = decode_png(reference_path)
    base = decode_png(base_path)
    if not reference or not base or reference.pixels is None or base.pixels is None:
        return
    reference_colors = dominant_colors(reference, max_colors=10)
    base_colors = dominant_colors(base, max_colors=6)
    if not reference_colors or not base_colors:
        return

    def distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
        return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5

    weighted = 0.0
    for color, weight in base_colors:
        nearest = min(distance(color, ref_color) for ref_color, _ in reference_colors)
        weighted += nearest * weight
    info["paletteDriftFromReference"] = round(weighted, 1)
    if weighted > PALETTE_DISTANCE_WARN:
        warnings.append(
            f"{base_image_name}: dominant colors drift from locked reference "
            f"(score {weighted:.0f} > {PALETTE_DISTANCE_WARN:.0f}); re-check palette fidelity"
        )


def parse_frontmatter(text: str) -> dict[str, object]:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---", 4)
    if end < 0:
        return {}
    result: dict[str, object] = {}
    current_list: list[str] | None = None
    for line in text[4:end].splitlines():
        if line.startswith("  - ") or line.startswith("- "):
            if current_list is not None:
                current_list.append(line.split("- ", 1)[1].strip())
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            if value:
                result[key] = value
                current_list = None
            else:
                current_list = []
                result[key] = current_list
    return result


def check_base_image(folder: Path, rig: dict, errors: list[str], warnings: list[str], info: dict) -> None:
    base = rig.get("base") or {}
    image_name = base.get("image")
    if not image_name:
        warnings.append("rig.json base.image is empty (no accepted base art yet)")
        return

    image_path = folder / str(image_name)
    if not image_path.exists():
        errors.append(f"rig.json base.image points to missing file: {image_name}")
        return

    image = decode_png(image_path)
    if image is None:
        errors.append(f"{image_name} is not a valid PNG")
        return

    info["baseImageSize"] = {"width": image.width, "height": image.height}

    declared = base.get("imageSize")
    if isinstance(declared, dict) and declared.get("width") is not None:
        if (declared.get("width"), declared.get("height")) != (image.width, image.height):
            errors.append(
                f"rig.json imageSize {declared.get('width')}x{declared.get('height')} "
                f"does not match actual {image.width}x{image.height}"
            )

    if not image.has_alpha:
        errors.append(f"{image_name} has no alpha channel; base art must be a transparent PNG")
        return

    if image.pixels is None:
        warnings.append(f"{image_name}: unsupported PNG layout, skipped alpha analysis")
        return

    # Border transparency: content baked to the canvas edge breaks squash/
    # stretch and runtime eye overlays.
    edge_hits = 0
    for x in range(image.width):
        if image.alpha_at(x, 0) > ALPHA_VISIBLE or image.alpha_at(x, image.height - 1) > ALPHA_VISIBLE:
            edge_hits += 1
    for y in range(image.height):
        if image.alpha_at(0, y) > ALPHA_VISIBLE or image.alpha_at(image.width - 1, y) > ALPHA_VISIBLE:
            edge_hits += 1
    if edge_hits > 0:
        errors.append(f"{image_name}: visible pixels touch the canvas edge ({edge_hits} edge pixels); art is cut off or background is not transparent")

    bbox = alpha_bbox(image)
    if bbox is None:
        errors.append(f"{image_name}: image is fully transparent")
        return

    min_x, min_y, max_x, max_y = bbox
    content_w = max_x - min_x + 1
    content_h = max_y - min_y + 1
    pad_x = (image.width - content_w) / image.width
    pad_y = (image.height - content_h) / image.height
    if pad_x > MAX_PADDING_RATIO or pad_y > MAX_PADDING_RATIO:
        warnings.append(
            f"{image_name}: large transparent padding (x {pad_x:.0%}, y {pad_y:.0%}); crop tighter and update rig scale"
        )

    scale = base.get("scale")
    if isinstance(scale, (int, float)) and scale:
        rendered_w = image.width * scale
        rendered_h = image.height * scale
        info["renderedSize"] = {"width": round(rendered_w, 1), "height": round(rendered_h, 1)}
        if rendered_w < MIN_MOBILE_RENDER_PX or rendered_h < MIN_MOBILE_RENDER_PX:
            warnings.append(
                f"rendered size {rendered_w:.0f}x{rendered_h:.0f}px is below {MIN_MOBILE_RENDER_PX}px; likely unreadable on mobile"
            )
        if rendered_w > MAX_MOBILE_RENDER_PX or rendered_h > MAX_MOBILE_RENDER_PX:
            warnings.append(
                f"rendered size {rendered_w:.0f}x{rendered_h:.0f}px is above {MAX_MOBILE_RENDER_PX}px; check the rig scale"
            )


def check_folder_hygiene(folder: Path, warnings: list[str]) -> None:
    stray: list[str] = []
    for entry in sorted(folder.iterdir()):
        if entry.is_dir():
            if entry.name not in ALLOWED_ROOT_DIRS:
                stray.append(entry.name + "/")
        elif entry.name not in ALLOWED_ROOT_FILES:
            stray.append(entry.name)
    if stray:
        warnings.append(
            "stray root entries (move candidates to candidates/ or exports/): " + ", ".join(stray)
        )


def check_status_evidence(folder: Path, status: str, errors: list[str], warnings: list[str]) -> None:
    if status not in ALLOWED_STATUSES:
        errors.append(f"brief.md status '{status}' is not an allowed pipeline status")
        return
    if status in EVIDENCE_STATUSES and not (folder / "comparison.png").exists():
        warnings.append(f"status '{status}' but comparison.png (reference vs accepted art) is missing")
    if status in PLAYTEST_STATUSES:
        playtest = folder / "playtest"
        if not playtest.is_dir() or not any(playtest.glob("*.png")):
            errors.append(f"status '{status}' requires playtest/ screenshots as evidence")



EYE_IOU_ERROR = 0.78
EYE_IOU_WARN = 0.88


def check_eyes(folder: Path, runtime: dict, errors: list[str], warnings: list[str], info: dict) -> None:
    """Eye checks per docs/studio/eyes.md: container structure, template
    reference discipline, and calibration IoU against the baked eye whites."""
    gaze = runtime.get("gaze")

    # Eyeless characters (e.g. the hexbrim boss: hat + cloak, no face) omit
    # the gaze section entirely; every eye check is skipped for them.
    if not gaze:
        return

    eyes = gaze.get("eyes") or {}
    emotions = gaze.get("emotions") or {}

    required = ("x", "y", "radiusX", "radiusY", "rotation", "cuts")
    for name in ("left", "right"):
        eye = eyes.get(name)
        if not isinstance(eye, dict) or any(key not in eye for key in required):
            errors.append(
                f"gaze.eyes.{name} missing container fields ({'/'.join(required)}); run tools/fit_eyes.py"
            )
            return

    if emotions.get("template") != "standard":
        errors.append("gaze.emotions.template must reference the shared 'standard' eye template")

    if emotions.get("overrides"):
        keys = ", ".join(sorted(emotions["overrides"]))
        warnings.append(f"gaze.emotions.overrides present ({keys}); expression forks are debt to converge")

    base_path = folder / "base.png"
    if not base_path.exists():
        return

    try:
        import numpy as np
        from PIL import Image
        import fit_eyes
    except Exception:
        warnings.append("eye calibration IoU check skipped (numpy/PIL not installed)")
        return

    image = Image.open(base_path)
    width, height = image.size
    mask = fit_eyes.load_white_mask(image)
    iou_values = {}

    for name in ("left", "right"):
        eye = eyes[name]
        ellipse = {
            "cx": eye["x"] * width,
            "cy": eye["y"] * height,
            "rx": eye["radiusX"] * width,
            "ry": eye["radiusY"] * height,
            "rotation": eye["rotation"],
        }
        container = fit_eyes.container_mask(ellipse, eye.get("cuts") or [], mask.shape)

        if not (mask & container).any():
            errors.append(f"gaze.eyes.{name}: container does not overlap any baked eye white")
            continue

        # Isolate the white blob(s) the container sits on: work in a padded
        # bbox around the container and keep components touching it.
        ys, xs = np.nonzero(container)
        pad_y = int((ys.max() - ys.min()) * 0.4) + 4
        pad_x = int((xs.max() - xs.min()) * 0.4) + 4
        y0, y1 = max(0, ys.min() - pad_y), min(height, ys.max() + pad_y)
        x0, x1 = max(0, xs.min() - pad_x), min(width, xs.max() + pad_x)
        local_mask = mask[y0:y1, x0:x1]
        local_container = container[y0:y1, x0:x1]
        blob = np.zeros_like(local_mask)

        for component in fit_eyes.connected_components(local_mask):
            if (component & local_container).any():
                blob |= component

        union = float(np.logical_or(blob, local_container).sum())
        iou = float(np.logical_and(blob, local_container).sum()) / union if union else 0.0
        iou_values[name] = round(iou, 3)

        if iou < EYE_IOU_ERROR:
            errors.append(
                f"gaze.eyes.{name}: container vs baked eye white IoU {iou:.2f} < {EYE_IOU_ERROR}; recalibrate with tools/fit_eyes.py"
            )
        elif iou < EYE_IOU_WARN:
            warnings.append(f"gaze.eyes.{name}: container vs eye white IoU {iou:.2f} (soft threshold {EYE_IOU_WARN})")

    if iou_values:
        info["eyeIou"] = iou_values


def audit_character(folder: Path) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    info: dict = {}

    brief_path = folder / "brief.md"
    rig_path = folder / "rig.json"

    status = "unknown"
    locked_reference = ""
    if brief_path.exists():
        frontmatter = parse_frontmatter(brief_path.read_text(encoding="utf-8"))
        status = str(frontmatter.get("status", "unknown"))
        locked_reference = str(frontmatter.get("lockedReference", "") or "")
        info["status"] = status
        check_status_evidence(folder, status, errors, warnings)
    else:
        errors.append("brief.md is missing")

    if rig_path.exists():
        try:
            rig = json.loads(rig_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"rig.json is not valid JSON: {exc}")
            rig = {}
        if rig:
            check_base_image(folder, rig, errors, warnings, info)
            base_image = (rig.get("base") or {}).get("image")
            if base_image and locked_reference:
                check_palette_against_reference(folder, str(base_image), locked_reference, warnings, info)
            if "status" in rig:
                warnings.append("rig.json contains a 'status' field; status belongs in brief.md only")
            if isinstance(rig.get("runtime"), dict):
                check_eyes(folder, rig["runtime"], errors, warnings, info)
    else:
        errors.append("rig.json is missing")

    check_folder_hygiene(folder, warnings)

    return {"errors": errors, "warnings": warnings, "info": info}


def find_character_folders() -> list[Path]:
    folders = []
    for entry in sorted(CHARACTERS_ROOT.iterdir()):
        if not entry.is_dir() or entry.name.startswith("_"):
            continue
        if (entry / "brief.md").exists() or (entry / "rig.json").exists():
            folders.append(entry)
    return folders


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="print the JSON report to stdout")
    parser.add_argument("character", nargs="?", help="only audit a single character id")
    args = parser.parse_args()

    folders = find_character_folders()
    if args.character:
        folders = [folder for folder in folders if folder.name == args.character]
        if not folders:
            print(f"unknown character: {args.character}", file=sys.stderr)
            return 2

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "characters": {folder.name: audit_character(folder) for folder in folders},
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        total_errors = 0
        for name, result in report["characters"].items():
            total_errors += len(result["errors"])
            marker = "FAIL" if result["errors"] else ("WARN" if result["warnings"] else "OK  ")
            print(f"[{marker}] {name} (status: {result['info'].get('status', '?')})")
            for message in result["errors"]:
                print(f"       ERROR: {message}")
            for message in result["warnings"]:
                print(f"       warn:  {message}")
        print(f"\nreport written to {REPORT_PATH.relative_to(REPO_ROOT)}")
        if total_errors:
            print(f"{total_errors} blocking error(s).")

    return 1 if any(result["errors"] for result in report["characters"].values()) else 0


if __name__ == "__main__":
    sys.exit(main())
