// Constants for the RPG game platform
const K = {
  gridSize: 30, // Grid cell size in pixels
  spriteGenerationCost: 20, // Credits cost per sprite generation

  // Snap value to grid
  snapToGrid: (value) => Math.round(value / K.gridSize) * K.gridSize,
};

export default K;
