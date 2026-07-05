# MVP Spec

This is the first playable target. The goal is to prove that the mobile controls and the video's procedural animation style work before adding full dungeon generation.

## Platform

- Landscape mobile first.
- Desktop debug controls are allowed, but mobile controls define the game.
- Phaser 3 + TypeScript + Vite.

## Room Scope

- One rectangular combat room.
- No procedural map yet.
- Spawn three Dart Goobers.
- Clear all enemies to win the MVP room.

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

## Required Procedural Animation

MVP must already feel like the reference video. Placeholder art is acceptable; dead static placeholders are not.

Player:

- Runtime-drawn or layered primitive body.
- Sine-wave squash/stretch idle.
- Stronger squash/stretch while moving.
- Short recoil or body pop when firing.
- Hit flash and body squash on damage.
- Dodge lean, speed stretch, and ghost afterimages.
- Eyes/pupils track aim direction with clamped offsets.

Dart Goober:

- Runtime-drawn or layered primitive body.
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

- Arrow hit wall particles.
- Arrow hit enemy particles.
- Enemy death particles.
- Dodge afterimages.
- Small camera shake on hit and dodge.
- Larger camera shake on room clear.
- Hearts flash or wiggle on damage.

## Explicitly Not In MVP

- Manual bow charge.
- Multiple rooms.
- Procedural dungeon blueprint.
- Wizard room.
- Sigils/power-ups.
- Mushroom, slime, bomb, or ghost enemies.
- Final exported art assets.
