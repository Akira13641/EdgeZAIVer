/**
 * Raw input capture and processing system
 */

import { InputState, BufferedInput, Resources, RESOURCE_NAMES } from './Resources';
import { INPUT_BUFFER } from './Constants';

export class Input {
  private canvas: HTMLCanvasElement;
  private inputState: InputState;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.inputState = {
      keys: new Map(),
      mouseX: 0,
      mouseY: 0,
      worldMouseX: 0,
      worldMouseY: 0,
      mouseButtons: new Map(),
      bufferedInput: null,
    };

    // Register as a resource
    Resources.register(RESOURCE_NAMES.INPUT_STATE, this.inputState);

    this.setupEventListeners();
  }

  /**
   * Set up all input event listeners
   */
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Mouse events
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Handle key press events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    this.inputState.keys.set(event.code, true);

    // Handle input buffering for specific actions
    this.handleInputBuffering(event.code, true);
  }

  /**
   * Handle key release events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    this.inputState.keys.set(event.code, false);
  }

  /**
   * Handle mouse movement
   */
  private handleMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    
    // Store mouse position relative to canvas
    this.inputState.mouseX = event.clientX - rect.left;
    this.inputState.mouseY = event.clientY - rect.top;

    // TODO: Convert to world coordinates once camera system is implemented
    this.inputState.worldMouseX = this.inputState.mouseX;
    this.inputState.worldMouseY = this.inputState.mouseY;
  }

  /**
   * Handle mouse button press
   */
  private handleMouseDown(event: MouseEvent): void {
    this.inputState.mouseButtons.set(event.button, true);
    
    // Handle input buffering for mouse actions
    if (event.button === 0) { // Left click
      this.bufferInput('lightAttack', 2);
    } else if (event.button === 2) { // Right click
      // Block is not buffered - it's instantaneous
    }
  }

  /**
   * Handle mouse button release
   */
  private handleMouseUp(event: MouseEvent): void {
    this.inputState.mouseButtons.set(event.button, false);
  }

  /**
   * Prevent context menu
   */
  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  /**
   * Handle input buffering for keyboard actions
   */
  private handleInputBuffering(keyCode: string, isPressed: boolean): void {
    if (!isPressed) return;

    switch (keyCode) {
      case 'Space':
        this.bufferInput('jump', 1);
        break;
      case 'KeyG':
        this.bufferInput('roll', 3);
        break;
      case 'KeyE':
        this.bufferInput('heavyAttack', 2);
        break;
      // Other actions like block, parry, etc. are not buffered
    }
  }

  /**
   * Add an input to the buffer with priority checking
   */
  private bufferInput(action: BufferedInput['action'], priority: number): void {
    const now = performance.now();
    const currentBuffer = this.inputState.bufferedInput;

    // Clear expired buffer
    if (currentBuffer && (now - currentBuffer.timestamp) > INPUT_BUFFER.WINDOW) {
      this.inputState.bufferedInput = null;
    }

    // Overwrite if higher priority or empty
    if (!this.inputState.bufferedInput || priority >= this.inputState.bufferedInput.priority) {
      this.inputState.bufferedInput = {
        action,
        timestamp: now,
        priority,
      };
    }
  }

  /**
   * Get current input state
   */
  public getInputState(): InputState {
    return this.inputState;
  }

  /**
   * Check if a key is currently pressed
   */
  public isKeyPressed(keyCode: string): boolean {
    return this.inputState.keys.get(keyCode) || false;
  }

  /**
   * Check if a mouse button is currently pressed
   */
  public isMouseButtonPressed(button: number): boolean {
    return this.inputState.mouseButtons.get(button) || false;
  }

  /**
   * Get and consume buffered input
   */
  public consumeBufferedInput(): BufferedInput | null {
    const buffered = this.inputState.bufferedInput;
    this.inputState.bufferedInput = null;
    return buffered;
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }
}