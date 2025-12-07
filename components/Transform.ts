/**
 * Transform component - handles position, rotation, scale, and facing direction
 */

import { Component } from '../core/World';

export interface Transform extends Component {
  readonly type: 'Transform';
  
  // Position in world space (pixels)
  x: number;
  y: number;
  
  // Rotation in radians
  rotation: number;
  
  // Scale factors
  scaleX: number;
  scaleY: number;
  
  // Facing direction (-1 for left, 1 for right)
  facing: number;
}

/**
 * Create a new Transform component
 */
export function createTransform(x: number = 0, y: number = 0): Transform {
  return {
    type: 'Transform',
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    facing: 1, // Default facing right
  };
}

/**
 * Set the position of a transform
 */
export function setTransformPosition(transform: Transform, x: number, y: number): void {
  transform.x = x;
  transform.y = y;
}

/**
 * Move a transform by a delta amount
 */
export function moveTransform(transform: Transform, dx: number, dy: number): void {
  transform.x += dx;
  transform.y += dy;
}

/**
 * Set the facing direction
 */
export function setTransformFacing(transform: Transform, facing: number): void {
  transform.facing = Math.sign(facing); // Ensure -1, 0, or 1
}

/**
 * Flip the facing direction
 */
export function flipTransformFacing(transform: Transform): void {
  transform.facing = -transform.facing;
}