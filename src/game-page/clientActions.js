// Client-side action handlers for deterministic actions that don't require AI

/**
 * Handles Harvest action client-side
 * @param {Object} game - Current game state
 * @param {string} actionType - Action type (e.g., "Harvest")
 * @param {Object} action - Action details with targetElement, targetInstanceId, etc.
 * @returns {Object} - { success, storyText, updates, message }
 */
export function handleClientAction(game, actionType, action) {
  const { activeLocation, activeCharacter } = game.instance;
  const location = game.instance.locations[activeLocation];

  switch (actionType) {
    case 'Harvest':
    case 'Forage':
      return handleHarvest(game, action, location, activeLocation, activeCharacter, actionType);

    case 'Attack':
      return handleAttack(game, action, location, activeLocation, activeCharacter);

    default:
      return null; // Not a client-side action
  }
}

function handleHarvest(game, action, location, activeLocation, activeCharacter, actionType) {
  const { targetInstanceId, targetElement, targetCollection } = action;
  const instance = location.elementInstances[targetInstanceId];

  if (!instance) {
    return {
      success: false,
      message: `${targetElement} not found`,
      updates: []
    };
  }

  const elementDef = game.elements[targetCollection]?.[targetElement];
  const harvestAction = elementDef?.actions?.[actionType];

  if (!harvestAction) {
    return {
      success: false,
      message: `Cannot ${actionType.toLowerCase()} ${targetElement}`,
      updates: []
    };
  }

  // For Forage, check if already foraged today
  if (actionType === 'Forage' && instance.lastForaged) {
    const currentDay = game.instance.clock.day;
    if (instance.lastForaged >= currentDay) {
      return {
        success: false,
        message: `The ${targetElement} has already been foraged today`,
        updates: []
      };
    }
  }

  // Check if required tool is present
  if (harvestAction.requiredItem) {
    const hasItem = location.inventory[harvestAction.requiredItem] > 0;
    if (!hasItem) {
      return {
        success: false,
        message: `You need ${harvestAction.requiredItem} to ${actionType.toLowerCase()} ${targetElement}`,
        updates: []
      };
    }
  }

  // Calculate output
  const output = {};
  Object.entries(harvestAction.output).forEach(([itemName, amount]) => {
    if (Array.isArray(amount)) {
      // Random range [min, max]
      output[itemName] = Math.floor(Math.random() * (amount[1] - amount[0] + 1)) + amount[0];
    } else {
      output[itemName] = amount;
    }
  });

  // Build updates
  const updates = [];

  // Add items to inventory
  Object.entries(output).forEach(([itemName, amount]) => {
    if (amount > 0) {
      const currentAmount = location.inventory[itemName] || 0;
      updates.push({
        type: 'set',
        path: `instance.locations.${activeLocation}.inventory.${itemName}`,
        value: currentAmount + amount
      });
    }
  });

  // Remove the element only for Harvest, not for Forage
  if (actionType === 'Harvest') {
    updates.push({
      type: 'unset',
      path: `instance.locations.${activeLocation}.elementInstances.${targetInstanceId}`
    });
  } else if (actionType === 'Forage') {
    // Mark the instance as foraged today
    updates.push({
      type: 'set',
      path: `instance.locations.${activeLocation}.elementInstances.${targetInstanceId}.lastForaged`,
      value: game.instance.clock.day
    });
  }

  // Update time (if specified)
  if (harvestAction.timeInHours) {
    const timeUpdate = calculateTimeUpdate(game.instance.clock, harvestAction.timeInHours);
    if (timeUpdate) {
      updates.push(timeUpdate);
    }
  } else if (harvestAction.timeInMinutes) {
    let minutes;
    if (Array.isArray(harvestAction.timeInMinutes)) {
      // Random range [min, max]
      const [min, max] = harvestAction.timeInMinutes;
      minutes = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      minutes = harvestAction.timeInMinutes;
    }
    const timeUpdate = calculateTimeUpdate(game.instance.clock, minutes / 60);
    if (timeUpdate) {
      updates.push(timeUpdate);
    }
  }

  // Generate story text
  const itemsList = Object.entries(output)
    .filter(([, amount]) => amount > 0)
    .map(([itemName, amount]) => `${amount} ${itemName}`)
    .join(', ');

  const storyText = `${activeCharacter} ${actionType.toLowerCase()}s the ${targetElement} and collects ${itemsList}.`;

  return {
    success: true,
    storyText,
    updates
  };
}

