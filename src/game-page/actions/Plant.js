export function handlePlant(game, plantName) {
  const { activeCharacter, activeLocation } = game.instance;
  const characterData = game.instance.characters?.[activeCharacter];
  const location = game.instance.locations?.[activeLocation];

  if (!characterData) {
    return { success: false, message: 'Character not found', updates: [] };
  }

  if (!plantName) {
    return { success: false, message: 'No plant selected', updates: [] };
  }

  const plantDef = game.elements?.Plants?.[plantName];
  if (!plantDef) {
    return { success: false, message: 'Plant not found', updates: [] };
  }

  // Check if costs are disabled (debug mode)
  const disableCosts = typeof window !== 'undefined' && localStorage.getItem('debug-disable-costs') === 'true';

  const updates = [];
  const inventory = game.useLocationBasedInventory
    ? location?.inventory || {}
    : game.instance.inventory || {};
  console.log(inventory)
  const charX = characterData.x || 0;
  const charY = characterData.y || 0;

  const costs = plantDef.actions?.Plant?.costs || {};

  // Check if can afford
  if (!disableCosts) {
    if (costs.Items) {
      for (const [itemName, amount] of Object.entries(costs.Items)) {
        const available = inventory[itemName] || 0;
        if (available < amount) {
          return { success: false, message: `Not enough ${itemName}`, updates: [] };
        }
      }
    }

    if (costs.Stats) {
      for (const [statName, amount] of Object.entries(costs.Stats)) {
        const available = characterData.stats?.[statName] || 0;
        if (available < amount) {
          return { success: false, message: `Not enough ${statName}`, updates: [] };
        }
      }
    }
  }

  // Deduct costs
  if (!disableCosts) {
    if (costs.Items) {
      for (const [itemName, amount] of Object.entries(costs.Items)) {
        const inventoryPath = game.useLocationBasedInventory
          ? `instance.locations.${activeLocation}.inventory.${itemName}`
          : `instance.inventory.${itemName}`;
        const currentAmount = inventory[itemName] || 0;
        updates.push({
          type: 'set',
          path: inventoryPath,
          value: currentAmount - amount
        });
      }
    }

    if (costs.Stats) {
      for (const [statName, amount] of Object.entries(costs.Stats)) {
        const currentStat = characterData.stats?.[statName] || 0;
        updates.push({
          type: 'set',
          path: `instance.characters.${activeCharacter}.stats.${statName}`,
          value: currentStat - amount
        });
      }
    }
  }

  // Plant the item
  const instanceId = Date.now() + Math.random().toString(36).substr(2, 9);

  updates.push({
    type: 'set',
    path: `instance.locations.${activeLocation}.elementInstances.${instanceId}`,
    value: {
      x: charX,
      y: charY,
      collection: 'Plants',
      element: plantName,
      plantedAt: Date.now()
    }
  });

  return {
    success: true,
    updates,
    storyText: `You plant ${plantName}.`
  };
}
