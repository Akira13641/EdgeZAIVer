/**
 * PlayerInput component - marks entity as player-controlled and stores input buffer
 */

import { Component } from '../core/World';
import { BufferedInput } from '../core/Resources';

export interface PlayerInput extends Component {
  readonly type: 'PlayerInput';
  
  // Input buffer for action queuing
  bufferedInput: BufferedInput | null;
  
  // Current input states
  moveLeft: boolean;
  moveRight: boolean;
  moveUp: boolean;
  moveDown: boolean;
  run: boolean;
  jump: boolean;
  crouch: boolean;
  dodgeRoll: boolean;
  backstep: boolean;
  lightAttack: boolean;
  heavyAttack: boolean;
  block: boolean;
  parry: boolean;
  
  // Mouse position for weapon angle
  mouseX: number;
  mouseY: number;
  worldMouseX: number;
  worldMouseY: number;
  
  // Weapon zone (1: High, 2: Mid, 3: Low, 0: Guard)
  weaponZone: number;
}

/**
 * Create a new PlayerInput component
 */
export function createPlayerInput(): PlayerInput {
  return {
    type: 'PlayerInput',
    bufferedInput: null,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
    run: false,
    jump: false,
    crouch: false,
    dodgeRoll: false,
    backstep: false,
    lightAttack: false,
    heavyAttack: false,
    block: false,
    parry: false,
    mouseX: 0,
    mouseY: 0,
    worldMouseX: 0,
    worldMouseY: 0,
    weaponZone: 2, // Default to mid zone
  };
}

/**
 * Clear all input states
 */
export function clearPlayerInput(input: PlayerInput): void {
  input.moveLeft = false;
  input.moveRight = false;
  input.moveUp = false;
  input.moveDown = false;
  input.run = false;
  input.jump = false;
  input.crouch = false;
  input.dodgeRoll = false;
  input.backstep = false;
  input.lightAttack = false;
  input.heavyAttack = false;
  input.block = false;
  input.parry = false;
}

/**
 * Set buffered input
 */
export function setBufferedInput(input: PlayerInput, bufferedInput: BufferedInput | null): void {
  input.bufferedInput = bufferedInput;
}

/**
 * Consume and return buffered input
 */
export function consumeBufferedInput(input: PlayerInput): BufferedInput | null {
  const buffered = input.bufferedInput;
  input.bufferedInput = null;
  return buffered;
}

/**
 * Update weapon zone based on mouse position relative to player
 */
export function updateWeaponZone(input: PlayerInput, playerX: number, playerY: number, facing: number): void {
  // Calculate relative mouse position
  const relativeX = input.worldMouseX - playerX;
  const relativeY = input.worldMouseY - playerY;
  
  // Adjust for facing direction
  const adjustedX = relativeX * facing;
  
  // Determine zone based on angle
  if (adjustedX < -20) {
    // Mouse is behind player - Guard stance
    input.weaponZone = 0;
  } else if (relativeY < -30) {
    // Mouse is above player - High zone
    input.weaponZone = 1;
  } else if (relativeY > 30) {
    // Mouse is below player - Low zone
    input.weaponZone = 3;
  } else {
    // Mouse is level with player - Mid zone
    input.weaponZone = 2;
  }
}