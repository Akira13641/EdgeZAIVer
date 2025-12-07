/**
 * Time management system with fixed timestep
 */

export class Time {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private frameCount: number = 0;

  // Fixed timestep configuration
  public static readonly FIXED_TIMESTEP = 1000 / 60; // 60 FPS in milliseconds
  public static readonly MAX_FRAME_TIME = 250; // Cap to prevent spiral of death

  // Delta time (actual time since last frame)
  public deltaTime: number = 0;

  // Fixed delta time for physics
  public fixedDeltaTime: number = Time.FIXED_TIMESTEP;

  // Alpha value for interpolation between fixed updates
  public alpha: number = 0;

  // Scale for time manipulation
  public timeScale: number = 1.0;

  /**
   * Called at the beginning of each frame
   */
  public beginFrame(): void {
    const currentTime = performance.now();
    
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }

    // Calculate delta time with cap
    let rawDelta = currentTime - this.lastTime;
    this.deltaTime = Math.min(rawDelta, Time.MAX_FRAME_TIME) * this.timeScale;
    
    // Add to accumulator for fixed timestep
    this.accumulator += this.deltaTime;
    
    this.lastTime = currentTime;
    this.frameCount++;
  }

  /**
   * Check if a fixed update should run
   */
  public shouldUpdateFixed(): boolean {
    return this.accumulator >= Time.FIXED_TIMESTEP;
  }

  /**
   * Consume one fixed timestep
   */
  public consumeFixedTimestep(): void {
    this.accumulator -= Time.FIXED_TIMESTEP;
  }

  /**
   * Calculate alpha for interpolation
   */
  public calculateAlpha(): void {
    this.alpha = this.accumulator / Time.FIXED_TIMESTEP;
  }

  /**
   * Get total elapsed time since start
   */
  public getElapsedTime(): number {
    return performance.now();
  }

  /**
   * Get current frame count
   */
  public getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Reset time tracking
   */
  public reset(): void {
    this.lastTime = 0;
    this.accumulator = 0;
    this.frameCount = 0;
    this.deltaTime = 0;
    this.alpha = 0;
  }

  /**
   * Convert milliseconds to seconds
   */
  public static msToSeconds(ms: number): number {
    return ms / 1000;
  }

  /**
   * Convert seconds to milliseconds
   */
  public static secondsToMs(seconds: number): number {
    return seconds * 1000;
  }
}