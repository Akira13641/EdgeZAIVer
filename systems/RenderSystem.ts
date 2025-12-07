/**
 * Render System - handles all rendering to canvas
 */

import { System, World } from '../core/World';
import { Resources, RESOURCE_NAMES } from '../core/Resources';
import { Transform } from '../components/Transform';
import { PlayerInput } from '../components/PlayerInput';
import { MovementState } from '../features/movement/MovementStateComponent';

export class RenderSystem implements System {
  readonly name = 'RenderSystem';
  private context: CanvasRenderingContext2D | null = null;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  update(world: World, _deltaTime: number): void {
    if (!this.context) {
      return;
    }

    const cameraState = Resources.get(RESOURCE_NAMES.CAMERA_STATE);
    
    // Clear canvas
    this.context.fillStyle = '#1a1a1a';
    this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    
    // Save context state
    this.context.save();
    
    // Apply camera transform
    this.applyCameraTransform(this.context, cameraState);
    
    // Render game world
    this.renderWorld(this.context, world);
    
    // Restore context state
    this.context.restore();
    
    // Render UI (without camera transform)
    this.renderUI(this.context, world);
  }

  fixedUpdate(_world: World, _fixedDeltaTime: number): void {
    // Render system doesn't need fixed updates
  }

  /**
   * Apply camera transformation
   */
  private applyCameraTransform(context: CanvasRenderingContext2D, cameraState: any): void {
    // Center camera on player position
    context.translate(
      context.canvas.width / 2 - cameraState.x,
      context.canvas.height / 2 - cameraState.y
    );

    // Apply zoom
    context.scale(cameraState.zoom, cameraState.zoom);

    // Apply screen shake
    if (cameraState.shake.duration > 0) {
      context.translate(cameraState.shake.x, cameraState.shake.y);
    }
  }

  /**
   * Render the game world
   */
  private renderWorld(context: CanvasRenderingContext2D, world: World): void {
    // Render ground/platform
    this.renderGround(context);
    
    // Render entities
    this.renderEntities(context, world);
  }

  /**
   * Render ground/platform
   */
  private renderGround(context: CanvasRenderingContext2D): void {
    // Simple ground line at y = 300
    context.strokeStyle = '#666666';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-1000, 300);
    context.lineTo(1000, 300);
    context.stroke();
    
