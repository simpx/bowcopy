#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


STATUS_VALUES = {
    "brief",
    "reference-locked",
    "asset-generated",
    "rigged",
    "tuned",
    "runtime-integrated",
    "needs-review",
    "done",
}

PATTERN_VALUES = {
    "bowbert-player",
    "dart-goober",
    "project-enemy",
    "spore-mushroom",
}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "character"


def relative_or_null(path: str | None) -> str | None:
    if not path:
        return None
    return path


def write_text_once(path: Path, content: str, force: bool) -> None:
    if path.exists() and not force:
        return
    path.write_text(content, encoding="utf-8")


def write_json_once(path: Path, data: dict, force: bool) -> None:
    if path.exists() and not force:
        return
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def yaml_list(values: list[str], indent: str = "") -> str:
    if not values:
        return "[]"
    return "\n" + "\n".join(f"{indent}- {value}" for value in values)


def markdown_reference_list(values: list[str]) -> str:
    if not values:
        return "- TODO: add locked reference paths in `source/`."
    return "\n".join(f"- `{value}`" for value in values)


def prompt_input_list(values: list[str]) -> str:
    if not values:
        return "- `source/reference-01.png`"
    return "\n".join(f"- `{value}`" for value in values)


def brief_template(
    name: str,
    kind: str,
    status: str,
    locked_references: list[str],
    pattern: str,
) -> str:
    locked_reference_value = locked_references[0] if locked_references else "null"
    source_references = yaml_list(locked_references, "  ")
    reference_notes = markdown_reference_list(locked_references)
    base_inputs = locked_references[:1] if pattern == "spore-mushroom" else locked_references
    prompt_inputs = prompt_input_list(base_inputs)
    if pattern == "spore-mushroom":
        spore_inputs = prompt_input_list(locked_references[1:])
        role = "Enemy: spore-firing mushroom."
        base_layer_contract = """- Fixed mushroom body base.
- Reference-correct blank eye whites or sockets are baked into the body when they define the face.
- Runtime owns black pupils, spirals, dizzy gaze, spore motion, squash, and comet trail."""
        base_positive = "Use the image just shown as the visual reference. Create a transparent-background top-down 2D game sprite matching the locked mushroom reference. Preserve the exact mushroom silhouette, posture, outline weight, color blocking, eye white/socket placement, cap spots, stem, legs, and scale relationship. Create a clean reusable base layer for Bowbert runtime animation and expression overlays."
        base_acceptance = """- Silhouette and palette match the locked reference.
- Eye whites or sockets match the reference, but black pupils/spirals are absent so runtime gaze can own expressions.
- Transparent PNG, tight crop with enough room for protrusions."""
        decomposition = """- base.png: fixed mushroom body. Keep eye whites/sockets if they define the face; leave pupils/spirals for runtime if expressions change.
- projectiles/spore.png: single reusable spore core, transparent background; runtime owns the trail.
- attachments/: usually empty unless the reference has separable hats, weapons, or props.
- runtime: embedded pupils, angry/aim/hit/dizzy gaze, idle bob, charge squash, release squash, hit squash, four-way comet trail."""
        runtime_notes = """- gaze: embedded-eye-pupils with default/angry-or-aim/hit/dizzy emotions.
- motion: idle bob, idle squash, charge squash, release squash, hit squash.
- spores: origin offset, burst distance, travelMs, lingerMs, trailLength, trailWidth, trailColor.
- vfx: comet trail appears while spores move and fades/stops after arrival."""
        projectile_prompt = f"""### projectiles/spore.png

Inputs:
{spore_inputs}

Mode: image-to-image, high reference fidelity.

Layer contract:
- Reusable spore projectile core.
- Runtime owns travel path, comet trail, linger, fade, and hit behavior.

Generation prompt:
> Use the image just shown as the visual reference. Create one transparent-background top-down 2D game projectile sprite: a clean reusable spore core matching the locked reference color, outline weight, spot pattern, and simple Bowbert doodle style. Keep the core centered, readable, and ready for runtime comet-trail VFX.

Boundary notes:
> Single projectile core, transparent background, clean edges, mobile-readable silhouette, generous crop padding.

Acceptance checks:
- The spore core reads at mobile scale.
- It can be reused by runtime trail/VFX.
- Transparent PNG, tight crop."""
    elif pattern == "bowbert-player":
        role = "Playable archer: Bowbert."
        base_layer_contract = """- Stable front-facing Bowbert body base.
- Eye workflow is documented as attached-eye or embedded-eye before tuning.
- Bow, arrows, recoil, aim, and attack effects are runtime attachment/gameplay layers."""
        base_positive = "Use the image just shown as the visual reference. Create a transparent-background Bowbert project player body sprite matching the locked reference. Preserve the upright front-facing orange hood/body, green leaf cap, red leaf, brown lower face, large white eye sockets, thick black outline, tiny legs, and simple doodle color blocks. Create a clean reusable body base for runtime eye gaze, bow placement, squash, bob, recoil, and dodge stretch."
        base_acceptance = """- Front-facing body remains upright and not tilted.
- Bow/arrow are absent from body art.
- Eye whites/sockets remain, but black pupils are absent so runtime gaze can own expressions.
- Transparent PNG, tight crop with enough room for external edge eyes and feet."""
        decomposition = """- base.png: fixed Bowbert body, front-facing, ready for runtime bow and gaze layers.
- attachments/bow: procedural branch bow placement values.
- attachments/eyes: runtime pupils over baked eye whites/sockets.
- projectiles/: arrow art remains runtime/game asset, not part of body.
- runtime: aim gaze, walk squash, idle squash, dodge stretch, hit squash, recoil, walk bob, velocity tilt."""
        runtime_notes = """- gaze: attached-eye-pupils, round-external, default/aim/focused/alert/scared/confused/squint/hit.
- motion: walkSquash 0.045, idleSquash 0.018, hitSquash 0.1, dodgeStretch 0.14, walkBob 2, recoilX 5, recoilY 3, tiltVelocity 0.06.
- bow: procedural branch bow, placement around the player, release recoil, no idle arrow.
- input: left joystick/WASD movement; right aim/mouse aim controls bow direction."""
        projectile_prompt = """### attachments/bow

Inputs:
- TODO: use accepted branch bow tuning or source reference when available.

Mode: procedural-canvas attachment or accepted bow asset migration.

Layer contract:
- Runtime bow attachment.
- Placement, recoil, draw state, and idle/attack visibility are stored in `rig.json`.

Generation prompt:
> Create a separate Bowbert project branch bow attachment with a branch-like doodle silhouette, readable black outline, warm wood color, and clean centered transparent framing. Preserve the existing draw/release visual language and runtime rotation around the player.

Boundary notes:
> Bow attachment only, transparent background, centered around its runtime anchor, clean padding for draw/release motion.

Acceptance checks:
- Bow is separate from body.
- Placement and recoil values are stored in rig.json.
- Runtime can show no arrow when idle and arrow/draw effect only while attacking."""
    elif pattern == "dart-goober":
        role = "Enemy: ranged wooden mask goober."
        base_layer_contract = """- Fixed Goober mask/body base.
- Reference-correct blank white eye sockets are baked into the body.
- Runtime owns black cut-ellipse gaze, pupils, muzzle charge, darts, and attack feedback."""
        base_positive = "Use the image just shown as the visual reference. Create a transparent-background Bowbert project enemy body sprite matching the locked goober reference. Preserve the squat mask/body silhouette, thick black outline, simple color blocks, slanted blank eye sockets/whites, and doodle proportions. Create a clean reusable base layer for runtime embedded-eye expressions."
        base_acceptance = """- Silhouette and palette match the locked goober reference.
- Reference-correct eye whites/sockets are baked, and runtime pupils/cut-ellipse expressions remain controllable.
- Dart muzzle/projectile effects are not baked into body art.
- Transparent PNG, tight crop with enough room for feet and side eye protrusions."""
        decomposition = """- base.png: fixed goober body/mask with baked sockets/whites.
- attachments/eyes: runtime cut-ellipse pupils/expressions.
- projectiles/dart.png: optional reusable dart projectile core.
- runtime: angry/aim/hit gaze, idle/walk bob, walk squash, velocity tilt, muzzle charge."""
        runtime_notes = """- gaze: embedded-eye-pupils, angry-embedded, cut-ellipse default/angry/aim plus alert/scared/hit.
- motion: idleBob 2, walkBob 2, walkSquash 0.065, idleSquash 0.018, hitScaleX 0.08, hitScaleY 0.04, walkTilt 0.05, velocityTilt 0.08.
- attack: anticipation 0.11, chargeShift 5, muzzleX 27, muzzleY -20, muzzleAimY 16, muzzleRadius 9, muzzleScaleBase 0.45, muzzleScaleCharge 0.95, muzzleAlphaBase 0.1, muzzleAlphaCharge 0.45."""
        projectile_prompt = """### projectiles/dart.png

Inputs:
- TODO: add dart projectile reference when available.

Mode: image-to-image when a projectile reference exists.

Layer contract:
- Reusable dart projectile core.
- Runtime owns trajectory, trail, impact, and muzzle charge.

Generation prompt:
> Create a transparent-background Bowbert project dart projectile core with a simple doodle shape, thick outline, and mobile-readable silhouette. Match the goober attack style and keep the projectile centered for runtime trajectory and impact handling.

Boundary notes:
> Single projectile core, transparent background, clean crop, enough padding for runtime trail and impact layering.

Acceptance checks:
- Projectile is separate from body and attack charge.
- Runtime can add trail/impact separately."""
    else:
        role = "Bowbert project enemy."
        base_layer_contract = """- Fixed enemy body base.
- Attachments, projectiles, runtime gaze, trails, particles, squash/stretch, and attack timing are separate when the design requires them.
- Confirmed eye whites or sockets are baked when they are part of the stable face structure."""
        base_positive = "Use the image just shown as the visual reference. Create a transparent-background Bowbert project top-down doodle enemy sprite matching the locked reference. Preserve exact silhouette, posture, thick black outline, simple color blocking, focal face/eye features, and scale relationship. Create a clean reusable base layer for Bowbert runtime squash/stretch, bob, tilt, hit, and expression overlays."
        base_acceptance = """- Silhouette and palette match the locked reference.
- Runtime-changing parts are separated when practical.
- Transparent PNG, tight crop with enough room for protrusions."""
        decomposition = """- base.png: fixed enemy body.
- attachments/: only independently positioned art such as eyes, weapon, shell, hat, or props.
- projectiles/: reusable projectile cores; runtime owns trails and motion.
- vfx/: runtime trail/particle notes if separate assets are needed.
- runtime: gaze, squash/stretch, bob, tilt, attack/hit/death timing, projectile origin, particles."""
        runtime_notes = """- choose closest Bowbert precedent: dart-goober, spore-mushroom, hopper/slime, bomb, ghost, or boss.
- fill only confirmed runtime values; leave hitbox/audio/balance as null until tuned.
- use procedural motion fields instead of frame animation."""
        projectile_prompt = """### projectiles/<name>.png

Inputs:
- TODO

Mode: image-to-image when a projectile/effect reference exists.

Layer contract:
- TODO

Generation prompt:
> TODO

Boundary notes:
> Transparent background, clean edges, centered reusable asset, enough padding for runtime layering.

Acceptance checks:
- TODO"""

    return f"""---
status: {status}
kind: {kind}
projectContext: bowbert
lockedReference: {locked_reference_value}
sourceReferences:{source_references}
openItems:
  - Generate or accept `base.png`.
  - Fill confirmed runtime values in `rig.json`.
---

# {name}

Role:
- {role}

Behavior:
- TODO

Visual target:
- Match the locked reference silhouette, posture, outline weight, color blocking, focal features, and scale relationship.
- Use only confirmed props, limbs, pose language, and material language from the locked reference or user brief.

Source:
{reference_notes}

Decomposition:
{decomposition}

Image generation prompt packets:

### base.png

Inputs:
{prompt_inputs}

Mode: image-to-image, high reference fidelity.

Layer contract:
{base_layer_contract}

Generation prompt:
> {base_positive}

Boundary notes:
> Single centered character sprite, transparent background, clean edges, Bowbert doodle style, enough crop padding for protrusions and runtime layers.

Acceptance checks:
{base_acceptance}

{projectile_prompt}

Runtime rig notes:
{runtime_notes}

Preview notes:
- `tuning.html` should show the locked reference beside the assembled runtime result.
- Add controls only for values that are expected to be tuned by hand.
"""


