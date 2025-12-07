/**
 * System execution order definition
 */

import { System } from '../core/World';
import { InputSystem } from './InputSystem';
import { MovementSystem } from './MovementSystem';
import { PhysicsSystem } from './PhysicsSystem';
import { CameraSystem } from './CameraSystem';
import { RenderSystem } from './RenderSystem';

/**
 * Create systems in the correct execution order
 */
export function createSystems(context?: CanvasRenderingContext2D): System[] {
  const systems: System[] = [
    new InputSystem(),      // Process input first
    new MovementSystem(),   // Handle movement logic
    new PhysicsSystem(),    // Apply physics
    new CameraSystem(),     // Update camera
  ];
  
  // Add render system if context is provided
  if (context) {
    systems.push(new RenderSystem(context));
  }
  
  return systems;
}

// Export individual systems for direct access
export {
  InputSystem,
  MovementSystem,
  PhysicsSystem,
  CameraSystem,
  RenderSystem,
};