# MVP Spec

This is the first playable target. The goal is to prove that the mobile controls, the video's room-combat loop, and the procedural animation style work before adding full dungeon generation.

## Platform

- Landscape mobile first.
- Desktop debug controls are allowed, but mobile controls define the game.
- Phaser 3 + TypeScript + Vite.

## Room Scope

- One rectangular combat room.
- No procedural map yet.
- The room should visually match the reference video's first combat rooms as closely as possible.
- Spawn three Dart Goobers one by one.
- Clear all enemies to win the MVP room.
- Door state must exist even in the single-room MVP: open before combat, closed during combat, open/clear when all enemies are dead.

## Prototype Asset Policy

For MVP feasibility testing, video-crop assets may be used directly as temporary prototype assets.

- Put these assets under `assets/prototype-video-crops/`.
- Keep source/reference crops under `refs/asset-crops/`.
- Do not treat prototype crops as final game assets.
- Before any public release, replace them with original recreated art.
- Runtime code should load prototype crops through stable manifest keys so they can be swapped later without gameplay rewrites.

Required prototype assets:

- Bowbert body/face reference crop or recreated crop.
- Bow and arrow crop or runtime-drawn bow.
- Dart Goober crop.
- Forest-room background pieces: green floor, dark wall/border, door/opening shapes.
- Small floor decorations: grass strokes, stones, stumps, tiny mushrooms, debris.
- Heart UI.

## Player Controls

Mobile:

- Left virtual joystick moves Bowbert.
- Right virtual joystick aims and fires.
- Holding the right joystick fires repeatedly in that direction.
- Dragging the right joystick changes aim while firing.
- Releasing the right joystick stops firing and keeps the last facing direction.
- Dodge button rolls in current movement direction.
- If there is no movement input, dodge uses current aim/facing direction.

Desktop debug:

- WASD moves.
- Mouse position aims.
- Hold left mouse button to fire repeatedly.
- Space dodges.

## Combat

- No manual bow charge in MVP.
- Every shot still plays a short automatic draw/release animation.
- Fire rate target: one arrow every 0.35 seconds.
- Arrow damage: 1.
- Dart Goober HP: 3.
- Player HP: 5 hearts.
- Player takes 1 damage from enemy dart or contact.
- Dodge has cooldown and brief invulnerability.
- Room starts in an inactive/open state.
- Moving into the room center starts combat.
- Combat start closes doors and schedules enemy spawn.
- Clearing enemies opens doors and triggers room-clear feedback.

## MVP Enemy

Dart Goober only.

Behavior loop:

1. Pick direction toward player.
2. Add small random angle offset.
3. Move for a short duration.
4. Stop briefly.
5. Fire one dart toward player.
6. Repeat.

Purpose:

- Tests player movement.
- Tests active aiming.
- Tests dodge usefulness.
- Tests enemy projectile readability.

Spawn requirements:

- Enemies do not appear all at once.
- Each Dart Goober spawns with a short pop/particle effect.
- Spawn points are fixed for MVP but represented as data so room templates can reuse the idea later.

## Required Room Visuals

The MVP room must sell the original reference before dungeon generation exists.

- Dark green floor.
- Thick black/dark room border.
- Door/opening shapes on room edges.
- Doors visibly close during combat.
- Random floor decoration scatter with slight offset/rotation/flip.
- Decoration set includes tiny mushrooms, rocks, grass marks, stumps, and small debris.
- The center playfield remains clear enough for arrows and enemy darts to read.
- Camera frame should show the whole room on landscape mobile.

## Required Procedural Animation

MVP must already feel like the reference video. Prototype crops are acceptable; dead static placeholders are not.

Player:

- Runtime-drawn, layered primitive, or temporary video-crop body.
- Sine-wave squash/stretch idle.
- Stronger squash/stretch while moving.
- Short recoil or body pop when firing.
- Hit flash and body squash on damage.
- Dodge lean, speed stretch, and ghost afterimages.
- Eyes/pupils track aim direction with clamped offsets.

Dart Goober:

- Runtime-drawn, layered primitive, or temporary video-crop body.
- Idle bob and slight rotation.
- Walk wobble during movement.
- Shoot anticipation.
- Hit flash.
- Death pop with particles.
- Eyes convey angry/hostile expression.

Bow and arrow:

- Bow has relaxed and drawn poses.
- Draw pose is automatic per shot, not player-charged.
- Arrow has a clear direction, speed, and trail.

## Required Feedback

- Room-combat start door close feedback.
- Enemy spawn particles.
- Arrow hit wall particles.
- Arrow hit enemy particles.
- Enemy death particles.
- Dodge afterimages.
- Small camera shake on hit and dodge.
- Larger camera shake on room clear.
- Hearts flash or wiggle on damage.
- Room clear particles or short celebratory pulse.

## Explicitly Not In MVP

- Manual bow charge.
- Multiple rooms.
- Procedural dungeon blueprint.
- Wizard room.
- Sigils/power-ups.
- Mushroom, slime, bomb, or ghost enemies.
- Final exported art assets.