def project_rig(character_id: str, kind: str) -> dict:
    return {
        "id": character_id,
        "kind": kind,
        "projectContext": "bowbert",
        "base": {
            "image": None,
            "sourceImage": None,
            "imageSize": None,
            "scale": None,
            "anchor": {"x": 0.5, "y": 0.5},
            "hitbox": None,
            "shadow": None,
        },
        "gaze": {
            "mode": None,
            "archetype": None,
            "eyes": {},
            "emotions": {},
        },
        "attachments": {},
        "projectiles": {},
        "vfx": {},
        "motion": {},
        "audio": {
            "hit": None,
            "death": None,
            "attack": None,
        },
        "openItems": [],
    }


def rig_template(character_id: str, kind: str, pattern: str) -> dict:
    rig = project_rig(character_id, kind)
    if pattern == "spore-mushroom":
        rig["gaze"] = {
            "mode": "embedded-eye-pupils",
            "archetype": "angry-embedded",
            "eyes": {},
            "pupilOffsetScale": None,
            "emotions": {
                "default": None,
                "angry": None,
                "hit": None,
                "dizzy": None,
            },
        }
        rig["attachments"] = {
            "eyes": {"source": "runtime-shape", "role": "runtime pupils over baked eye whites/sockets"},
            "spores": {"source": "fixed-ai-image", "role": "spore projectile base with runtime comet trail"},
        }
        rig["projectiles"] = {
            "spore": {
                "image": None,
                "sourceImage": None,
                "imageSize": None,
                "scale": None,
                "originOffset": {"x": None, "y": None},
                "burstPattern": "four-way-outward",
                "burstDistance": None,
                "travelMs": None,
                "lingerMs": None,
                "damage": None,
            }
        }
        rig["vfx"] = {
            "sporeTrail": {
                "mode": "comet-trail",
                "trailLength": None,
                "trailWidth": None,
                "trailColor": None,
                "fadeAfterArrivalMs": None,
            }
        }
        rig["motion"] = {
            "idleBob": None,
            "idleSquash": None,
            "chargeSquash": None,
            "releaseSquash": None,
            "hitScaleX": None,
            "hitScaleY": None,
        }
        rig["openItems"] = [
            "Generate/accept base.png.",
            "Generate/accept projectiles/spore.png.",
            "Tune embedded eye positions and dizzy gaze.",
            "Tune spore origin, burst distance, and comet trail.",
        ]
    elif pattern == "bowbert-player":
        rig["gaze"] = {
            "mode": "attached-eye-pupils",
            "archetype": "round-external",
            "eyes": {},
            "pupilOffsetScale": None,
            "emotions": {
                "default": None,
                "aim": None,
                "focused": None,
                "alert": None,
                "hit": None,
            },
        }
        rig["attachments"] = {
            "eyes": {"source": "runtime-shape", "role": "runtime black pupils over baked white eye sockets"},
            "bow": {"source": "procedural-canvas", "role": "branch bow rotates around player"},
        }
        rig["motion"] = {
            "walkSquash": None,
            "idleSquash": None,
            "hitSquash": None,
            "dodgeStretch": None,
            "walkBob": None,
            "recoilX": None,
            "recoilY": None,
            "tiltVelocity": None,
        }
        rig["openItems"] = [
            "Generate/accept Bowbert body base that leaves bow and black pupils to runtime.",
            "Tune external round eye positions and pupil offsets.",
            "Tune procedural branch bow placement.",
            "Tune walk squash/bob, dodge stretch, and recoil.",
        ]
    elif pattern == "dart-goober":
        rig["gaze"] = {
            "mode": "embedded-eye-pupils",
            "archetype": "angry-embedded",
            "eyes": {},
            "pupilOffsetScale": None,
            "emotions": {
                "default": None,
                "angry": None,
                "aim": None,
                "hit": None,
            },
        }
        rig["attachments"] = {
            "eyes": {"source": "runtime-shape", "role": "runtime cut-ellipse pupils over embedded sockets"},
        }
        rig["motion"] = {
            "idleBob": None,
            "walkBob": None,
            "walkSquash": None,
            "idleSquash": None,
            "hitScaleX": None,
            "hitScaleY": None,
            "walkTilt": None,
            "velocityTilt": None,
        }
        rig["attack"] = {
            "anticipation": None,
            "chargeShift": None,
            "muzzleX": None,
            "muzzleY": None,
            "muzzleAimY": None,
            "muzzleRadius": None,
            "muzzleScaleBase": None,
            "muzzleScaleCharge": None,
            "muzzleAlphaBase": None,
            "muzzleAlphaCharge": None,
        }
        rig["openItems"] = [
            "Generate/accept goober base.",
            "Tune embedded eye positions and cut-ellipse emotions.",
            "Tune walk squash/bob, velocity tilt, and muzzle charge.",
        ]
    return rig


