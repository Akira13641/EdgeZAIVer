/**
 * Centralized tuning values and game constants
 */

// Physics constants (pixels per second)
export const PHYSICS = {
  GRAVITY: 980, // px/s²
  MAX_FALL_SPEED: 800, // px/s
} as const;

// Movement speeds (pixels per second)
export const MOVEMENT = {
  WALK_SPEED: 150,
  RUN_SPEED: 250,
  CROUCH_SPEED: 75,
  JUMP_HEIGHT_MIN: 127, // Minimum jump height in pixels
  JUMP_HEIGHT_MAX: 184, // Maximum jump height in pixels
  JUMP_VELOCITY_MIN: 500, // Calculated for min height
  JUMP_VELOCITY_MAX: 600, // Calculated for max height
} as const;

// Dodge roll constants
export const DODGE_ROLL = {
  DISTANCE: 180, // pixels
  DURATION: 500, // milliseconds
  I_FRAMES_START: 200, // milliseconds of invulnerability at start
  RECOVERY: 167, // milliseconds before next action (500 - 333 for animation)
} as const;

// Backstep constants
export const BACKSTEP = {
  DISTANCE: 80, // pixels
  DURATION: 300, // milliseconds
  I_FRAMES_START: 100, // milliseconds of invulnerability at start
} as const;

// Crouch slide constants
export const CROUCH_SLIDE = {
  DISTANCE: 200, // pixels
  DURATION: 500, // milliseconds
  COOLDOWN: 500, // milliseconds
  STAMINA_COST: 15,
} as const;

// Jump forgiveness timing
export const JUMP_FORGIVENESS = {
  COYOTE_TIME: 100, // milliseconds after leaving platform
  JUMP_BUFFER: 100, // milliseconds before landing
} as const;

// Input buffer timing
export const INPUT_BUFFER = {
  WINDOW: 133, // milliseconds (8 frames at 60fps)
} as const;

// Camera constants
export const CAMERA = {
  DEAD_ZONE_WIDTH: 64,
  DEAD_ZONE_HEIGHT: 64,
  LOOK_AHEAD_DISTANCE: 100, // pixels when running
} as const;

// Player attributes
export const PLAYER = {
  HEALTH: 100,
  STAMINA: 100,
  POISE: 40,
  ATTACK_POWER: 20,
  BLOCK_STABILITY: 50,
} as const;

// Hitbox modifiers
export const CROUCH = {
  HITBOX_REDUCTION: 0.4, // 40% reduction in height
} as const;

// Frame timing (60 FPS baseline)
export const FRAME_TIME = 1000 / 60; // milliseconds per frame