function handleAttack(game, action, location, activeLocation, activeCharacter) {
  const { targetInstanceId, targetElement } = action;
  const instance = location.elementInstances[targetInstanceId];

  if (!instance) {
    return {
      success: false,
      message: `${targetElement} not found`,
      updates: []
    };
  }

  const animalDef = game.elements.Animals?.[targetElement];
  if (!animalDef) {
    return {
      success: false,
      message: `Cannot attack ${targetElement}`,
      updates: []
    };
  }

  // Simple combat: reduce health by random damage (1-5)
  const damage = Math.floor(Math.random() * 5) + 1;
  const newHealth = Math.max(0, (instance.health || animalDef.stats.base.Health[0]) - damage);

  const updates = [];
  const isKilled = newHealth === 0;

  if (isKilled) {
    // Animal killed - remove instance and add loot
    const harvestAction = animalDef.actions?.Harvest;
    if (harvestAction?.output) {
      Object.entries(harvestAction.output).forEach(([itemName, amount]) => {
        const currentAmount = location.inventory[itemName] || 0;
        updates.push({
          type: 'set',
          path: `instance.locations.${activeLocation}.inventory.${itemName}`,
          value: currentAmount + amount
        });
      });
    }

    updates.push({
      type: 'unset',
      path: `instance.locations.${activeLocation}.elementInstances.${targetInstanceId}`
    });

    const lootList = harvestAction?.output
      ? Object.entries(harvestAction.output).map(([item, amt]) => `${amt} ${item}`).join(', ')
      : 'nothing';

    return {
      success: true,
      storyText: `${activeCharacter} defeats the ${targetElement}! Collected: ${lootList}.`,
      updates
    };
  } else {
    // Animal survives, update health
    updates.push({
      type: 'set',
      path: `instance.locations.${activeLocation}.elementInstances.${targetInstanceId}.health`,
      value: newHealth
    });

    return {
      success: true,
      storyText: `${activeCharacter} attacks the ${targetElement} for ${damage} damage. It has ${newHealth} health remaining.`,
      updates
    };
  }
}

export function calculateTimeUpdate(clock, hoursToAdd) {
  if (!hoursToAdd || hoursToAdd === 0) return null;

  let [hour, minute, period] = clock.time;
  let day = clock.day;

  // Convert to 24-hour for easier calculation
  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  // Add hours
  const totalMinutes = (hour * 60) + minute + (hoursToAdd * 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);

  let newHour = Math.floor(remainingMinutes / 60);
  const newMinute = remainingMinutes % 60;

  // Convert back to 12-hour
  let newPeriod = newHour >= 12 ? 'pm' : 'am';
  if (newHour > 12) newHour -= 12;
  if (newHour === 0) newHour = 12;

  const newDay = day + days;

  return {
    type: 'set',
    path: 'instance.clock',
    value: {
      day: newDay,
      time: [newHour, newMinute, newPeriod]
    }
  };
}

/**
 * Validates inventory has sufficient materials for an action
 * @param {Object} game - Current game state
 * @param {string} actionType - The action type (e.g., "Craft", "Build")
 * @param {Object} action - Action details with actionData containing cost
 * @returns {Object} - { valid: boolean, message: string }
 */
export function validateInventory(game, actionType, action) {
  const { activeLocation } = game.instance;
  const location = game.instance.locations[activeLocation];

  // Get the cost from actionData (which comes from helpers.js)
  const actionData = action.actionData;
  if (!actionData?.cost) {
    return { valid: true }; // No cost, valid
  }

  // Check each required material
  const missingItems = [];
  Object.entries(actionData.cost).forEach(([itemName, requiredAmount]) => {
    const currentAmount = location.inventory[itemName] || 0;
    if (currentAmount < requiredAmount) {
      missingItems.push(`${itemName} (have ${currentAmount}, need ${requiredAmount})`);
    }
  });

  if (missingItems.length > 0) {
    return {
      valid: false,
      message: `Insufficient materials: ${missingItems.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Checks if an action can be handled client-side
 * Returns true for Harvest to enable instant client-side updates
 */
export function canHandleClientSide(actionType) {
  return actionType === 'Harvest' || actionType === 'Forage';
}
