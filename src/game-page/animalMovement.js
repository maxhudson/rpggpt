/**
 * Updates animal positions based on their patrol areas
 * @param {Object} game - Current game state
 * @param {Object} viewport - Viewport bounds {minX, maxX, minY, maxY} with buffer
 * @returns {Object} - {updates: Array, messages: Array} - updates for animal positions and messages to display
 */
export function updateAnimalPositions(game, viewport) {
  const { activeLocation, activeCharacter } = game.instance;
  const location = game.instance.locations[activeLocation];

  if (!location || !location.elementInstances) return { updates: [], messages: [] };

  const updates = [];
  const messages = [];
  const moveSpeed = 0.008; // Slower speed (was 0.02)
  const attackRange = 0.25; // Distance at which aggressive animals attack (matches player interaction range)

  // Get player position for attack calculations
  const playerData = game.instance.characters[activeCharacter];
  const playerPosition = { x: playerData.x, y: playerData.y };

  Object.entries(location.elementInstances).forEach(([instanceId, instance]) => {
    // Only process animals
    if (instance.collection !== 'Animals') return;

    // Skip dead animals
    if (instance.isDead) return;

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

    // Check if this animal has Attack action (aggressive animals like wolves)
    const animalDef = game.elements?.Animals?.[instance.element];
    const hasAttackAction = animalDef?.actions?.Attack;

    if (hasAttackAction) {
      const currentDay = game.instance.clock.day;
      const currentTime = game.instance.clock.time;
      const [hour, minute, period] = currentTime;

      // Convert to minutes since day start
      let currentMinutes = (period === 'pm' && hour !== 12 ? hour + 12 : (period === 'am' && hour === 12 ? 0 : hour)) * 60 + minute;
      const currentTimestamp = currentDay * 24 * 60 + currentMinutes;

      const lastAttackTime = instance.lastAttackTime || 0;
      const attackCooldownMinutes = 0.033; // 2 seconds = ~0.033 minutes (in-game time)

      // Check distance to player
      const distanceToPlayer = Math.sqrt(
        Math.pow(instance.x - playerPosition.x, 2) +
        Math.pow(instance.y - playerPosition.y, 2)
      );

      // Attack player if within range and cooldown expired
      if (distanceToPlayer <= attackRange && (currentTimestamp - lastAttackTime) >= attackCooldownMinutes) {
        // Calculate damage
        const attackStat = animalDef.stats?.base?.Attack || 1;
        const damage = Array.isArray(attackStat)
          ? Math.floor(Math.random() * (attackStat[1] - attackStat[0] + 1)) + attackStat[0]
          : attackStat;

        // Damage the player (reduce character health)
        const currentHealth = playerData.stats?.Health || 10;
        const newHealth = Math.max(0, currentHealth - damage);

        updates.push({
          type: 'set',
          path: `instance.characters.${activeCharacter}.stats.Health`,
          value: newHealth
        });

        // Update last attack timestamp
        updates.push({
          type: 'set',
          path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.lastAttackTime`,
          value: currentTimestamp
        });

        // Add attack message
        messages.push(`${instance.element} attacks ${activeCharacter} for ${damage} damage! Health: ${newHealth}`);
      }

      // Also check for nearby animals to attack
      Object.entries(location.elementInstances).forEach(([targetId, targetInstance]) => {
        if (targetId === instanceId) return; // Don't attack self
        if (targetInstance.collection !== 'Animals') return;
        if (targetInstance.isDead) return; // Don't attack dead animals

        const distanceToTarget = Math.sqrt(
          Math.pow(instance.x - targetInstance.x, 2) +
          Math.pow(instance.y - targetInstance.y, 2)
        );

        if (distanceToTarget <= attackRange && (currentTimestamp - lastAttackTime) >= attackCooldownMinutes) {
          const targetDef = game.elements?.Animals?.[targetInstance.element];
          const attackStat = animalDef.stats?.base?.Attack || 1;
          const damage = Array.isArray(attackStat)
            ? Math.floor(Math.random() * (attackStat[1] - attackStat[0] + 1)) + attackStat[0]
            : attackStat;

          const currentHealth = targetInstance.health || targetDef?.stats?.base?.Health?.[0] || 10;
          const newHealth = Math.max(0, currentHealth - damage);

          if (newHealth <= 0) {
            // Target killed
            updates.push({
              type: 'set',
              path: `instance.locations.${activeLocation}.elementInstances.${targetId}.health`,
              value: 0
            });
            updates.push({
              type: 'set',
              path: `instance.locations.${activeLocation}.elementInstances.${targetId}.isDead`,
              value: true
            });
          } else {
            // Target survives
            updates.push({
              type: 'set',
              path: `instance.locations.${activeLocation}.elementInstances.${targetId}.health`,
              value: newHealth
            });
          }

          // Update last attack timestamp
          updates.push({
            type: 'set',
            path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.lastAttackTime`,
            value: currentTimestamp
          });
        }
      });
    }

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

  return { updates, messages };
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
