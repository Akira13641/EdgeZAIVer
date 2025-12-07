/**
 * Camera System - handles camera following and behavior
 */

import { System, World } from '../core/World';
import { Resources, RESOURCE_NAMES, CameraState } from '../core/Resources';
import { CAMERA } from '../core/Constants';
import { Transform } from '../components/Transform';
import { PlayerInput } from '../components/PlayerInput';

export class CameraSystem implements System {
  readonly name = 'CameraSystem';

  update(_world: World, _deltaTime: number): void {
    const cameraState = Resources.get<CameraState>(RESOURCE_NAMES.CAMERA_STATE);
    
    // Find player entity
    const playerEntities = _world.findEntitiesWithComponents('PlayerInput', 'Transform');
    
    if (playerEntities.length === 0) {
      return;
    }
    
    const playerId = playerEntities[0];
    const playerTransform = _world.getComponent<Transform>(playerId, 'Transform');
    const playerInput = _world.getComponent<PlayerInput>(playerId, 'PlayerInput');
    
    if (!playerTransform) {
      return;
    }
    
    // Update camera to follow player
    this.updateCameraFollow(cameraState, playerTransform, playerInput, _deltaTime);
    
    // Update camera shake
    this.updateCameraShake(cameraState, _deltaTime);
  }

  fixedUpdate(_world: World, _fixedDeltaTime: number): void {
    // Camera system doesn't need fixed updates
  }

  /**
   * Update camera to follow player with dead zone and look-ahead
   */
  private updateCameraFollow(
    cameraState: CameraState,
    playerTransform: Transform,
    playerInput: PlayerInput | undefined,
    _deltaTime: number
  ): void {
    // Calculate target position based on player
    let targetX = playerTransform.x;
    let targetY = playerTransform.y;
    
    // Apply look-ahead when running
    if (playerInput?.run) {
      targetX += CAMERA.LOOK_AHEAD_DISTANCE * playerTransform.facing;
    }
    
    // Apply dead zone
    const dx = targetX - cameraState.x;
    const dy = targetY - cameraState.y;
    
    const halfDeadZoneWidth = CAMERA.DEAD_ZONE_WIDTH / 2;
    const halfDeadZoneHeight = CAMERA.DEAD_ZONE_HEIGHT / 2;
    
    // Only move camera if player is outside dead zone
    if (Math.abs(dx) > halfDeadZoneWidth) {
      const moveX = Math.sign(dx) * (Math.abs(dx) - halfDeadZoneWidth);
      cameraState.x += moveX * 0.1; // Smooth follow
    }
    
    if (Math.abs(dy) > halfDeadZoneHeight) {
      const moveY = Math.sign(dy) * (Math.abs(dy) - halfDeadZoneHeight);
      cameraState.y += moveY * 0.1; // Smooth follow
    }
    
    // Apply camera bounds if set
    if (cameraState.bounds) {
      this.applyCameraBounds(cameraState);
    }
  }

  /**
   * Apply camera bounds to keep camera within defined area
   */
  private applyCameraBounds(cameraState: any): void {
    if (!cameraState.bounds) {
      return;
    }
    
    const bounds = cameraState.bounds;
    
    if (bounds.left !== undefined && cameraState.x < bounds.left) {
      cameraState.x = bounds.left;
    }
    if (bounds.right !== undefined && cameraState.x > bounds.right) {
      cameraState.x = bounds.right;
    }
    if (bounds.top !== undefined && cameraState.y < bounds.top) {
      cameraState.y = bounds.top;
    }
    if (bounds.bottom !== undefined && cameraState.y > bounds.bottom) {
      cameraState.y = bounds.bottom;
    }
  }

  /**
   * Update camera shake effect
   */
  private updateCameraShake(cameraState: any, deltaTime: number): void {
    if (cameraState.shake.duration > 0) {
      cameraState.shake.duration -= deltaTime * 1000; // Convert to ms
      
      if (cameraState.shake.duration <= 0) {
        // End shake
        cameraState.shake.x = 0;
        cameraState.shake.y = 0;
        cameraState.shake.duration = 0;
      } else {
        // Calculate shake offset
        const intensity = cameraState.shake.duration / 1000; // Fade out over 1 second
        cameraState.shake.x = (Math.random() - 0.5) * 10 * intensity;
        cameraState.shake.y = (Math.random() - 0.5) * 10 * intensity;
      }
    }
  }

  /**
   * Start camera shake
   */
  public static startCameraShake(_intensity: number, duration: number): void {
    const cameraState = Resources.get<CameraState>(RESOURCE_NAMES.CAMERA_STATE);
    cameraState.shake.duration = duration;
    // Intensity is applied in the update method
  }

  /**
   * Set camera bounds
   */
  public static setCameraBounds(bounds: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  } | null): void {
    const cameraState = Resources.get<CameraState>(RESOURCE_NAMES.CAMERA_STATE);
    cameraState.bounds = bounds;
  }

  /**
   * Set camera zoom
   */
  public static setCameraZoom(zoom: number): void {
    const cameraState = Resources.get<CameraState>(RESOURCE_NAMES.CAMERA_STATE);
    cameraState.zoom = Math.max(0.1, Math.min(5.0, zoom)); // Clamp zoom
  }

  /**
   * Set camera position instantly
   */
  public static setCameraPosition(x: number, y: number): void {
    const cameraState = Resources.get<CameraState>(RESOURCE_NAMES.CAMERA_STATE);
    cameraState.x = x;
    cameraState.y = y;
  }
}