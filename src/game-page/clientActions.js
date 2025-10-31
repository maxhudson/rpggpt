// Client-side action handlers for deterministic actions that don't require AI
import { handleSleep as handleSleepAction } from './actions/Sleep';
import { handlePlant as handlePlantAction } from './actions/Plant';
import { handleBuild as handleBuildAction } from './actions/Build';

/**
 * Gets the inventory object based on game's inventory mode
 * @param {Object} game - Current game state
 * @returns {Object} - The inventory object
 */
function getInventory(game) {
  if (game.useLocationBasedInventory) {
    const { activeLocation } = game.instance;
    return game.instance.locations[activeLocation]?.inventory || {};
  }
  return game.instance.inventory || {};
}

/**
 * Gets the inventory path for updates based on game's inventory mode
 * @param {Object} game - Current game state
 * @returns {string} - The inventory path
 */
function getInventoryPath(game) {
  if (game.useLocationBasedInventory) {
    const { activeLocation } = game.instance;
    return `instance.locations.${activeLocation}.inventory`;
  }
  return 'instance.inventory';
}

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

  let result;
  switch (actionType) {
    case 'Harvest':
    case 'Forage':
      result = handleHarvest(game, action, location, activeLocation, activeCharacter, actionType);
      break;

    case 'Attack':
      result = handleAttack(game, action, location, activeLocation, activeCharacter);
      break;

    case 'Eat':
      result = handleEat(game, action, location, activeLocation, activeCharacter);
      break;

    case 'Sleep':
      result = handleSleepAction(game);
      break;

    case 'Craft':
      result = handleCraft(game, action, location, activeLocation, activeCharacter);
      break;

    case 'Plant':
      console.log('[handleClientAction Plant]', { action, targetElement: action.targetElement });
      result = handlePlantAction(game, action.targetElement);
      break;

    case 'Build':
      result = handleBuildAction(game, action.targetElement, action.targetInstanceId);
      break;

    default:
      return null; // Not a client-side action
  }

  return result;
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
  const inventory = getInventory(game);
  if (harvestAction.requiredItem) {
    const hasItem = inventory[harvestAction.requiredItem] > 0;
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
  const inventoryPath = getInventoryPath(game);

  // Add items to inventory
  Object.entries(output).forEach(([itemName, amount]) => {
    if (amount > 0) {
      const currentAmount = inventory[itemName] || 0;
      updates.push({
        type: 'set',
        path: `${inventoryPath}.${itemName}`,
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
  const { targetInstanceId, targetElement, targetAnimal } = action;
  const instance = location.elementInstances[targetInstanceId];

  if (!instance) {
    return {
      success: false,
      message: `Animal not found`,
      updates: []
    };
  }

  // targetElement is now the weapon, instance.element is the animal
  const animalElement = targetAnimal || instance.element;
  const animalDef = game.elements.Animals?.[animalElement];
  if (!animalDef) {
    return {
      success: false,
      message: `Cannot attack ${animalElement}`,
      updates: []
    };
  }

  // targetElement is the weapon being used
  const weaponName = targetElement || 'fists';
  const characterInventory = location.inventory;

  // Check if player has the weapon (unless it's fists)
  if (weaponName !== 'fists' && (!characterInventory[weaponName] || characterInventory[weaponName] <= 0)) {
    return {
      success: false,
      message: `You don't have a ${weaponName}`,
      updates: []
    };
  }

  // Get weapon damage
  let weaponDamage = [1, 3]; // Base unarmed damage
  if (weaponName !== 'fists') {
    const weaponDef = game.elements?.Items?.[weaponName];
    const attackAction = weaponDef?.actions?.Attack;
    if (attackAction?.damage) {
      weaponDamage = attackAction.damage.base;
    }
  }

  const [minDmg, maxDmg] = weaponDamage;
  const damage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
  const newHealth = Math.max(0, (instance.health || animalDef.stats.base.Health[0]) - damage);

  const updates = [];
  const isDead = newHealth <= 0;

  // Mark animal as attacked (for quest tracking)
  updates.push({
    type: 'set',
    path: `instance.locations.${activeLocation}.elementInstances.${targetInstanceId}.wasAttacked`,
    value: true
  });

  if (isDead) {
    // Animal killed - set health to 0 and mark as dead (don't remove)
    updates.push({
      type: 'set',
      path: `instance.locations.${activeLocation}.elementInstances.${targetInstanceId}.health`,
      value: 0
    });
    updates.push({
      type: 'set',
      path: `instance.locations.${activeLocation}.elementInstances.${targetInstanceId}.isDead`,
      value: true
    });

    return {
      success: true,
      storyText: `${activeCharacter} defeats the ${animalElement} with ${weaponName}!`,
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
      storyText: `${activeCharacter} attacks the ${animalElement} with ${weaponName} for ${damage} damage. It has ${newHealth} health remaining.`,
      updates
    };
  }
}

function handleCraft(game, action, location, activeLocation, activeCharacter) {
  const { targetElement } = action;
  const itemDef = game.elements?.Items?.[targetElement];
  const craftAction = itemDef?.actions?.Craft;

  if (!craftAction) {
    return {
      success: false,
      message: `Cannot craft ${targetElement}`,
      updates: []
    };
  }

  const characterData = game.instance.characters[activeCharacter];
  const inventory = getInventory(game);
  const inventoryPath = getInventoryPath(game);

  // Check if costs are disabled (debug mode)
  const disableCosts = typeof window !== 'undefined' && localStorage.getItem('debug-disable-costs') === 'true';

  // Check costs (Items and Stats)
  const costItems = craftAction.costs?.Items || {};
  const costStats = craftAction.costs?.Stats || {};

  if (!disableCosts) {
    // Validate Items
    for (const [itemName, amount] of Object.entries(costItems)) {
      const available = inventory[itemName] || 0;
      if (available < amount) {
        return {
          success: false,
          message: `Not enough ${itemName} (have ${available}, need ${amount})`,
          updates: []
        };
      }
    }

    // Validate Stats (like Energy)
    for (const [statName, amount] of Object.entries(costStats)) {
      const available = characterData.stats[statName] || 0;
      if (available < amount) {
        return {
          success: false,
          message: `Not enough ${statName} (have ${available}, need ${amount})`,
          updates: []
        };
      }
    }
  }

  const updates = [];

  if (!disableCosts) {
    // Deduct Items from inventory
    Object.entries(costItems).forEach(([itemName, amount]) => {
      const currentAmount = inventory[itemName] || 0;
      updates.push({
        type: 'set',
        path: `${inventoryPath}.${itemName}`,
        value: currentAmount - amount
      });
    });

    // Deduct Stats from character
    Object.entries(costStats).forEach(([statName, amount]) => {
      const currentAmount = characterData.stats[statName] || 0;
      updates.push({
        type: 'set',
        path: `instance.characters.${activeCharacter}.stats.${statName}`,
        value: currentAmount - amount
      });
    });
  }

  // NOTE: Output items are NOT added here when using minigame (requiredScore exists)
  // They will be added when minigame completes in GamePage.js onMinigameComplete

  return {
    success: true,
    updates
  };
}

export function completeMinigameAction(game, actionType, targetElement, instanceId) {
  const { activeLocation } = game.instance;
  const updates = [];

  // Add crafted item to inventory for Craft actions
  if (actionType === 'Craft') {
    const inventoryPath = game.useLocationBasedInventory
      ? `instance.locations.${activeLocation}.inventory`
      : 'instance.inventory';

    const inventory = game.useLocationBasedInventory
      ? game.instance.locations[activeLocation]?.inventory || {}
      : game.instance.inventory || {};

    const currentAmount = inventory[targetElement] || 0;
    updates.push({
      type: 'set',
      path: `${inventoryPath}.${targetElement}`,
      value: currentAmount + 1
    });
  }

  // Generate message
  let storyText;
  if (actionType === 'Craft') {
    storyText = `You crafted ${targetElement}.`;
  } else if (actionType === 'Upgrade') {
    storyText = `You upgraded the ${targetElement}.`;
  } else {
    storyText = `You built a ${targetElement}.`;
  }

  return {
    success: true,
    updates,
    storyText
  };
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
 * Only applies if Energy stat is defined in game.elements.Stats
 * @param {Object} game - Current game state
 * @param {number} hoursElapsed - Number of hours that passed
 * @param {string} activeCharacter - Active character name
 * @param {boolean} isSleeping - Whether the character is sleeping
 * @returns {Array} - Array of update objects for energy depletion
 */
export function applyEnergyDepletion(game, hoursElapsed, activeCharacter, isSleeping = false) {
  if (isSleeping || hoursElapsed <= 0) return [];

  // Only apply energy depletion if Energy stat is defined in the game
  const hasEnergyStat = game.elements?.Stats?.Energy;
  if (!hasEnergyStat) return [];

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
  const inventory = getInventory(game);
  const itemCost = eatAction.costs?.Items || {};
  for (const [itemName, amount] of Object.entries(itemCost)) {
    const currentAmount = inventory[itemName] || 0;
    if (currentAmount < amount) {
      return {
        success: false,
        message: `You need ${itemName} to eat`,
        updates: []
      };
    }
  }

  const updates = [];
  const inventoryPath = getInventoryPath(game);

  // Consume items from inventory (cost.Items)
  Object.entries(itemCost).forEach(([itemName, amount]) => {
    const currentAmount = inventory[itemName] || 0;
    updates.push({
      type: 'set',
      path: `${inventoryPath}.${itemName}`,
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
  const missingMoney = [];

  // Handle structured cost format {Items: {}, Stats: {}, money: X} or legacy flat format
  const itemCosts = actionData.costs?.Items || (actionData.costs?.Stats || actionData.costs?.money ? {} : actionData.cost);
  const statCosts = actionData.costs?.Stats || {};
  const moneyCost = actionData.costs?.money;

  // Get inventory (universal or location-based)
  const inventory = game.useLocationBasedInventory
    ? location?.inventory || {}
    : game.instance?.inventory || {};

  // Check each required item
  Object.entries(itemCosts).forEach(([itemName, requiredAmount]) => {
    const currentAmount = inventory[itemName] || 0;
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

  // Check money cost
  if (moneyCost !== undefined && moneyCost > 0) {
    const currentMoney = game.instance?.money || 0;
    const minMoney = game.minMoney !== undefined ? game.minMoney : 0;
    const affordableAmount = currentMoney - minMoney;

    if (affordableAmount < moneyCost) {
      missingMoney.push(`Money (have $${currentMoney.toLocaleString()}, need $${moneyCost.toLocaleString()}, min balance: $${minMoney.toLocaleString()})`);
    }
  }

  const allMissing = [...missingItems, ...missingStats, ...missingMoney];
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
 * Returns true for Harvest, Forage, Eat, Sleep, Attack, Craft to enable instant client-side updates
 */
export function canHandleClientSide(actionType) {
  return ['Harvest', 'Forage', 'Eat', 'Sleep', 'Attack', 'Craft', 'Plant', 'Build'].includes(actionType);
}

/**
 * Checks if game is over (Energy or Health reached 0)
 * Only checks stats that are defined in game.elements.Stats
 * @param {Object} game - Current game state
 * @returns {Object} - { isGameOver: boolean, reason: string }
 */
export function checkGameOver(game) {
  const { activeCharacter } = game.instance;
  const characterData = game.instance.characters[activeCharacter];

  // Only check Energy if it's defined in the game
  const hasEnergyStat = game.elements?.Stats?.Energy;
  if (hasEnergyStat) {
    const energy = characterData?.stats?.Energy || 0;
    if (energy <= 0) {
      return {
        isGameOver: true,
        reason: 'You ran out of energy and collapsed. Game Over!'
      };
    }
  }

  // Only check Health if it's defined in the game
  const hasHealthStat = game.elements?.Stats?.Health;
  if (hasHealthStat) {
    const health = characterData?.stats?.Health || 0;
    if (health <= 0) {
      return {
        isGameOver: true,
        reason: 'Your health reached zero. Game Over!'
      };
    }
  }

  return { isGameOver: false };
}
