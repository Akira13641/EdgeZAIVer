/**
 * Main game class - orchestrates all systems and game loop
 */

import { Time } from './Time';
import { Input } from './Input';
import { World } from './World';
import { Resources, RESOURCE_NAMES } from './Resources';
import type { GameState, CameraState } from './Resources';
import { createSystems } from '../systems';
import { createPlayer } from '../entities/Archetypes';

export class Game {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private time: Time;
  private input: Input;
  private world: World;
  private isRunning: boolean = false;
  private animationId: number | null = null;

  // Game systems
  private systems: any[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.context = context;

    // Initialize core systems
    this.time = new Time();
    this.input = new Input(canvas);
    this.world = new World();

    // Initialize game state
    this.initializeGameState();

    // Initialize game systems
    this.initializeSystems();

    // Create initial entities
    this.createInitialEntities();

    // Set canvas size
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }

  /**
   * Initialize game state resources
   */
  private initializeGameState(): void {
    // Initialize camera state
    Resources.register(RESOURCE_NAMES.CAMERA_STATE, {
      x: 0,
      y: 0,
      zoom: 1.0,
      bounds: null,
      shake: { x: 0, y: 0, duration: 0 },
    });

    // Initialize game state
    Resources.register(RESOURCE_NAMES.GAME_STATE, {
      isPaused: false,
      isGameOver: false,
      currentLevel: 'test_level',
      playerEntityId: null,
    });
  }

  /**
   * Initialize all game systems
   */
  private initializeSystems(): void {
    this.systems = createSystems(this.context);
    
    // Add systems to the world
    for (const system of this.systems) {
      this.world.addSystem(system);
    }
  }

  /**
   * Create initial entities for the game
   */
  private createInitialEntities(): void {
    // Create player at starting position
    const playerId = createPlayer(this.world, 0, 200);
    
    // Update game state with player entity ID
    const gameState = Resources.get(RESOURCE_NAMES.GAME_STATE) as GameState;
    gameState.playerEntityId = playerId;
  }

  /**
   * Resize canvas to match window size
   */
  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Main game loop with fixed timestep
   */
  private gameLoop(): void {
    if (!this.isRunning) {
      return;
    }

    // Begin frame timing
    this.time.beginFrame();

    // Fixed updates for physics and game logic
    while (this.time.shouldUpdateFixed()) {
      this.fixedUpdate();
      this.time.consumeFixedTimestep();
    }

    // Variable update for things that don't need fixed timing
    this.update(this.time.deltaTime);

    // Calculate alpha for interpolation
    this.time.calculateAlpha();

    // Render everything
    this.render();

    // Schedule next frame
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Fixed update - runs at fixed timestep for physics
   */
  private fixedUpdate(): void {
    const fixedDt = this.time.fixedDeltaTime / 1000; // Convert to seconds

    // Update world with fixed timestep
    this.world.fixedUpdate(fixedDt);

    // Update other systems that need fixed timing
    for (const system of this.systems) {
      if (system.fixedUpdate) {
        system.fixedUpdate(fixedDt);
      }
    }
  }

  /**
   * Variable update - runs every frame with delta time
   */
  private update(deltaTime: number): void {
    const dt = deltaTime / 1000; // Convert to seconds

    // Update world with variable timestep
    this.world.update(dt);

    // Update other systems
    for (const system of this.systems) {
      if (system.update) {
        system.update(dt);
      }
    }
  }

  /**
   * Render everything
   */
  private render(): void {
    // Clear canvas
    this.context.fillStyle = '#1a1a1a';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context state
    this.context.save();

    // Apply camera transform
    this.applyCameraTransform();

    // Render entities
    this.renderEntities();

    // Restore context state
    this.context.restore();

    // Render UI (without camera transform)
    this.renderUI();
  }

  /**
   * Apply camera transformation
   */
  private applyCameraTransform(): void {
    const cameraState = Resources.get(RESOURCE_NAMES.CAMERA_STATE) as CameraState;
    
    // Center camera on player position
    this.context.translate(
      this.canvas.width / 2 - cameraState.x,
      this.canvas.height / 2 - cameraState.y
    );

    // Apply zoom
    this.context.scale(cameraState.zoom, cameraState.zoom);

    // Apply screen shake
    if (cameraState.shake.duration > 0) {
      this.context.translate(cameraState.shake.x, cameraState.shake.y);
    }
  }

  /**
   * Render all entities
   */
  private renderEntities(): void {
    // The RenderSystem now handles entity rendering
    // This method is kept for compatibility but can be removed
  }

  /**
   * Render UI elements
   */
  private renderUI(): void {
    // Render basic debug info
    this.context.fillStyle = '#ffffff';
    this.context.font = '16px monospace';
    this.context.fillText(`FPS: ${Math.round(1000 / this.time.deltaTime)}`, 10, 30);
    this.context.fillText(`Frame: ${this.time.getFrameCount()}`, 10, 50);
    this.context.fillText(`Entities: ${this.world.getEntityCount()}`, 10, 70);
  }

  /**
   * Get the world instance
   */
  public getWorld(): World {
    return this.world;
  }

  /**
   * Get the time instance
   */
  public getTime(): Time {
    return this.time;
  }

  /**
   * Get the input instance
   */
  public getInput(): Input {
    return this.input;
  }

  /**
   * Get the canvas context
   */
  public getContext(): CanvasRenderingContext2D {
    return this.context;
  }

  /**
   * Get the canvas element
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stop();
    this.input.destroy();
    Resources.clear();
  }
}