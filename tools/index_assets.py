#!/usr/bin/env python3
"""Builds assets/index.json — the reuse catalog for AI-driven production.

Before generating any new art, projectile, VFX, or sound, the agent should
consult this index to find an existing asset to reuse or derive from.

    python3 tools/index_assets.py           # writes assets/index.json
    python3 tools/index_assets.py --print   # also prints to stdout
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS = REPO_ROOT / "assets"
INDEX_PATH = ASSETS / "index.json"

AUDIO_EXTENSIONS = {".ogg", ".wav", ".mp3"}
IMAGE_EXTENSIONS = {".png"}


def rel(path: Path) -> str:
    return str(path.relative_to(REPO_ROOT))


def read_brief_status(folder: Path) -> str:
    brief = folder / "brief.md"
    if not brief.exists():
        return "unknown"
    text = brief.read_text(encoding="utf-8")
    if text.startswith("---"):
        for line in text.split("\n---", 1)[0].splitlines():
            if line.startswith("status:"):
                return line.split(":", 1)[1].strip()
    return "unknown"


def index_characters() -> list[dict]:
    entries = []
    root = ASSETS / "characters"
    for folder in sorted(root.iterdir()):
        if not folder.is_dir() or folder.name.startswith("_"):
            continue
        if not (folder / "rig.json").exists() and not (folder / "brief.md").exists():
            continue
        entry = {
            "type": "character",
            "id": folder.name,
            "path": rel(folder),
            "status": read_brief_status(folder),
            "base": rel(folder / "base.png") if (folder / "base.png").exists() else None,
            "projectiles": sorted(
                rel(p) for p in (folder / "projectiles").glob("*.png") if (folder / "projectiles").is_dir()
            ),
            "attachments": sorted(
                rel(p) for p in (folder / "attachments").glob("*.png") if (folder / "attachments").is_dir()
            ),
        }
        entries.append(entry)
    return entries


def index_simple_folders(kind: str, root: Path) -> list[dict]:
    entries = []
    if not root.is_dir():
        return entries
    for folder in sorted(root.iterdir()):
        if not folder.is_dir() or folder.name.startswith("_"):
            continue
        files = sorted(rel(p) for p in folder.rglob("*") if p.suffix in IMAGE_EXTENSIONS)
        entries.append(
            {
                "type": kind,
                "id": folder.name,
                "path": rel(folder),
                "images": files,
                "hasRig": (folder / "rig.json").exists(),
            }
        )
    return entries


def index_audio() -> list[dict]:
    entries = []
    root = ASSETS / "audio" / "sfx" / "game"
    if not root.is_dir():
        return entries
    manifest = {}
    manifest_path = root / "manifest.json"
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            manifest = {}
    for path in sorted(root.iterdir()):
        if path.suffix not in AUDIO_EXTENSIONS:
            continue
        entries.append(
            {
                "type": "sfx",
                "id": path.stem,
                "path": rel(path),
                # tags come from the filename convention: hit_*, walk_*, shoot_* ...
                "tags": path.stem.split("_"),
                "inManifest": path.name in json.dumps(manifest),
            }
        )
    return entries


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--print", action="store_true", dest="print_index")
    args = parser.parse_args()

    index = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "note": "Reuse catalog. Consult before generating new assets; regenerate with tools/index_assets.py.",
        "characters": index_characters(),
        "projectiles": index_simple_folders("projectile", ASSETS / "projectiles"),
        "weapons": index_simple_folders("weapon", ASSETS / "weapons"),
        "sfx": index_audio(),
    }

    INDEX_PATH.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    counts = {key: len(value) for key, value in index.items() if isinstance(value, list)}
    print(f"assets/index.json written: {counts}")

    if args.print_index:
        print(json.dumps(index, indent=2, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
