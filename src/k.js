// Constants for the RPG game platform
const K = {
  gridSize: 20, // Grid cell size in pixels

  // Snap value to grid
  snapToGrid: (value) => Math.round(value / K.gridSize) * K.gridSize,
};

export default K;
