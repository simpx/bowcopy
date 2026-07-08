#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path
from typing import Any


def png_size(path: Path) -> tuple[int, int] | None:
    try:
        with path.open("rb") as handle:
            signature = handle.read(8)
            if signature != b"\x89PNG\r\n\x1a\n":
                return None
            length = handle.read(4)
            chunk_type = handle.read(4)
            if len(length) != 4 or chunk_type != b"IHDR":
                return None
            width, height = struct.unpack(">II", handle.read(8))
            return width, height
    except OSError:
        return None


def add_error(errors: list[str], message: str) -> None:
    errors.append(f"ERROR: {message}")


def add_warning(warnings: list[str], message: str) -> None:
    warnings.append(f"WARN: {message}")


def check_image_entry(
    character_dir: Path,
    rig_section: dict[str, Any],
    section_name: str,
    errors: list[str],
    warnings: list[str],
) -> None:
    image = rig_section.get("image")
    if not image:
        return
    path = character_dir / str(image)
    if not path.exists():
        add_error(errors, f"{section_name}.image points to missing file: {image}")
        return
    size = png_size(path)
    if size is None:
        add_warning(warnings, f"{section_name}.image is not a readable PNG: {image}")
        return
    rig_size = rig_section.get("imageSize")
    expected = {"width": size[0], "height": size[1]}
    if rig_size is None:
        add_warning(warnings, f"{section_name}.imageSize is null for {image}; actual size is {expected}")
    elif rig_size != expected:
        add_error(errors, f"{section_name}.imageSize is {rig_size}, expected {expected} for {image}")


def audit(character_dir: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    brief_path = character_dir / "brief.md"
    rig_path = character_dir / "rig.json"
    tuning_path = character_dir / "tuning.html"
    comparison_path = character_dir / "comparison.png"

    if not brief_path.exists():
        add_error(errors, "missing brief.md")
        brief = ""
    else:
        brief = brief_path.read_text(encoding="utf-8")

    if not rig_path.exists():
        add_error(errors, "missing rig.json")
        rig: dict[str, Any] = {}
    else:
        try:
            rig = json.loads(rig_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            add_error(errors, f"invalid rig.json: {exc}")
            rig = {}

    status = rig.get("status")
    if not isinstance(status, str):
        for line in brief.splitlines():
            if line.startswith("status:"):
                status = line.split(":", 1)[1].strip()
                break
    if "projectContext: bowbert" not in brief and rig.get("projectContext") != "bowbert":
        add_error(errors, "missing Bowbert project context; add projectContext: bowbert to brief.md or rig.json")
    brief_lower = brief.lower()
    if status in {"tuned", "done"} and "low-resolution" in brief_lower and "useracceptedreferencecrop: true" not in brief_lower:
        add_error(errors, "status is tuned/done while brief.md still describes low-resolution crop cleanup replacement; use needs-review or record explicit userAcceptedReferenceCrop: true")

    source_files = sorted((character_dir / "source").glob("reference-*")) if (character_dir / "source").exists() else []
    if not source_files:
        add_warning(warnings, "no source/reference-* files found")
    for source in source_files:
        rel = source.relative_to(character_dir).as_posix()
        if rel not in brief:
            add_error(errors, f"brief.md does not list copied source reference: {rel}")

    base_file = character_dir / "base.png"
    base = rig.get("base", {}) if isinstance(rig.get("base"), dict) else {}
    if base_file.exists() and not base.get("image"):
        add_error(errors, "base.png exists but rig.base.image is null")
    if base_file.exists() and not tuning_path.exists():
        add_warning(warnings, "base.png exists but tuning.html is missing")
    if base_file.exists() and status in {"asset-generated", "rigged", "tuned", "done"}:
        if not comparison_path.exists():
            add_error(errors, f"status is {status} with accepted base.png but comparison.png is missing")
        elif png_size(comparison_path) is None:
            add_error(errors, "comparison.png exists but is not a readable PNG")
    check_image_entry(character_dir, base, "base", errors, warnings)

    projectiles = rig.get("projectiles", {}) if isinstance(rig.get("projectiles"), dict) else {}
    gaze = rig.get("gaze", {}) if isinstance(rig.get("gaze"), dict) else {}
    if gaze.get("baseHasBakedDefaultPupils") is True:
        add_error(errors, "rig.gaze.baseHasBakedDefaultPupils is true; runtime-gaze characters need a clean pupil-free base or needs-review status")

    projectile_dir = character_dir / "projectiles"
    if projectile_dir.exists():
        for projectile_file in sorted(projectile_dir.glob("*.png")):
            if projectile_file.name.endswith("-source.png"):
                continue
            key = projectile_file.stem
            entry = projectiles.get(key)
            if not isinstance(entry, dict) or not entry.get("image"):
                add_error(errors, f"{projectile_file.relative_to(character_dir).as_posix()} exists but rig.projectiles.{key}.image is null")
            if tuning_path.exists() and projectile_file.relative_to(character_dir).as_posix() not in tuning_path.read_text(encoding="utf-8", errors="ignore"):
                add_warning(warnings, f"tuning.html does not reference {projectile_file.relative_to(character_dir).as_posix()}")
    for key, entry in projectiles.items():
        if isinstance(entry, dict):
            check_image_entry(character_dir, entry, f"projectiles.{key}", errors, warnings)

    motion = rig.get("motion", {}) if isinstance(rig.get("motion"), dict) else {}
    if status in {"rigged", "tuned", "runtime-integrated", "done"} and not motion:
        add_warning(warnings, "rig has ready status but motion is empty; Bowbert characters usually need procedural motion fields")
    sheet_phrases = (
        "generate sprite sheet",
        "generate a sprite sheet",
        "walk sprite sheet",
        "attack sprite sheet",
        "sprite-sheet animation",
    )
    if any(phrase in brief_lower for phrase in sheet_phrases):
        add_warning(warnings, "brief appears to plan sprite-sheet animation; Bowbert current characters should use runtime procedural motion unless explicitly requested")

    if "Negative prompt:" in brief or "Positive prompt:" in brief:
        add_warning(warnings, "brief.md uses old Positive/Negative prompt headings; use Layer contract, Generation prompt, Boundary notes, and Acceptance checks")
    if "Prompt packets:" not in brief and "Image generation prompt packets:" not in brief:
        add_warning(warnings, "brief.md does not contain prompt packets")
    elif "Generation prompt:" not in brief:
        add_warning(warnings, "brief.md prompt packets should include Generation prompt sections")
    elif "Layer contract:" not in brief:
        add_warning(warnings, "brief.md prompt packets should include Layer contract sections")

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit a self-contained 2D character asset folder.")
    parser.add_argument("character_dir", help="Path to assets/characters/<character-id>.")
    args = parser.parse_args()

    character_dir = Path(args.character_dir)
    errors, warnings = audit(character_dir)

    for message in errors + warnings:
        print(message)

    if errors:
        print(f"FAIL: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(f"PASS: 0 error(s), {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