def tuning_template(name: str, locked_reference: str | None) -> str:
    reference_src = locked_reference or "source/reference-01.png"
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{name} Tuning</title>
  <style>
    :root {{ color-scheme: dark; font-family: system-ui, sans-serif; background: #10140f; color: #eef3e8; }}
    body {{ margin: 0; padding: 16px; }}
    main {{ max-width: 1100px; margin: 0 auto; display: grid; gap: 16px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }}
    section {{ border: 1px solid #3a4a36; border-radius: 8px; padding: 12px; background: #172016; }}
    h1, h2 {{ margin: 0 0 10px; }}
    img {{ max-width: 100%; background: #0b100a; border: 1px solid #30402f; }}
    pre {{ white-space: pre-wrap; background: #0b100a; padding: 10px; border-radius: 6px; overflow: auto; }}
  </style>
</head>
<body>
  <main>
    <h1>{name} Tuning</h1>
    <div class="grid">
      <section>
        <h2>Reference</h2>
        <img src="{reference_src}" alt="locked reference">
      </section>
      <section>
        <h2>Base</h2>
        <img src="base.png" alt="base asset">
      </section>
    </div>
    <section>
      <h2>Rig</h2>
      <pre id="rig">Loading rig.json...</pre>
    </section>
  </main>
  <script>
    fetch('./rig.json')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(response.statusText)))
      .then((rig) => {{ document.querySelector('#rig').textContent = JSON.stringify(rig, null, 2); }})
      .catch((error) => {{ document.querySelector('#rig').textContent = String(error); }});
  </script>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a self-contained Bowbert character asset folder.")
    parser.add_argument("--root", default="assets/characters", help="Character root directory.")
    parser.add_argument("--id", required=True, help="Character id. Will be normalized to kebab-case.")
    parser.add_argument("--name", help="Human readable character name.")
    parser.add_argument("--kind", default="enemy", help="Character kind, e.g. enemy, playable, npc, boss.")
    parser.add_argument("--status", default="brief", choices=sorted(STATUS_VALUES), help="Initial status.")
    parser.add_argument("--pattern", default="project-enemy", choices=sorted(PATTERN_VALUES), help="Bowbert character decomposition pattern.")
    parser.add_argument("--reference", action="append", default=[], help="Reference file path to copy into source/. Repeatable.")
    parser.add_argument("--force", action="store_true", help="Overwrite generated text/json/html files.")
    args = parser.parse_args()

    character_id = slugify(args.id)
    name = args.name or character_id.replace("-", " ").title()
    root = Path(args.root)
    character_dir = root / character_id

    for subdir in [
        "source",
        "attachments",
        "projectiles",
        "vfx",
        "audio/candidates",
        "audio/selected",
        "exports",
    ]:
        (character_dir / subdir).mkdir(parents=True, exist_ok=True)

    locked_references: list[str] = []

    for index, reference in enumerate(args.reference, start=1):
        src = Path(reference)
        if src.exists() and src.is_file():
            suffix = src.suffix or ".png"
            dst = character_dir / "source" / f"reference-{index:02d}{suffix}"
            if not dst.exists() or args.force:
                dst.write_bytes(src.read_bytes())
            locked_references.append(f"source/{dst.name}")

    locked_reference = locked_references[0] if locked_references else None

    write_text_once(
        character_dir / "brief.md",
        brief_template(name, args.kind, args.status, locked_references, args.pattern),
        args.force,
    )
    write_json_once(character_dir / "rig.json", rig_template(character_id, args.kind, args.pattern), args.force)
    write_text_once(character_dir / "tuning.html", tuning_template(name, locked_reference), args.force)

    print(character_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
