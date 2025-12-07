/**
 * Movement System - handles player movement based on input and physics
 */

import { System, World } from '../core/World';
import { MOVEMENT, DODGE_ROLL, BACKSTEP, CROUCH_SLIDE } from '../core/Constants';
import { Transform } from '../components/Transform';
import { Physics, setGrounded } from '../components/Physics';
import { PlayerInput, consumeBufferedInput } from '../components/PlayerInput';
import { MovementState, changeMovementState, updateMovementState, isStateComplete, hasJumpBuffer, hasCoyoteTime, startCoyoteTime, startSlideCooldown, canSlide, setInvulnerability } from '../features/movement/MovementStateComponent';

export class MovementSystem implements System {
  readonly name = 'MovementSystem';

  update(world: World, _deltaTime: number): void {
    const playerEntities = world.findEntitiesWithComponents('PlayerInput', 'Transform', 'Physics', 'MovementState');
    
    for (const entityId of playerEntities) {
      const playerInput = world.getComponent<PlayerInput>(entityId, 'PlayerInput');
      const transform = world.getComponent<Transform>(entityId, 'Transform');
      const physics = world.getComponent<Physics>(entityId, 'Physics');
      const movementState = world.getComponent<MovementState>(entityId, 'MovementState');
      
      if (!playerInput || !transform || !physics || !movementState) {
        continue;
      }
      
      // Update movement state timers
      updateMovementState(movementState, _deltaTime);
      
      // Handle state transitions and movement
      this.handleMovement(entityId, playerInput, transform, physics, movementState, _deltaTime, world);
    }
  }

  fixedUpdate(_world: World, _fixedDeltaTime: number): void {
    // Movement system doesn't need fixed updates for now
  }

  /**
   * Handle movement logic
   */
  private handleMovement(
    entityId: number,
    input: PlayerInput,
    transform: Transform,
    physics: Physics,
    movementState: MovementState,
    deltaTime: number,
    world: World
  ): void {
    // Handle different movement states
    switch (movementState.currentState) {
      case 'idle':
      case 'walking':
      case 'running':
      case 'crouching':
      case 'crouchWalking':
        this.handleGroundedMovement(entityId, input, transform, physics, movementState, deltaTime, world);
        break;
        
      case 'jumping':
      case 'falling':
        this.handleAirborneMovement(entityId, input, transform, physics, movementState, deltaTime, world);
        break;
        
      case 'landing':
        this.handleLanding(entityId, input, transform, physics, movementState, deltaTime, world);
        break;
        
      case 'dodgeRoll':
        this.handleDodgeRoll(entityId, input, transform, physics, movementState, deltaTime, world);
        break;
        
      case 'backstep':
        this.handleBackstep(entityId, input, transform, physics, movementState, deltaTime, world);
        break;
        
      case 'crouchSlide':
        this.handleCrouchSlide(entityId, input, transform, physics, movementState, deltaTime, world);
        break;
    }
    
    // Update facing direction
    this.updateFacing(input, transform, movementState);
  }

  /**
   * Handle grounded movement
   */
  private handleGroundedMovement(
    entityId: number,
    input: PlayerInput,
    transform: Transform,
    physics: Physics,
    movementState: MovementState,
    _deltaTime: number,
    world: World
  ): void {
    // Check for jump input (including buffer and coyote time)
    if (input.jump || hasJumpBuffer(movementState)) {
      if (movementState.canJump || hasCoyoteTime(movementState)) {
        this.startJump(entityId, input, transform, physics, movementState, world);
        return;
      }
    }
    
    // Check for dodge roll
    if (input.dodgeRoll && movementState.canDodge) {
      this.startDodgeRoll(entityId, input, transform, physics, movementState, world);
      return;
    }
    
    // Check for backstep
    if (input.backstep && movementState.canDodge) {
      this.startBackstep(entityId, input, transform, physics, movementState, world);
      return;
    }
    
    // Check for crouch slide
    if (input.crouch && (input.moveLeft || input.moveRight) && canSlide(movementState)) {
      this.startCrouchSlide(entityId, input, transform, physics, movementState, world);
      return;
    }
    
    // Handle regular movement
    let targetSpeed = 0;
    let newState = movementState.currentState;
    
    if (input.crouch) {
      // Crouching movement
      targetSpeed = MOVEMENT.CROUCH_SPEED;
      newState = (input.moveLeft || input.moveRight) ? 'crouchWalking' : 'crouching';
    } else if (input.moveLeft || input.moveRight) {
      // Standing movement
      targetSpeed = input.run ? MOVEMENT.RUN_SPEED : MOVEMENT.WALK_SPEED;
      newState = input.run ? 'running' : 'walking';
    } else {
      // Idle
      targetSpeed = 0;
      newState = 'idle';
    }
    
    // Apply movement
    if (input.moveLeft) {
      physics.velocityX = -targetSpeed;
    } else if (input.moveRight) {
      physics.velocityX = targetSpeed;
    } else {
      physics.velocityX = 0;
    }
    
    // Change state if needed
    if (newState !== movementState.currentState) {
      changeMovementState(movementState, newState);
    }
  }

  /**
   * Handle airborne movement
   */
  private handleAirborneMovement(
    _entityId: number,
    input: PlayerInput,
    _transform: Transform,
    physics: Physics,
    movementState: MovementState,
    _deltaTime: number,
    _world: World
  ): void {
    // Limited air control
    const airControlFactor = 0.5;
    let targetVelocityX = 0;
    
    if (input.moveLeft) {
      targetVelocityX = -MOVEMENT.WALK_SPEED * airControlFactor;
    } else if (input.moveRight) {
      targetVelocityX = MOVEMENT.WALK_SPEED * airControlFactor;
    }
    
    // Smooth air control
    physics.velocityX += (targetVelocityX - physics.velocityX) * 0.1;
    
    // Check if landed
    if (physics.isGrounded) {
      changeMovementState(movementState, 'landing', 100); // 100ms landing recovery
      startCoyoteTime(movementState, 0); // Reset coyote time
    }
  }

