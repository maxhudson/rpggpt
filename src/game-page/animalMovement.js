/**
 * Updates animal positions based on their patrol areas
 * @param {Object} game - Current game state
 * @param {Object} viewport - Viewport bounds {minX, maxX, minY, maxY} with buffer
 * @returns {Array} - Array of updates for animal positions
 */
export function updateAnimalPositions(game, viewport) {
  const { activeLocation } = game.instance;
  const location = game.instance.locations[activeLocation];

  if (!location || !location.elementInstances) return [];

  const updates = [];
  const moveSpeed = 0.008; // Slower speed (was 0.02)

  Object.entries(location.elementInstances).forEach(([instanceId, instance]) => {
    // Only process animals
    if (instance.collection !== 'Animals') return;

    // Skip dead animals (health <= 0)
    if (instance.health !== undefined && instance.health <= 0) return;

    // Check if animal is within viewport buffer (skip if far off-screen)
    if (viewport) {
      const isInViewport =
        instance.x >= viewport.minX &&
        instance.x <= viewport.maxX &&
        instance.y >= viewport.minY &&
        instance.y <= viewport.maxY;

      if (!isInViewport) return; // Don't update off-screen animals
    }

    // Get patrol area (required for movement)
    const patrol = instance.patrol;
    if (!patrol) return; // No patrol area defined

    // Initialize movement state if not present
    const isPaused = instance.isPaused !== undefined ? instance.isPaused : false;
    const movementTimer = instance.movementTimer !== undefined ? instance.movementTimer : 60; // Start with 1 second of movement

    // Handle movement/pause cycle
    const newMovementTimer = movementTimer - 1;

    if (newMovementTimer <= 0) {
      // Switch between paused and moving
      const newIsPaused = !isPaused;
      const nextDuration = newIsPaused ? 120 : 60; // 2 seconds paused (120 frames), 1 second moving (60 frames)

      updates.push({
        type: 'set',
        path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.isPaused`,
        value: newIsPaused
      });
      updates.push({
        type: 'set',
        path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.movementTimer`,
        value: nextDuration
      });

      if (newIsPaused) {
        return; // Don't move this frame if just started pausing
      }
    } else {
      updates.push({
        type: 'set',
        path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.movementTimer`,
        value: newMovementTimer
      });

      if (isPaused) {
        return; // Don't move while paused
      }
    }

    // Get current angle or initialize
    let angle = instance.movementAngle !== undefined ? instance.movementAngle : Math.random() * 360;

    // Calculate new position based on angle
    const radians = (angle * Math.PI) / 180;
    let newX = instance.x + Math.cos(radians) * moveSpeed;
    let newY = instance.y + Math.sin(radians) * moveSpeed;

    // Bounce off patrol boundaries and change direction
    let newAngle = angle;

    if (newX < patrol.minX) {
      newX = patrol.minX;
      newAngle = 180 - angle + (Math.random() * 30 - 15);
    } else if (newX > patrol.maxX) {
      newX = patrol.maxX;
      newAngle = 180 - angle + (Math.random() * 30 - 15);
    }

    if (newY < patrol.minY) {
      newY = patrol.minY;
      newAngle = -angle + (Math.random() * 30 - 15);
    } else if (newY > patrol.maxY) {
      newY = patrol.maxY;
      newAngle = -angle + (Math.random() * 30 - 15);
    }

    // Normalize angle to 0-360 range
    newAngle = ((newAngle % 360) + 360) % 360;

    // Occasionally change direction randomly (1% chance per frame)
    if (Math.random() < 0.01) {
      newAngle = angle + (Math.random() * 60 - 30);
      newAngle = ((newAngle % 360) + 360) % 360;
    }

    // Determine facing direction (left or right based on horizontal movement)
    const deltaX = Math.cos(radians);
    const facingRight = deltaX > 0;

    // Update animation frame counter for bouncing effect
    const animationFrame = (instance.animationFrame || 0) + 1;

    // Only create updates if position or angle actually changed
    if (Math.abs(newX - instance.x) > 0.001 || Math.abs(newY - instance.y) > 0.001) {
      updates.push({
        type: 'set',
        path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.x`,
        value: newX
      });
      updates.push({
        type: 'set',
        path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.y`,
        value: newY
      });
    }

    if (Math.abs(newAngle - angle) > 0.1) {
      updates.push({
        type: 'set',
        path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.movementAngle`,
        value: newAngle
      });
    }

    // Update facing direction
    updates.push({
      type: 'set',
      path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.facingRight`,
      value: facingRight
    });

    // Update animation frame
    updates.push({
      type: 'set',
      path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.animationFrame`,
      value: animationFrame
    });
  });

  return updates;
}

/**
 * Calculate viewport bounds with buffer for culling off-screen animals
 * @param {Object} playerPosition - Player's current position {x, y}
 * @param {Object} stageSize - Stage dimensions {width, height}
 * @param {number} cellSize - Size of one grid cell in pixels
 * @returns {Object} - Viewport bounds {minX, maxX, minY, maxY}
 */
export function calculateViewportBounds(playerPosition, stageSize, cellSize) {
  const bufferCells = 10; // Buffer of 10 cells (~200-300px with cellSize 20-30)

  // Calculate how many cells are visible on screen
  const visibleCellsX = stageSize.width / cellSize;
  const visibleCellsY = stageSize.height / cellSize / 0.75; // Account for Y scale

  return {
    minX: playerPosition.x - visibleCellsX / 2 - bufferCells,
    maxX: playerPosition.x + visibleCellsX / 2 + bufferCells,
    minY: playerPosition.y - visibleCellsY / 2 - bufferCells,
    maxY: playerPosition.y + visibleCellsY / 2 + bufferCells
  };
}
