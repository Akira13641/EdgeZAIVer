/**
 * Input System - processes raw input and updates PlayerInput components
 */

import { System, World } from '../core/World';
import { Resources, RESOURCE_NAMES } from '../core/Resources';
import { PlayerInput, updateWeaponZone } from '../components/PlayerInput';
import { Transform } from '../components/Transform';

export class InputSystem implements System {
  readonly name = 'InputSystem';

  update(world: World, _deltaTime: number): void {
    // Get global input state
    const inputState = Resources.get(RESOURCE_NAMES.INPUT_STATE);
    
    // Find all player entities
    const playerEntities = world.findEntitiesWithComponents('PlayerInput', 'Transform');
    
    for (const entityId of playerEntities) {
      const playerInput = world.getComponent<PlayerInput>(entityId, 'PlayerInput');
      const transform = world.getComponent<Transform>(entityId, 'Transform');
      
      if (!playerInput || !transform) {
        continue;
      }
      
      // Update player input from global state
      this.updatePlayerInput(playerInput, inputState);
      
      // Update weapon zone based on mouse position
      updateWeaponZone(playerInput, transform.x, transform.y, transform.facing);
    }
  }

  fixedUpdate(_world: World, _fixedDeltaTime: number): void {
    // Input system doesn't need fixed updates
  }

  /**
   * Update player input component from global input state
   */
  private updatePlayerInput(playerInput: PlayerInput, inputState: any): void {
    // Movement inputs
    playerInput.moveLeft = inputState.keys.get('KeyA') || false;
    playerInput.moveRight = inputState.keys.get('KeyD') || false;
    playerInput.moveUp = inputState.keys.get('KeyW') || false;
    playerInput.moveDown = inputState.keys.get('KeyS') || false;
    
    // Action inputs
    playerInput.run = inputState.keys.get('ShiftLeft') || inputState.keys.get('ShiftRight') || false;
    playerInput.jump = inputState.keys.get('Space') || false;
    playerInput.crouch = inputState.keys.get('KeyS') || false;
    playerInput.dodgeRoll = inputState.keys.get('KeyG') || false;
    playerInput.backstep = inputState.keys.get('AltLeft') || inputState.keys.get('AltRight') || false;
    playerInput.lightAttack = inputState.mouseButtons.get(0) || false; // Left mouse
    playerInput.heavyAttack = inputState.keys.get('KeyE') || false;
    playerInput.block = inputState.mouseButtons.get(2) || false; // Right mouse
    playerInput.parry = inputState.keys.get('KeyQ') || false;
    
    // Mouse position
    playerInput.mouseX = inputState.mouseX;
    playerInput.mouseY = inputState.mouseY;
    playerInput.worldMouseX = inputState.worldMouseX;
    playerInput.worldMouseY = inputState.worldMouseY;
    
    // Buffered input
    playerInput.bufferedInput = inputState.bufferedInput;
  }
}