  /**
   * Handle landing state
   */
  private handleLanding(
    _entityId: number,
    _input: PlayerInput,
    _transform: Transform,
    physics: Physics,
    movementState: MovementState,
    _deltaTime: number,
    _world: World
  ): void {
    // No movement during landing recovery
    physics.velocityX = 0;
    
    // Check if landing recovery is complete
    if (isStateComplete(movementState)) {
      changeMovementState(movementState, 'idle');
    }
  }

  /**
   * Handle dodge roll
   */
  private handleDodgeRoll(
    _entityId: number,
    _input: PlayerInput,
    transform: Transform,
    physics: Physics,
    movementState: MovementState,
    _deltaTime: number,
    _world: World
  ): void {
    // Fixed roll distance and speed
    const rollSpeed = DODGE_ROLL.DISTANCE / (DODGE_ROLL.DURATION / 1000);
    physics.velocityX = rollSpeed * transform.facing;
    
    // Set invulnerability for first part of roll
    if (movementState.stateTimer < DODGE_ROLL.I_FRAMES_START && !movementState.isInvulnerable) {
      setInvulnerability(movementState, DODGE_ROLL.I_FRAMES_START);
    }
    
    // Check if roll is complete
    if (isStateComplete(movementState)) {
      physics.velocityX = 0;
      changeMovementState(movementState, 'idle');
    }
  }

  /**
   * Handle backstep
   */
  private handleBackstep(
    _entityId: number,
    _input: PlayerInput,
    transform: Transform,
    physics: Physics,
    movementState: MovementState,
    _deltaTime: number,
    _world: World
  ): void {
    // Fixed backstep distance and speed
    const backstepSpeed = BACKSTEP.DISTANCE / (BACKSTEP.DURATION / 1000);
    physics.velocityX = -backstepSpeed * transform.facing;
    
    // Set invulnerability for first part of backstep
    if (movementState.stateTimer < BACKSTEP.I_FRAMES_START && !movementState.isInvulnerable) {
      setInvulnerability(movementState, BACKSTEP.I_FRAMES_START);
    }
    
    // Check if backstep is complete
    if (isStateComplete(movementState)) {
      physics.velocityX = 0;
      changeMovementState(movementState, 'idle');
    }
  }

  /**
   * Handle crouch slide
   */
  private handleCrouchSlide(
    _entityId: number,
    input: PlayerInput,
    transform: Transform,
    physics: Physics,
    movementState: MovementState,
    _deltaTime: number,
    _world: World
  ): void {
    // Fixed slide distance and speed
    const slideSpeed = CROUCH_SLIDE.DISTANCE / (CROUCH_SLIDE.DURATION / 1000);
    
    // Use initial facing direction for slide
    if (movementState.stateTimer === 0) {
      physics.velocityX = slideSpeed * transform.facing;
    }
    
    // Check if slide is complete
    if (isStateComplete(movementState)) {
      physics.velocityX = 0;
      startSlideCooldown(movementState, CROUCH_SLIDE.COOLDOWN);
      
      // Transition to crouch or stand based on input
      if (input.crouch) {
        changeMovementState(movementState, 'crouching');
      } else {
        changeMovementState(movementState, 'idle');
      }
    }
  }

  /**
   * Start jump
   */
  private startJump(
    _entityId: number,
    input: PlayerInput,
    _transform: Transform,
    physics: Physics,
    movementState: MovementState,
    _world: World
  ): void {
    // Calculate jump velocity based on input duration
    let jumpVelocity = MOVEMENT.JUMP_VELOCITY_MIN;
    
    // Variable height jumping will be handled by continuous jump input
    physics.velocityY = -jumpVelocity;
    setGrounded(physics, false);
    changeMovementState(movementState, 'jumping');
    
    // Consume buffered jump input
    if (hasJumpBuffer(movementState)) {
      consumeBufferedInput(input);
    }
  }

  /**
   * Start dodge roll
   */
  private startDodgeRoll(
    _entityId: number,
    _input: PlayerInput,
    _transform: Transform,
    _physics: Physics,
    movementState: MovementState,
    _world: World
  ): void {
    changeMovementState(movementState, 'dodgeRoll', DODGE_ROLL.DURATION);
  }

  /**
   * Start backstep
   */
  private startBackstep(
    _entityId: number,
    _input: PlayerInput,
    _transform: Transform,
    _physics: Physics,
    movementState: MovementState,
    _world: World
  ): void {
    changeMovementState(movementState, 'backstep', BACKSTEP.DURATION);
  }

  /**
   * Start crouch slide
   */
  private startCrouchSlide(
    _entityId: number,
    _input: PlayerInput,
    _transform: Transform,
    _physics: Physics,
    movementState: MovementState,
    _world: World
  ): void {
    changeMovementState(movementState, 'crouchSlide', CROUCH_SLIDE.DURATION);
  }

  /**
   * Update facing direction
   */
  private updateFacing(input: PlayerInput, transform: Transform, movementState: MovementState): void {
    if (!movementState.canMove) {
      return; // Don't change facing during actions that lock movement
    }
    
    if (input.moveLeft) {
      transform.facing = -1;
    } else if (input.moveRight) {
      transform.facing = 1;
    }
  }
}