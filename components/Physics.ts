/**
 * Physics component - handles velocity, acceleration, and collision properties
 */

import { Component } from '../core/World';

export interface Physics extends Component {
  readonly type: 'Physics';
  
  // Velocity (pixels per second)
  velocityX: number;
  velocityY: number;
  
  // Acceleration (pixels per second squared)
  accelerationX: number;
  accelerationY: number;
  
  // Physics properties
  gravity: number;
  friction: number;
  
  // Grounded state
  isGrounded: boolean;
  groundedTime: number; // Time since last grounded (ms)
  
  // Mass and physics constraints
  mass: number;
  maxVelocityX: number;
  maxVelocityY: number;
  
  // Collision response
  bounce: number;
  restitution: number;
}

/**
 * Create a new Physics component
 */
export function createPhysics(): Physics {
  return {
    type: 'Physics',
    velocityX: 0,
    velocityY: 0,
    accelerationX: 0,
    accelerationY: 0,
    gravity: 980, // Default gravity from constants
    friction: 0.8,
    isGrounded: false,
    groundedTime: 0,
    mass: 1.0,
    maxVelocityX: 800,
    maxVelocityY: 800,
    bounce: 0,
    restitution: 0,
  };
}

/**
 * Set velocity
 */
export function setVelocity(physics: Physics, vx: number, vy: number): void {
  physics.velocityX = Math.max(-physics.maxVelocityX, Math.min(physics.maxVelocityX, vx));
  physics.velocityY = Math.max(-physics.maxVelocityY, Math.min(physics.maxVelocityY, vy));
}

/**
 * Apply force to physics component
 */
export function applyForce(physics: Physics, fx: number, fy: number): void {
  physics.accelerationX += fx / physics.mass;
  physics.accelerationY += fy / physics.mass;
}

/**
 * Apply impulse (instant velocity change)
 */
export function applyImpulse(physics: Physics, ix: number, iy: number): void {
  physics.velocityX += ix / physics.mass;
  physics.velocityY += iy / physics.mass;
}

/**
 * Set grounded state
 */
export function setGrounded(physics: Physics, grounded: boolean): void {
  const wasGrounded = physics.isGrounded;
  physics.isGrounded = grounded;
  
  if (grounded && !wasGrounded) {
    // Just landed
    physics.groundedTime = 0;
  } else if (!grounded && wasGrounded) {
    // Just left ground
    physics.groundedTime = 0;
  }
}

/**
 * Update grounded time
 */
export function updateGroundedTime(physics: Physics, deltaTime: number): void {
  if (physics.isGrounded) {
    physics.groundedTime += deltaTime;
  } else {
    physics.groundedTime = 0;
  }
}