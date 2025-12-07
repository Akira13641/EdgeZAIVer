/**
 * Entity Archetypes - factory functions for creating complete entities with component bundles
 */

import { World } from '../core/World';
import { createTransform } from '../components/Transform';
import { createPhysics } from '../components/Physics';
import { createPlayerInput } from '../components/PlayerInput';
import { createMovementState } from '../features/movement/MovementStateComponent';

/**
 * Create a player entity with all required components
 */
export function createPlayer(world: World, x: number = 0, y: number = 0): number {
  const entityId = world.createEntity();
  
  // Add transform component
  world.addComponent(entityId, createTransform(x, y));
  
  // Add physics component
  world.addComponent(entityId, createPhysics());
  
  // Add player input component
  world.addComponent(entityId, createPlayerInput());
  
  // Add movement state component
  world.addComponent(entityId, createMovementState());
  
  return entityId;
}

/**
 * Create a basic platform entity
 */
export function createPlatform(world: World, x: number, y: number, _width: number, _height: number): number {
  const entityId = world.createEntity();
  
  // Add transform component
  world.addComponent(entityId, createTransform(x, y));
  
  // TODO: Add collider component when implemented
  
  return entityId;
}

/**
 * Create a basic enemy entity
 */
export function createBasicEnemy(world: World, x: number, y: number): number {
  const entityId = world.createEntity();
  
  // Add transform component
  world.addComponent(entityId, createTransform(x, y));
  
  // Add physics component
  world.addComponent(entityId, createPhysics());
  
  // TODO: Add enemy-specific components when implemented
  
  return entityId;
}