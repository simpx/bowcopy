#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import struct
import subprocess
import sys
from pathlib import Path
from typing import Any


STATUS_ORDER = [
    "brief",
    "concept-generated",
    "reference-locked",
    "asset-generated",
    "rigged",
    "tuned",
    "runtime-integrated",
    "playtested",
    "done",
]

TEXT_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".html", ".css"}


def slug_parts(value: str) -> list[str]:
    return [part for part in re.split(r"[^A-Za-z0-9]+", value) if part]


def to_camel(value: str) -> str:
    parts = slug_parts(value)
    if not parts:
        return value
    return parts[0].lower() + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def to_pascal(value: str) -> str:
    return "".join(part[:1].upper() + part[1:] for part in slug_parts(value))


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def parse_frontmatter(markdown: str) -> dict[str, str]:
    if not markdown.startswith("---"):
        return {}
    lines = markdown.splitlines()
    if len(lines) < 3:
        return {}
    end = None
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            end = index
            break
    if end is None:
        return {}
    result: dict[str, str] = {}
    for line in lines[1:end]:
        if ":" not in line or line.startswith(" "):
            continue
        key, value = line.split(":", 1)
        result[key.strip()] = value.strip()
    return result


def png_size(path: Path) -> dict[str, int] | None:
    try:
        with path.open("rb") as handle:
            if handle.read(8) != b"\x89PNG\r\n\x1a\n":
                return None
            _length = handle.read(4)
            chunk_type = handle.read(4)
            if chunk_type != b"IHDR":
                return None
            width, height = struct.unpack(">II", handle.read(8))
    except OSError:
        return None
    return {"width": width, "height": height}


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "package.json").exists() and (candidate / "src").exists():
            return candidate
    return Path.cwd().resolve()


def resolve_character_dir(repo: Path, arg: str) -> Path:
    path = Path(arg)
    if path.exists():
        return path.resolve()
    return (repo / "assets" / "characters" / arg).resolve()


def add_check(checks: dict[str, dict[str, str]], name: str, status: str, detail: str) -> None:
    checks[name] = {"status": status, "detail": detail}


def status_value(checks: dict[str, dict[str, str]], name: str) -> str:
    return checks.get(name, {}).get("status", "missing")


def src_files(repo: Path) -> list[Path]:
    src = repo / "src"
    if not src.exists():
        return []
    return [
        path
        for path in src.rglob("*")
        if path.is_file() and path.suffix in TEXT_EXTENSIONS and "node_modules" not in path.parts
    ]


def file_contains(path: Path, needles: list[str]) -> bool:
    text = read_text(path)
    return any(needle and needle in text for needle in needles)


def any_src_contains(repo: Path, needles: list[str], subdir: str | None = None) -> list[str]:
    root = repo / "src" / subdir if subdir else repo / "src"
    if not root.exists():
        return []
    matches: list[str] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix not in TEXT_EXTENSIONS:
            continue
        if file_contains(path, needles):
            matches.append(path.relative_to(repo).as_posix())
    return matches


