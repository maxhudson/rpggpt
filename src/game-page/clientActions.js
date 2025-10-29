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

    case 'Eat':
      return handleEat(game, action, location, activeLocation, activeCharacter);

    case 'Sleep':
      return handleSleep(game, action, location, activeLocation, activeCharacter);

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

  // Calculate output (output can be either structured {Items: {}, Stats: {}} or legacy flat object)
  const output = {};
  const outputItems = harvestAction.output?.Items || harvestAction.output || {};

  Object.entries(outputItems).forEach(([itemName, amount]) => {
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

  // Update time (if specified) and apply energy depletion
  let hoursElapsed = 0;
  if (harvestAction.timeInHours) {
    hoursElapsed = harvestAction.timeInHours;
    const timeUpdate = calculateTimeUpdate(game.instance.clock, hoursElapsed);
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
    hoursElapsed = minutes / 60;
    const timeUpdate = calculateTimeUpdate(game.instance.clock, hoursElapsed);
    if (timeUpdate) {
      updates.push(timeUpdate);
    }
  }

  // Apply energy depletion (1 per hour)
  if (hoursElapsed > 0) {
    const energyDepletionUpdates = applyEnergyDepletion(game, hoursElapsed, activeCharacter, false);
    updates.push(...energyDepletionUpdates);
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
      const outputItems = harvestAction.output?.Items || harvestAction.output || {};
      Object.entries(outputItems).forEach(([itemName, amount]) => {
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

    const outputItems = harvestAction?.output?.Items || harvestAction?.output || {};
    const lootList = Object.keys(outputItems).length > 0
      ? Object.entries(outputItems).map(([item, amt]) => `${amt} ${item}`).join(', ')
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
    },
    hoursElapsed: Math.floor(hoursToAdd) // Track how many hours passed for energy depletion
  };
}

/**
 * Applies energy depletion based on time passed
 * Loses 1 energy per hour when not sleeping
 * @param {Object} game - Current game state
 * @param {number} hoursElapsed - Number of hours that passed
 * @param {string} activeCharacter - Active character name
 * @param {boolean} isSleeping - Whether the character is sleeping
 * @returns {Array} - Array of update objects for energy depletion
 */
export function applyEnergyDepletion(game, hoursElapsed, activeCharacter, isSleeping = false) {
  if (isSleeping || hoursElapsed <= 0) return [];

  const characterData = game.instance.characters[activeCharacter];
  const currentEnergy = characterData?.stats?.Energy || 0;

  // Lose 1 energy per hour
  const energyLoss = Math.floor(hoursElapsed);
  const newEnergy = Math.max(0, currentEnergy - energyLoss);

  return [{
    type: 'set',
    path: `instance.characters.${activeCharacter}.stats.Energy`,
    value: newEnergy
  }];
}

function handleEat(game, action, location, activeLocation, activeCharacter) {
  const { targetElement } = action;
  const elementDef = game.elements?.Items?.[targetElement];
  const eatAction = elementDef?.actions?.Eat;

  if (!eatAction) {
    return {
      success: false,
      message: `Cannot eat ${targetElement}`,
      updates: []
    };
  }

  const characterData = game.instance.characters[activeCharacter];

  // Check daily eating limit (15 energy worth per day)
  const energyFromEatingSinceLastSlept = characterData?.energyFromEatingSinceLastSlept || 0;
  const energyGain = eatAction.output?.Stats?.Energy || 0;

  if (energyFromEatingSinceLastSlept + energyGain > 15) {
    return {
      success: false,
      message: `You can't eat any more today (${energyFromEatingSinceLastSlept}/15 energy consumed)`,
      updates: []
    };
  }

  // Check if item is in inventory (from cost.Items)
  const itemCost = eatAction.cost?.Items || {};
  for (const [itemName, amount] of Object.entries(itemCost)) {
    const currentAmount = location.inventory[itemName] || 0;
    if (currentAmount < amount) {
      return {
        success: false,
        message: `You need ${itemName} to eat`,
        updates: []
      };
    }
  }

  const updates = [];

  // Consume items from inventory (cost.Items)
  Object.entries(itemCost).forEach(([itemName, amount]) => {
    const currentAmount = location.inventory[itemName] || 0;
    updates.push({
      type: 'set',
      path: `instance.locations.${activeLocation}.inventory.${itemName}`,
      value: currentAmount - amount
    });
  });

  // Add to character stats (output.Stats)
  const statsOutput = eatAction.output?.Stats || {};
  Object.entries(statsOutput).forEach(([statName, amount]) => {
    const currentStatValue = characterData?.stats?.[statName] || 0;
    const statDef = game.elements?.Stats?.[statName];
    const maxAmount = statDef?.maxAmount || 10;

    // Cap at max
    const newValue = Math.min(currentStatValue + amount, maxAmount);

    updates.push({
      type: 'set',
      path: `instance.characters.${activeCharacter}.stats.${statName}`,
      value: newValue
    });
  });

  // Update energyFromEatingSinceLastSlept
  updates.push({
    type: 'set',
    path: `instance.characters.${activeCharacter}.energyFromEatingSinceLastSlept`,
    value: energyFromEatingSinceLastSlept + energyGain
  });

  const storyText = `You ate ${targetElement} and gained ${energyGain} energy. (${energyFromEatingSinceLastSlept + energyGain}/15 today)`;

  return {
    success: true,
    storyText,
    updates
  };
}

function handleSleep(game, action, location, activeLocation, activeCharacter) {
  const { targetElement, targetInstanceId } = action;
  const instance = location.elementInstances[targetInstanceId];

  if (!instance) {
    return {
      success: false,
      message: `${targetElement} not found`,
      updates: []
    };
  }

  const elementDef = game.elements?.Buildings?.[targetElement];
  const sleepAction = elementDef?.actions?.Sleep;

  if (!sleepAction) {
    return {
      success: false,
      message: `Cannot sleep in ${targetElement}`,
      updates: []
    };
  }

  const characterData = game.instance.characters[activeCharacter];
  const updates = [];

  // Restore stats (output.Stats)
  const statsOutput = sleepAction.output?.Stats || {};
  Object.entries(statsOutput).forEach(([statName, amount]) => {
    const currentStatValue = characterData?.stats?.[statName] || 0;
    const statDef = game.elements?.Stats?.[statName];
    const maxAmount = statDef?.maxAmount || 10;

    // Add the amount to current stat (don't just set it)
    const newValue = Math.min(currentStatValue + amount, maxAmount);

    updates.push({
      type: 'set',
      path: `instance.characters.${activeCharacter}.stats.${statName}`,
      value: newValue
    });
  });

  // Reset daily eating limit
  updates.push({
    type: 'set',
    path: `instance.characters.${activeCharacter}.energyFromEatingSinceLastSlept`,
    value: 0
  });

  // Update lastDaySlept
  updates.push({
    type: 'set',
    path: `instance.characters.${activeCharacter}.lastDaySlept`,
    value: game.instance.clock.day
  });

  // Add time progression
  const timeInHours = sleepAction.timeInHours || 8;
  const timeUpdate = calculateTimeUpdate(game.instance.clock, timeInHours);
  if (timeUpdate) {
    updates.push(timeUpdate);
  }

  const storyText = `You slept for ${timeInHours} hours and feel refreshed. You can eat again.`;

  return {
    success: true,
    storyText,
    updates
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
  const { activeLocation, activeCharacter } = game.instance;
  const location = game.instance.locations[activeLocation];
  const characterData = game.instance.characters[activeCharacter];

  // Get the cost from actionData (which comes from helpers.js)
  const actionData = action.actionData;
  if (!actionData?.cost) {
    return { valid: true }; // No cost, valid
  }

  const missingItems = [];
  const missingStats = [];

  // Handle structured cost format {Items: {}, Stats: {}} or legacy flat format
  const itemCosts = actionData.cost?.Items || (actionData.cost?.Stats ? {} : actionData.cost);
  const statCosts = actionData.cost?.Stats || {};

  // Check each required item
  Object.entries(itemCosts).forEach(([itemName, requiredAmount]) => {
    const currentAmount = location.inventory[itemName] || 0;
    if (currentAmount < requiredAmount) {
      missingItems.push(`${itemName} (have ${currentAmount}, need ${requiredAmount})`);
    }
  });

  // Check each required stat (e.g., Energy)
  Object.entries(statCosts).forEach(([statName, requiredAmount]) => {
    const currentAmount = characterData?.stats?.[statName] || 0;
    if (currentAmount < requiredAmount) {
      missingStats.push(`${statName} (have ${currentAmount}, need ${requiredAmount})`);
    }
  });

  const allMissing = [...missingItems, ...missingStats];
  if (allMissing.length > 0) {
    return {
      valid: false,
      message: `Insufficient resources: ${allMissing.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Checks if an action can be handled client-side
 * Returns true for Harvest, Forage, Eat, Sleep to enable instant client-side updates
 */
export function canHandleClientSide(actionType) {
  return actionType === 'Harvest' || actionType === 'Forage' || actionType === 'Eat' || actionType === 'Sleep';
}

/**
 * Checks if game is over (Energy or Health reached 0)
 * @param {Object} game - Current game state
 * @returns {Object} - { isGameOver: boolean, reason: string }
 */
export function checkGameOver(game) {
  const { activeCharacter } = game.instance;
  const characterData = game.instance.characters[activeCharacter];

  const energy = characterData?.stats?.Energy || 0;
  const health = characterData?.stats?.Health || 0;

  if (energy <= 0) {
    return {
      isGameOver: true,
      reason: 'You ran out of energy and collapsed. Game Over!'
    };
  }

  if (health <= 0) {
    return {
      isGameOver: true,
      reason: 'Your health reached zero. Game Over!'
    };
  }

  return { isGameOver: false };
}
