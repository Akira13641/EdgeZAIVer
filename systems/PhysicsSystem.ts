/**
 * Physics System - handles physics simulation and collision detection
 */

import { System, World } from '../core/World';
import { Transform } from '../components/Transform';
import { Physics, updateGroundedTime } from '../components/Physics';
import { MovementState, changeMovementState, startCoyoteTime } from '../features/movement/MovementStateComponent';

export class PhysicsSystem implements System {
  readonly name = 'PhysicsSystem';

  update(_world: World, _deltaTime: number): void {
    // Physics system uses fixed updates only
  }

  fixedUpdate(world: World, fixedDeltaTime: number): void {
    const entities = world.findEntitiesWithComponents('Transform', 'Physics');
    
    for (const entityId of entities) {
      const transform = world.getComponent<Transform>(entityId, 'Transform');
      const physics = world.getComponent<Physics>(entityId, 'Physics');
      const movementState = world.getComponent<MovementState>(entityId, 'MovementState');
      
      if (!transform || !physics) {
        continue;
      }
      
      // Apply physics
      this.applyPhysics(transform, physics, movementState, fixedDeltaTime);
      
      // Handle collisions
      this.handleCollisions(transform, physics, movementState, world);
      
      // Update grounded time
      updateGroundedTime(physics, fixedDeltaTime * 1000);
    }
  }

  /**
   * Apply physics calculations
   */
  private applyPhysics(
    transform: Transform,
    physics: Physics,
    _movementState: MovementState | undefined,
    fixedDeltaTime: number
  ): void {
    // Apply gravity
    if (!physics.isGrounded) {
      physics.velocityY += physics.gravity * fixedDeltaTime;
      
      // Cap fall speed
      if (physics.velocityY > physics.maxVelocityY) {
        physics.velocityY = physics.maxVelocityY;
      }
    }
    
    // Apply acceleration to velocity
    physics.velocityX += physics.accelerationX * fixedDeltaTime;
    physics.velocityY += physics.accelerationY * fixedDeltaTime;
    
    // Apply friction
    if (physics.isGrounded && Math.abs(physics.velocityX) > 0) {
      const frictionForce = physics.friction * fixedDeltaTime;
      if (Math.abs(physics.velocityX) <= frictionForce) {
        physics.velocityX = 0;
      } else {
        physics.velocityX -= Math.sign(physics.velocityX) * frictionForce;
      }
    }
    
    // Update position based on velocity
    transform.x += physics.velocityX * fixedDeltaTime;
    transform.y += physics.velocityY * fixedDeltaTime;
    
    // Reset acceleration
    physics.accelerationX = 0;
    physics.accelerationY = 0;
  }

  /**
   * Handle collisions with environment
   */
  private handleCollisions(
    transform: Transform,
    physics: Physics,
    _movementState: MovementState | undefined,
    _world: World
  ): void {
    // Simple ground collision at y = 300 (temporary platform)
    const groundY = 300;
    const characterHeight = 64;
    const characterWidth = 32;
    
    // Check ground collision
    const feetY = transform.y + characterHeight / 2;
    if (feetY >= groundY && physics.velocityY >= 0) {
      // Land on ground
      transform.y = groundY - characterHeight / 2;
      physics.velocityY = 0;
      
      if (!physics.isGrounded) {
        // Just landed
        this.onLanded(physics, _movementState);
      }
    } else if (feetY < groundY) {
      // In the air
      if (physics.isGrounded) {
        // Just left ground
        this.onLeftGround(physics, _movementState);
      }
    }
    
    // Simple boundary collision
    const worldBounds = {
      left: -400,
      right: 400,
      top: -1000,
      bottom: 1000
    };
    
    // Horizontal boundaries
    if (transform.x - characterWidth / 2 < worldBounds.left) {
      transform.x = worldBounds.left + characterWidth / 2;
      physics.velocityX = 0;
    } else if (transform.x + characterWidth / 2 > worldBounds.right) {
      transform.x = worldBounds.right - characterWidth / 2;
      physics.velocityX = 0;
    }
    
    // Vertical boundaries
    if (transform.y - characterHeight / 2 < worldBounds.top) {
      transform.y = worldBounds.top + characterHeight / 2;
      physics.velocityY = 0;
    } else if (transform.y + characterHeight / 2 > worldBounds.bottom) {
      transform.y = worldBounds.bottom - characterHeight / 2;
      physics.velocityY = 0;
    }
  }

  /**
   * Called when entity lands on ground
   */
  private onLanded(physics: Physics, movementState: MovementState | undefined): void {
    physics.isGrounded = true;
    
    if (movementState) {
      // Start coyote time for potential jump forgiveness
      startCoyoteTime(movementState, 0);
      
      // Transition to appropriate grounded state
      if (movementState.currentState === 'jumping' || movementState.currentState === 'falling') {
        changeMovementState(movementState, 'landing', 100); // 100ms landing recovery
      }
    }
  }

  /**
   * Called when entity leaves ground
   */
  private onLeftGround(physics: Physics, movementState: MovementState | undefined): void {
    physics.isGrounded = false;
    
    if (movementState) {
      // Start coyote time
      startCoyoteTime(movementState, 100); // 100ms coyote time
      
      // Transition to falling if not already jumping
      if (movementState.currentState !== 'jumping') {
        changeMovementState(movementState, 'falling');
      }
    }
  }
}