/**
 * Global type definitions for the EDGE game engine
 */

declare global {
  interface Window {
    game: import('./core/Game').Game | null;
  }
}

export {};