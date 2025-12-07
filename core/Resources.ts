/**
 * Singleton resource definitions for global game state
 */

// Input state resource
export interface InputState {
  // Keyboard state
  keys: Map<string, boolean>;
  
  // Mouse state
  mouseX: number;
  mouseY: number;
  worldMouseX: number;
  worldMouseY: number;
  mouseButtons: Map<number, boolean>;
  
  // Input buffer
  bufferedInput: BufferedInput | null;
}

export interface BufferedInput {
  action: 'lightAttack' | 'heavyAttack' | 'roll' | 'jump';
  timestamp: number;
  priority: number; // 1: Low (Jump), 2: Med (Attack), 3: High (Roll)
}

// Camera state resource
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX?: number;
  targetY?: number;
  bounds: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  } | null;
  shake: {
    x: number;
    y: number;
    duration: number;
  };
}

// Game state resource
export interface GameState {
  isPaused: boolean;
  isGameOver: boolean;
  currentLevel: string;
  playerEntityId: number | null;
}

// Resource registry
export class Resources {
  private static resources = new Map<string, any>();

  /**
   * Register a resource
   */
  public static register<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  /**
   * Get a resource
   */
  public static get<T>(name: string): T {
    const resource = this.resources.get(name);
    if (resource === undefined) {
      throw new Error(`Resource '${name}' not found`);
    }
    return resource as T;
  }

  /**
   * Check if a resource exists
   */
  public static has(name: string): boolean {
    return this.resources.has(name);
  }

  /**
   * Remove a resource
   */
  public static remove(name: string): void {
    this.resources.delete(name);
  }

  /**
   * Clear all resources
   */
  public static clear(): void {
    this.resources.clear();
  }
}

// Resource names constants
export const RESOURCE_NAMES = {
  INPUT_STATE: 'InputState',
  CAMERA_STATE: 'CameraState',
  GAME_STATE: 'GameState',
} as const;