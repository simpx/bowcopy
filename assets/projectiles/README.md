# Bowbert Projectiles

One subdirectory is one reusable projectile or projectile-like runtime visual.

- `arrow/`: Bowbert's player arrow. It is drawn procedurally by `src/render/projectiles/ArrowProjectileRenderer.ts` and fired by `BowbertPlayer`.
- `enemy-dart/`: Dart Goober-family enemy dart. It is drawn procedurally by `src/render/projectiles/EnemyDartProjectileRenderer.ts`.
- `black-ink/`: Spooper Gooper's black ink/smoke projectile. It reuses the shared projectile movement system with a dedicated `black-ink` visual style.

Projectile folders are intentionally similar to character and weapon folders: each contains references, `brief.md`, `rig.json`, `tuning.html`, exports, and playtest evidence where useful. Runtime trails and impacts stay procedural unless a later art pass replaces them with bitmap effects.