def run_generate2dcharacter_audit(character_dir: Path) -> tuple[str, str]:
    audit_script = Path.home() / ".codex" / "skills" / "generate2dcharacter" / "scripts" / "audit_character.py"
    if not audit_script.exists():
        return "missing", "generate2dcharacter audit script not found"
    try:
        result = subprocess.run(
            [sys.executable, str(audit_script), str(character_dir)],
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return "fail", f"audit could not run: {exc}"
    output = (result.stdout + result.stderr).strip()
    if result.returncode == 0:
        return "pass", output or "audit passed"
    return "fail", output or f"audit failed with exit code {result.returncode}"


def infer_declared_status(frontmatter: dict[str, str], rig: dict[str, Any]) -> str:
    for value in [frontmatter.get("status"), rig.get("status")]:
        if isinstance(value, str) and value:
            return value
    return "unknown"


def evidence_playtest(character_dir: Path) -> list[str]:
    evidence: list[str] = []
    for pattern in ["*playtest*.png", "*playtest*.jpg", "*runtime*.png", "*in-game*.png"]:
        evidence.extend(path.relative_to(character_dir).as_posix() for path in character_dir.rglob(pattern))
    pipeline = character_dir / "pipeline.md"
    if pipeline.exists() and "playtest" in read_text(pipeline).lower():
        evidence.append("pipeline.md")
    return sorted(set(evidence))


def infer_actual_status(
    declared: str,
    checks: dict[str, dict[str, str]],
    blocking: list[str],
    warnings: list[str],
) -> str:
    if status_value(checks, "characterDir") == "fail":
        return "needs-review"
    if status_value(checks, "brief") == "missing" and status_value(checks, "rig") == "missing":
        return "brief"
    if status_value(checks, "audit") == "fail":
        return "needs-review"
    if blocking:
        return "needs-review"
    if status_value(checks, "playtest") == "pass":
        if declared == "done" and not warnings:
            return "done"
        return "playtested"
    if status_value(checks, "sceneSpawn") == "pass" and status_value(checks, "renderer") == "pass":
        return "runtime-integrated"
    if status_value(checks, "tuning") == "pass" and status_value(checks, "rigBackfill") == "pass":
        return "tuned" if declared in {"tuned", "runtime-integrated", "playtested", "done"} else "rigged"
    if status_value(checks, "base") == "pass":
        return "asset-generated"
    if status_value(checks, "reference") == "pass":
        return "reference-locked"
    if status_value(checks, "concept") == "pass":
        return "concept-generated"
    return "brief"


def next_step_for(status: str) -> str:
    return {
        "brief": "create or collect concept/reference art",
        "concept-generated": "choose and lock source/reference-01.png",
        "reference-locked": "use generate2dcharacter to generate base/projectile/attachment assets",
        "asset-generated": "backfill rig.json, build tuning.html, and run character audit",
        "rigged": "review tuning.html and save accepted tuning values",
        "tuned": "integrate into Phaser runtime",
        "runtime-integrated": "run browser playtest and capture evidence",
        "playtested": "update status/open items and commit when requested",
        "done": "no required next step",
        "needs-review": "fix blocking items before promotion",
    }.get(status, "inspect character folder")


def audit_character(repo: Path, character_arg: str) -> dict[str, Any]:
    character_dir = resolve_character_dir(repo, character_arg)
    character_id = character_dir.name
    camel = to_camel(character_id)
    pascal = to_pascal(character_id)
    checks: dict[str, dict[str, str]] = {}
    blocking: list[str] = []
    warnings: list[str] = []
    evidence: dict[str, Any] = {}

    if character_dir.exists() and character_dir.is_dir():
        add_check(checks, "characterDir", "pass", character_dir.relative_to(repo).as_posix() if character_dir.is_relative_to(repo) else str(character_dir))
    else:
        add_check(checks, "characterDir", "fail", f"missing character folder: {character_dir}")
        blocking.append("Create assets/characters/<id>/ or pass a valid character folder.")

    brief_path = character_dir / "brief.md"
    rig_path = character_dir / "rig.json"
    brief = read_text(brief_path)
    frontmatter = parse_frontmatter(brief)
    rig = read_json(rig_path)
    declared = infer_declared_status(frontmatter, rig)

    if brief_path.exists():
        add_check(checks, "brief", "pass", "brief.md exists")
    else:
        add_check(checks, "brief", "missing", "brief.md missing")

    if rig_path.exists() and rig:
        add_check(checks, "rig", "pass", "rig.json exists and parses")
    elif rig_path.exists():
        add_check(checks, "rig", "fail", "rig.json exists but does not parse")
        blocking.append("Fix invalid rig.json.")
    else:
        add_check(checks, "rig", "missing", "rig.json missing")

    source_dir = character_dir / "source"
    source_refs = sorted(source_dir.glob("reference-*")) if source_dir.exists() else []
    locked_reference = frontmatter.get("lockedReference") or rig.get("lockedReference")
    locked_path = character_dir / str(locked_reference) if isinstance(locked_reference, str) and locked_reference and locked_reference != "null" else None
    if locked_path and locked_path.exists():
        add_check(checks, "reference", "pass", locked_path.relative_to(character_dir).as_posix())
    elif source_refs:
        add_check(checks, "concept", "pass", f"{len(source_refs)} source reference candidate(s)")
        add_check(checks, "reference", "warn", "source references exist but lockedReference is missing or invalid")
        warnings.append("Choose a locked reference before final asset generation.")
    else:
        add_check(checks, "concept", "missing", "no source/reference-* files")
        add_check(checks, "reference", "missing", "no locked reference evidence")

    base_path = character_dir / "base.png"
    if base_path.exists():
        size = png_size(base_path)
        size_detail = f" ({size['width']}x{size['height']})" if size else ""
        add_check(checks, "base", "pass", f"base.png exists{size_detail}")
    else:
        add_check(checks, "base", "missing", "base.png missing")

    comparison_path = character_dir / "comparison.png"
    add_check(
        checks,
        "comparison",
        "pass" if comparison_path.exists() else "missing",
        "comparison.png exists" if comparison_path.exists() else "comparison.png missing",
    )

    tuning_path = character_dir / "tuning.html"
    add_check(
        checks,
        "tuning",
        "pass" if tuning_path.exists() else "missing",
        "tuning.html exists" if tuning_path.exists() else "tuning.html missing",
    )

    rig_base = rig.get("base") if isinstance(rig.get("base"), dict) else {}
    rig_base_image = rig_base.get("image") if isinstance(rig_base, dict) else None
    rig_base_size = rig_base.get("imageSize") if isinstance(rig_base, dict) else None
    if rig_base_image:
        image_path = character_dir / str(rig_base_image)
        if image_path.exists() and isinstance(rig_base_size, dict):
            actual_size = png_size(image_path)
            if actual_size and actual_size != rig_base_size:
                add_check(checks, "rigBackfill", "fail", f"rig imageSize {rig_base_size} does not match {actual_size}")
                blocking.append("Update rig.json base.imageSize to match the accepted PNG.")
            else:
                add_check(checks, "rigBackfill", "pass", f"rig references {rig_base_image}")
        elif image_path.exists():
            add_check(checks, "rigBackfill", "warn", "rig base.image exists but imageSize is missing")
            warnings.append("Backfill base.imageSize in rig.json.")
        else:
            add_check(checks, "rigBackfill", "fail", f"rig base.image points to missing file: {rig_base_image}")
            blocking.append("Fix rig.json base.image path.")
    elif base_path.exists():
        add_check(checks, "rigBackfill", "fail", "base.png exists but rig.base.image is missing")
        blocking.append("Backfill rig.json with accepted base.png.")
    else:
        add_check(checks, "rigBackfill", "missing", "no accepted base image to backfill")

    if "Negative prompt:" in brief or "Positive prompt:" in brief:
        add_check(checks, "promptFormat", "warn", "brief.md uses old Positive/Negative prompt headings")
        warnings.append("Update prompt packets to Layer contract / Generation prompt / Boundary notes.")
    elif "Layer contract:" in brief and "Generation prompt:" in brief:
        add_check(checks, "promptFormat", "pass", "new prompt packet format present")
    else:
        add_check(checks, "promptFormat", "missing", "prompt packet format not detected")

    audit_status, audit_detail = run_generate2dcharacter_audit(character_dir)
    add_check(checks, "audit", audit_status, audit_detail)

    runtime_rig_path = repo / "src" / "characters" / f"{camel}Rig.ts"
    runtime_rig_matches = any_src_contains(repo, [character_id, camel, pascal], "characters")
    if runtime_rig_path.exists():
        add_check(checks, "runtimeRig", "pass", runtime_rig_path.relative_to(repo).as_posix())
    elif runtime_rig_matches:
        add_check(checks, "runtimeRig", "pass", ", ".join(runtime_rig_matches[:3]))
    else:
        add_check(checks, "runtimeRig", "missing", "no src/characters rig evidence")

    renderer_path = repo / "src" / "render" / "enemies" / f"{pascal}Renderer.ts"
    renderer_matches = any_src_contains(repo, [character_id, camel, pascal], "render")
    if renderer_path.exists():
        add_check(checks, "renderer", "pass", renderer_path.relative_to(repo).as_posix())
    elif renderer_matches:
        add_check(checks, "renderer", "pass", ", ".join(renderer_matches[:3]))
    else:
        add_check(checks, "renderer", "missing", "no renderer evidence")

    system_path = repo / "src" / "sim" / "enemies" / f"{pascal}System.ts"
    system_precedent = rig.get("prototype", {}).get("systemPrecedent") if isinstance(rig.get("prototype"), dict) else None
    if system_path.exists():
        add_check(checks, "system", "pass", system_path.relative_to(repo).as_posix())
    elif isinstance(system_precedent, str) and system_precedent:
        add_check(checks, "system", "pass", f"reuses {system_precedent}")
    else:
        system_matches = any_src_contains(repo, [character_id, pascal], "sim")
        add_check(
            checks,
            "system",
            "pass" if system_matches else "missing",
            ", ".join(system_matches[:3]) if system_matches else "no system evidence",
        )

    scene_path = repo / "src" / "game" / "scenes" / "CombatRoomScene.ts"
    scene_needles = [character_id, f"{pascal}Renderer", f"preload{pascal}Assets", f"'{character_id}'"]
    if scene_path.exists() and file_contains(scene_path, scene_needles):
        add_check(checks, "sceneSpawn", "pass", scene_path.relative_to(repo).as_posix())
    else:
        add_check(checks, "sceneSpawn", "missing", "CombatRoomScene spawn/render wiring not detected")

    playtest_evidence = evidence_playtest(character_dir)
    if playtest_evidence:
        add_check(checks, "playtest", "pass", ", ".join(playtest_evidence[:5]))
    else:
        add_check(checks, "playtest", "missing", "no playtest screenshot or pipeline.md evidence")

    evidence["runtimeSearch"] = {
        "camel": camel,
        "pascal": pascal,
        "runtimeRigMatches": runtime_rig_matches,
        "rendererMatches": renderer_matches,
    }
    evidence["sourceReferences"] = [path.relative_to(character_dir).as_posix() for path in source_refs]

    actual = infer_actual_status(declared, checks, blocking, warnings)

    return {
        "id": character_id,
        "path": str(character_dir),
        "declaredStatus": declared,
        "actualStatus": actual,
        "nextStep": next_step_for(actual),
        "checks": checks,
        "blockingItems": blocking,
        "warnings": warnings,
        "evidence": evidence,
    }


def print_human(report: dict[str, Any]) -> None:
    print(f"{report['id']}: {report['actualStatus']} (declared: {report['declaredStatus']})")
    print(f"next: {report['nextStep']}")
    if report["blockingItems"]:
        print("blocking:")
        for item in report["blockingItems"]:
            print(f"- {item}")
    if report["warnings"]:
        print("warnings:")
        for item in report["warnings"]:
            print(f"- {item}")
    print("checks:")
    for name, check in report["checks"].items():
        print(f"- {name}: {check['status']} - {check['detail'].splitlines()[0] if check['detail'] else ''}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit Bowbert character pipeline state.")
    parser.add_argument("character", help="Character id or assets/characters/<id> folder.")
    parser.add_argument("--repo", default=".", help="Bowbert repo root. Defaults to current directory.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    args = parser.parse_args()

    repo = find_repo_root(Path(args.repo))
    report = audit_character(repo, args.character)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print_human(report)

    return 1 if report["blockingItems"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
