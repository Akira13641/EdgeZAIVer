/**
 * MovementState component - tracks current movement state and timers
 */

import { Component } from '../../core/World';

export type MovementStateType = 
  | 'idle'
  | 'walking'
  | 'running'
  | 'crouching'
  | 'crouchWalking'
  | 'jumping'
  | 'falling'
  | 'landing'
  | 'dodgeRoll'
  | 'backstep'
  | 'crouchSlide';

export interface MovementState extends Component {
  readonly type: 'MovementState';
  
  // Current movement state
  currentState: MovementStateType;
  previousState: MovementStateType;
  
  // State timers
  stateTimer: number; // Time in current state (ms)
  stateDuration: number; // Total duration of current state (ms)
  
  // Movement modifiers
  canMove: boolean;
  canJump: boolean;
  canAttack: boolean;
  canBlock: boolean;
  canDodge: boolean;
  
  // Jump forgiveness
  coyoteTime: number; // Time since leaving ground (ms)
  jumpBufferTime: number; // Time since jump input (ms)
  
  // Slide cooldown
  slideCooldown: number; // Time until slide can be used again (ms)
  
  // Dodge/Backstep state
  isInvulnerable: boolean;
  invulnerabilityTimer: number; // Time remaining in i-frames (ms)
}

/**
 * Create a new MovementState component
 */
export function createMovementState(): MovementState {
  return {
    type: 'MovementState',
    currentState: 'idle',
    previousState: 'idle',
    stateTimer: 0,
    stateDuration: 0,
    canMove: true,
    canJump: true,
    canAttack: true,
    canBlock: true,
    canDodge: true,
    coyoteTime: 0,
    jumpBufferTime: 0,
    slideCooldown: 0,
    isInvulnerable: false,
    invulnerabilityTimer: 0,
  };
}

/**
 * Change to a new movement state
 */
export function changeMovementState(
  state: MovementState, 
  newState: MovementStateType, 
  duration: number = 0
): void {
  state.previousState = state.currentState;
  state.currentState = newState;
  state.stateTimer = 0;
  state.stateDuration = duration;
  
  // Reset state-specific properties
  switch (newState) {
    case 'idle':
    case 'walking':
    case 'running':
    case 'crouching':
    case 'crouchWalking':
      state.canMove = true;
      state.canJump = true;
      state.canAttack = true;
      state.canBlock = true;
      state.canDodge = true;
      break;
      
    case 'jumping':
    case 'falling':
      state.canMove = true;
      state.canJump = false;
      state.canAttack = true;
      state.canBlock = false;
      state.canDodge = false;
      break;
      
    case 'dodgeRoll':
    case 'backstep':
    case 'crouchSlide':
      state.canMove = false;
      state.canJump = false;
      state.canAttack = false;
      state.canBlock = false;
      state.canDodge = false;
      break;
      
    case 'landing':
      state.canMove = false;
      state.canJump = false;
      state.canAttack = false;
      state.canBlock = false;
      state.canDodge = false;
      break;
  }
}

/**
 * Update state timers
 */
export function updateMovementState(state: MovementState, deltaTime: number): void {
  state.stateTimer += deltaTime;
  
  // Update coyote time
  if (state.coyoteTime > 0) {
    state.coyoteTime -= deltaTime;
  }
  
  // Update jump buffer time
  if (state.jumpBufferTime > 0) {
    state.jumpBufferTime -= deltaTime;
  }
  
  // Update slide cooldown
  if (state.slideCooldown > 0) {
    state.slideCooldown -= deltaTime;
  }
  
  // Update invulnerability timer
  if (state.invulnerabilityTimer > 0) {
    state.invulnerabilityTimer -= deltaTime;
    if (state.invulnerabilityTimer <= 0) {
      state.isInvulnerable = false;
    }
  }
}

/**
 * Set invulnerability state
 */
export function setInvulnerability(state: MovementState, duration: number): void {
  state.isInvulnerable = true;
  state.invulnerabilityTimer = duration;
}

/**
 * Check if state is complete
 */
export function isStateComplete(state: MovementState): boolean {
  return state.stateDuration > 0 && state.stateTimer >= state.stateDuration;
}

/**
 * Start coyote time
 */
export function startCoyoteTime(state: MovementState, maxTime: number): void {
  state.coyoteTime = maxTime;
}

/**
 * Buffer jump input
 */
export function bufferJumpInput(state: MovementState, bufferTime: number): void {
  state.jumpBufferTime = bufferTime;
}

/**
 * Check if jump input is buffered
 */
export function hasJumpBuffer(state: MovementState): boolean {
  return state.jumpBufferTime > 0;
}

/**
 * Check if coyote time is active
 */
export function hasCoyoteTime(state: MovementState): boolean {
  return state.coyoteTime > 0;
}

/**
 * Start slide cooldown
 */
export function startSlideCooldown(state: MovementState, cooldown: number): void {
  state.slideCooldown = cooldown;
}

/**
 * Check if slide is available
 */
export function canSlide(state: MovementState): boolean {
  return state.slideCooldown <= 0;
}