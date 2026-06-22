import type { Snapshot } from '../state/schema';

// Imperative handle the Lit UI talks to. Keeps the render loop and Three scene out of any
// reactive/vDOM tree (NFR-1.2): the UI calls methods, it never drives the canvas.
export interface Engine {
  readonly backend: string;
  exportSnapshot(): Snapshot;
  importSnapshot(snap: Snapshot): void;
  togglePause(): boolean; // returns the new paused state
  reset(): void;
  // Highlight a contiguous particle range (hierarchy-tree selection). Pass null to clear.
  highlightParticles(start: number | null, count: number): void;
  // Smoothly fly the camera to frame a particle group (macro→micro focus, NFR-2.2).
  focusNode(start: number | null, count: number): void;
}