    // Ground surface
    context.fillStyle = '#444444';
    context.fillRect(-1000, 300, 2000, 1000);
  }

  /**
   * Render all entities
   */
  private renderEntities(context: CanvasRenderingContext2D, world: World): void {
    // Sort entities by Y position for proper depth rendering
    const entities = world.getAllEntities();
    entities.sort((a, b) => {
      const transformA = world.getComponent<Transform>(a, 'Transform');
      const transformB = world.getComponent<Transform>(b, 'Transform');
      return (transformA?.y || 0) - (transformB?.y || 0);
    });
    
    for (const entityId of entities) {
      this.renderEntity(context, world, entityId);
    }
  }

  /**
   * Render a single entity
   */
  private renderEntity(context: CanvasRenderingContext2D, world: World, entityId: number): void {
    const transform = world.getComponent<Transform>(entityId, 'Transform');
    const playerInput = world.getComponent<PlayerInput>(entityId, 'PlayerInput');
    const movementState = world.getComponent<MovementState>(entityId, 'MovementState');
    
    if (!transform) {
      return;
    }
    
    // Check if this is a player entity
    if (playerInput) {
      this.renderPlayer(context, transform, playerInput, movementState);
    } else {
      // Render generic entity
      this.renderGenericEntity(context, transform);
    }
  }

  /**
   * Render player character
   */
  private renderPlayer(
    context: CanvasRenderingContext2D,
    transform: Transform,
    playerInput: PlayerInput,
    movementState: MovementState | undefined
  ): void {
    context.save();
    
    // Apply entity transform
    context.translate(transform.x, transform.y);
    context.scale(transform.facing, 1);
    
    // Apply invulnerability effect
    if (movementState?.isInvulnerable) {
      context.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
    }
    
    // Determine color based on state
    let color = '#ff6b6b'; // Default red
    if (movementState) {
      switch (movementState.currentState) {
        case 'idle':
          color = '#ff6b6b';
          break;
        case 'walking':
        case 'running':
          color = '#4ecdc4';
          break;
        case 'crouching':
        case 'crouchWalking':
          color = '#45b7d1';
          break;
        case 'jumping':
        case 'falling':
          color = '#f9ca24';
          break;
        case 'dodgeRoll':
          color = '#6c5ce7';
          break;
        case 'backstep':
          color = '#a29bfe';
          break;
        case 'crouchSlide':
          color = '#fd79a8';
          break;
      }
    }
    
    // Draw character body (simple rectangle for now)
    const width = 32;
    const height = movementState?.currentState === 'crouching' || movementState?.currentState === 'crouchWalking' ? 32 : 64;
    
    context.fillStyle = color;
    context.fillRect(-width / 2, -height, width, height);
    
    // Draw head
    context.fillStyle = '#ffeaa7';
    context.fillRect(-width / 2, -height - 16, width, 16);
    
    // Draw weapon indicator based on zone
    this.renderWeaponIndicator(context, playerInput);
    
    // Draw facing indicator
    context.fillStyle = '#ffffff';
    const eyeX = transform.facing > 0 ? width / 4 : -width / 4;
    context.fillRect(eyeX - 2, -height - 8, 4, 4);
    
    context.restore();
  }

  /**
   * Render weapon zone indicator
   */
  private renderWeaponIndicator(context: CanvasRenderingContext2D, playerInput: PlayerInput): void {
    context.save();
    
    // Weapon zone colors
    const zoneColors = {
      0: '#95afc0', // Guard - gray
      1: '#ff6348', // High - red
      2: '#f9ca24', // Mid - yellow
      3: '#20bf6b', // Low - green
    };
    
    const color = zoneColors[playerInput.weaponZone as keyof typeof zoneColors] || '#ffffff';
    
    // Draw weapon line
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    
    switch (playerInput.weaponZone) {
      case 0: // Guard stance behind
        context.moveTo(-20, -32);
        context.lineTo(-40, -32);
        break;
      case 1: // High zone
        context.moveTo(0, -48);
        context.lineTo(30, -64);
        break;
      case 2: // Mid zone
        context.moveTo(0, -32);
        context.lineTo(40, -32);
        break;
      case 3: // Low zone
        context.moveTo(0, -16);
        context.lineTo(30, 0);
        break;
    }
    
    context.stroke();
    
    context.restore();
  }

  /**
   * Render generic entity
   */
  private renderGenericEntity(context: CanvasRenderingContext2D, transform: Transform): void {
    context.save();
    
    // Apply entity transform
    context.translate(transform.x, transform.y);
    context.scale(transform.facing, 1);
    
    // Draw simple rectangle
    context.fillStyle = '#888888';
    context.fillRect(-16, -32, 32, 64);
    
    context.restore();
  }

  /**
   * Render UI elements
   */
  private renderUI(context: CanvasRenderingContext2D, world: World): void {
    // Find player entity for UI display
    const playerEntities = world.findEntitiesWithComponents('PlayerInput', 'MovementState');
    
    if (playerEntities.length === 0) {
      return;
    }
    
    const playerId = playerEntities[0];
    const movementState = world.getComponent<MovementState>(playerId, 'MovementState');
    const playerInput = world.getComponent<PlayerInput>(playerId, 'PlayerInput');
    
    // Render debug info
    this.renderDebugInfo(context, movementState, playerInput);
  }

  /**
   * Render debug information
   */
  private renderDebugInfo(
    context: CanvasRenderingContext2D,
    movementState: MovementState | undefined,
    playerInput: PlayerInput | undefined
  ): void {
    context.fillStyle = '#ffffff';
    context.font = '14px monospace';
    context.textAlign = 'left';
    
    let y = 20;
    const lineHeight = 18;
    
    // State information
    if (movementState) {
      context.fillText(`State: ${movementState.currentState}`, 10, y);
      y += lineHeight;
      context.fillText(`State Timer: ${movementState.stateTimer.toFixed(0)}ms`, 10, y);
      y += lineHeight;
      context.fillText(`Can Move: ${movementState.canMove}`, 10, y);
      y += lineHeight;
      context.fillText(`Can Jump: ${movementState.canJump}`, 10, y);
      y += lineHeight;
    }
    
    // Input information
    if (playerInput) {
      context.fillText(`Weapon Zone: ${playerInput.weaponZone}`, 10, y);
      y += lineHeight;
      context.fillText(`Facing: ${playerInput.weaponZone === 0 ? 'Guard' : ['High', 'Mid', 'Low'][playerInput.weaponZone - 1]}`, 10, y);
      y += lineHeight;
    }
    
    // Instructions
    y += lineHeight;
    context.fillText('Controls:', 10, y);
    y += lineHeight;
    context.fillText('A/D - Move, Shift - Run, S - Crouch', 10, y);
    y += lineHeight;
    context.fillText('Space - Jump, G - Roll, Alt - Backstep', 10, y);
    y += lineHeight;
    context.fillText('V - Slide (while moving)', 10, y);
    y += lineHeight;
    context.fillText('Mouse - Aim weapon, LMB - Light, RMB - Block', 10, y);
  }
}