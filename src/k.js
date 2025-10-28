// Constants for the RPG game platform
const K = {
  gridSize: 50, // Grid cell size in pixels
  cellSize: 50, // Alias for gridSize (used in map rendering)
  spriteGenerationCost: 20, // Credits cost per sprite generation

  // Snap value to grid
  snapToGrid: (value) => Math.round(value / K.gridSize) * K.gridSize,
};

export const cellSize = K.cellSize;

export default K;
