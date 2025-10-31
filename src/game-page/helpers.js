import sprites from '../sprites';

export const formatCurrency = (amount) => {
  const isNegative = amount < 0;
  const formattedAmount = Math.abs(amount).toLocaleString();

  return `${isNegative ? '-' : ''}$${formattedAmount}`;
};

export const formatTime = (time) => {
  if (!time) return '';
  const [hour, minute, period] = time;
  return `${hour}:${minute.toString().padStart(2, '0')}${period}`;
};

// Distance calculation
export const INTERACTION_DISTANCE = 0.25; // Distance in grid cells for interaction
export const Y_SCALE = 0.75; // 45-degree camera angle for isometric view

// Calculate Euclidean distance between two points
export const calculateDistance = (x1, y1, x2, y2) => {
  return Math.sqrt(
    Math.pow(x2 - x1, 2) +
    Math.pow(y2 - y1, 2)
  );
};

// Calculate the distance from a point to the nearest edge of an object's bounding box
export const calculateDistanceToObject = (charX, charY, instance, sprites) => {
  const spriteConfig = sprites?.[instance.element] || {};
  const width = spriteConfig.width || 1;

  // Object bounding box in grid coordinates
  const objLeft = instance.x;
  const objRight = instance.x + width;
  const objTop = instance.y;
  const objBottom = instance.y + width;

  // Find the closest point on the objeact's bounding box to the character
  const closestX = Math.max(objLeft, Math.min(charX, objRight));
  const closestY = Math.max(objTop, Math.min(charY, objBottom));

  // Calculate distance from character to the closest point on the object
  return calculateDistance(charX, charY, closestX, closestY);
};

// Check if an object is within interaction distance of the character
export const isNearby = (objectX, objectY, characterX, characterY, maxDistance = INTERACTION_DISTANCE) => {
  return calculateDistance(objectX, objectY, characterX, characterY) <= maxDistance;
};

// Get character position from game and character name
export const getCharacterPosition = (game, characterName) => {
  const characterData = game?.instance?.characters?.[characterName];
  if (!characterData) return null;
  return { x: characterData.x, y: characterData.y };
};

// Find the nearest object or character to the active character
// Returns { instanceId, instance, distance, isCharacter } or null if nothing in range
export const findNearestObject = (game, maxDistance = INTERACTION_DISTANCE) => {
  const characterPosition = getCharacterPosition(game, game.instance.activeCharacter);
  if (!characterPosition) return null;

  const { x: charX, y: charY } = characterPosition;
  const location = game.instance.locations[game.instance.activeLocation];
  const { activeCharacter, activeLocation, characters } = game.instance;

  let nearestObject = null;
  let minDistance = Infinity;

  // Check element instances (objects, buildings, plants, animals)
  Object.entries(location?.elementInstances || {}).forEach(([instanceId, instance]) => {
    // Calculate distance to the nearest edge of the object
    const distance = calculateDistanceToObject(charX, charY, instance, sprites);

    if (distance <= maxDistance && distance < minDistance) {
      minDistance = distance;
      nearestObject = {
        instanceId,
        instance,
        distance,
        isCharacter: false
      };
    }
  });

  // Check other characters in the same location
  Object.entries(characters || {}).forEach(([charName, charData]) => {
    // Skip the active character
    if (charName === activeCharacter || charData.location !== activeLocation) return;

    // Calculate distance to character
    const dx = charData.x - charX;
    const dy = charData.y - charY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= maxDistance + 0.6 && distance < minDistance) {
      minDistance = distance;
      nearestObject = {
        instanceId: charName,
        instance: {
          element: charName,
          collection: "Characters",
          x: charData.x,
          y: charData.y
        },
        distance,
        isCharacter: true
      };
    }
  });

  return nearestObject;
};

// Calculate available actions based on game state
// Returns actions grouped by action type
export const calculateAvailableActions = (game) => {
  if (!game || !game.instance || !game.elements) return {};

  const { activeLocation, locations } = game.instance;
  const location = locations?.[activeLocation];

  if (!location || !location.elementInstances) return {};

  const alwaysAvailable = {}; // Actions without proximity requirements
  const proximityBased = {}; // Actions that require being near elements

  // Find the nearest object within interaction distance
  const nearestObject = findNearestObject(game);

  // Add always-available actions (Build, Plant, Investigate, Travel)
  // These show up even when not near specific elements

  // Investigate - always available when no nearby object
  if (game.enabledActions?.Investigate && !nearestObject) {
    alwaysAvailable.Investigate = [{
      targetElement: null,
      targetCollection: null,
      actionData: {}
    }];
  }

  // Travel - show all available locations
  if (game.enabledActions?.Travel && !nearestObject) {
    const locations = game.elements.Locations || {};
    const currentLocation = game.instance.activeLocation;
    const travelOptions = Object.entries(locations)
      .filter(([locationName]) => locationName !== currentLocation)
      .map(([locationName, def]) => ({
        targetElement: locationName,
        targetCollection: "Locations",
        actionData: def
      }));

    if (travelOptions.length > 0) {
      alwaysAvailable.Travel = travelOptions;
    }
  }

  // Rent - show current location if it has rental cost
  if (game.enabledActions?.Rent && !nearestObject) {
    const currentLocation = game.instance.activeLocation;
    const locationDef = game.elements.Locations?.[currentLocation];
    if (locationDef?.rentalCost && locationDef.rentalCost > 0) {
      alwaysAvailable.Rent = [{
        targetElement: currentLocation,
        targetCollection: "Locations",
        actionData: { cost: { money: locationDef.rentalCost } }
      }];
    }
  }

  // Hum, Sit, Hunt - custom game-specific actions (always available when no nearby object)
  ['Hum', 'Sit', 'Hunt', 'Cast'].forEach(actionName => {
    if (game.enabledActions?.[actionName] && !nearestObject) {
      alwaysAvailable[actionName] = [{
        targetElement: null,
        targetCollection: null,
        actionData: {}
      }];
    }
  });

  // Build - only show when there's NO nearby object (need empty space to build)
  if (game.enabledActions?.Build && !nearestObject) {
    const buildings = game.elements.Buildings || {};
    const buildOptions = Object.entries(buildings)
      .filter(([, def]) => def.actions?.Build)
      .map(([buildingName, def]) => {
        // Check if building already exists at location
        const existingBuilding = Object.entries(location.elementInstances).find(
          ([, instance]) => instance.collection === "Buildings" && instance.element === buildingName
        );

        return {
          targetElement: buildingName,
          targetCollection: "Buildings",
          actionData: def.actions.Build,
          existingInstanceId: existingBuilding ? existingBuilding[0] : null
        };
      })
      // .filter(option => {
      //   // Only show new buildings (not already built)
      //   return !option.existingInstanceId;
      // });

    if (buildOptions.length > 0) {
      alwaysAvailable.Build = buildOptions;
    }
  }

  // Plant - show all plantable plants
  if (game.enabledActions?.Plant && !nearestObject) {
    const plants = game.elements.Plants || {};
    const plantOptions = Object.entries(plants)
      .filter(([, def]) => def.actions?.Plant)
      .map(([plantName, def]) => ({
        targetElement: plantName,
        targetCollection: "Plants",
        actionData: def.actions.Plant
      }));

    if (plantOptions.length > 0) {
      alwaysAvailable.Plant = plantOptions;
    }
  }

  // Eat - only show when there's NO nearby object (like Build/Plant)
  if (game.enabledActions?.Eat && !nearestObject) {
    const items = game.elements.Items || {};
    const eatOptions = Object.entries(items)
      .filter(([, def]) => def.actions?.Eat)
      .map(([itemName, def]) => ({
        targetElement: itemName,
        targetCollection: "Items",
        actionData: def.actions.Eat
      }));

    if (eatOptions.length > 0) {
      alwaysAvailable.Eat = eatOptions;
    }
  }

  // Process only the nearest object for proximity-based actions
  if (nearestObject) {
    const { instanceId, instance, distance } = nearestObject;

    // Find the element definition using collection and element
    const elementCategory = game.elements[instance.collection];
    console.log(instance)
    if (elementCategory) {
      const elementDef = elementCategory[instance.element];
      if (elementDef) {
        // Get actions for this element
        const actions = elementDef.actions || {};
        console.log('Available actions for', instance.element, actions);
        Object.entries(actions).forEach(([actionName, actionData]) => {
          // Check if this action is enabled in the game
          const enabledAction = game.enabledActions?.[actionName];
          if (!enabledAction) return;

          // Skip Harvest action on animals that are alive (health > 0 or not dead)
          if (actionName === 'Harvest' && instance.collection === 'Animals' && !instance.isDead) {
            return;
          }

          // Skip Harvest action on plants that are not mature yet
          if (actionName === 'Harvest' && instance.collection === 'Plants') {
            const plantDef = game.elements?.Plants?.[instance.element];
            const matureTimeHours = plantDef?.matureTimeHours || 1;
            const plantedAt = instance.plantedAt || 0;
            const now = Date.now();
            const hoursElapsed = (now - plantedAt) / (1000 * 60 * 60);
            if (hoursElapsed < matureTimeHours) {
              return;
            }
          }

          // Skip Attack action on dead animals
          if (actionName === 'Attack' && instance.collection === 'Animals' && instance.isDead) {
            return;
          }

          // Skip Attack action on Characters (no attacking other players)
          if (actionName === 'Attack' && instance.collection === 'Characters') {
            return;
          }

          if (actionName === 'Build') return;

          // Special handling for Plant action - show plantable items as submenu
          if (actionName === 'Plant') {
            // Get all plants that have Plant actions
            const allPlants = game.elements?.Plants || {};
            Object.entries(allPlants).forEach(([plantName, plantDef]) => {
              if (plantDef?.actions?.Plant) {
                const plantAction = plantDef.actions.Plant;
                // Check if player has the required seeds/items to plant
                const costItems = plantAction.costs?.Items || {};
                const hasRequiredItems = true || Object.entries(costItems).every(([itemName, amount]) => {
                  const available = inventory[itemName] || 0;
                  return available >= amount;
                });

                if (hasRequiredItems) {
                  if (!proximityBased.Plant) {
                    proximityBased.Plant = [];
                  }
                  proximityBased.Plant.push({
                    targetElement: plantName,
                    targetCollection: "Plants",
                    targetInstanceId: null,
                    distance: 0, // Plant at player position
                    actionData: plantAction,
                    items: [plantName] // Pass the plant to be planted
                  });
                }
              }
            });
            return; // Don't add the instance itself
          }

          console.log(actionName, instance)
          // Special handling for Attack action on Animals - show weapons as submenu
          if (actionName === 'Attack' && instance.collection === 'Animals') {
            // Find all items with Attack actions
            const allItems = game.elements?.Items || {};
            console.log('Checking items for Attack compatibility with animal:', instance.element, allItems);
            Object.entries(allItems).forEach(([itemName, itemDef]) => {
              if (itemDef?.actions?.Attack) {
                const attackAction = itemDef.actions.Attack;
                // Check if this weapon is compatible with this animal
                const compatibility = attackAction.compatibility?.Animals || [];
                console.log('Animal compatibility:', compatibility, instance.element);
                if (compatibility.length === 0 || compatibility.includes(instance.element)) {
                  if (!proximityBased.Attack) {
                    proximityBased.Attack = [];
                  }
                  proximityBased.Attack.push({
                    targetElement: itemName, // The weapon being used
                    targetCollection: "Items",
                    targetInstanceId: instanceId, // The animal being attacked
                    targetAnimal: instance.element, // Store the animal type
                    distance: distance,
                    actionData: attackAction
                  });
                }
              }
            });
            return; // Skip adding the animal itself
          }

          // Special handling for Craft action on Buildings
          if (actionName === 'Craft' && instance.collection === 'Buildings') {
            // Don't add the building itself - add craftable items instead
            const compatibleItems = actionData.compatibleItems || [];
            compatibleItems.forEach(itemName => {
              const itemDef = game.elements.Items?.[itemName];
              if (itemDef?.actions?.Craft) {
                if (!proximityBased.Craft) {
                  proximityBased.Craft = [];
                }
                proximityBased.Craft.push({
                  targetElement: itemName,
                  targetCollection: "Items",
                  targetInstanceId: null,
                  distance: distance,
                  actionData: itemDef.actions.Craft
                });
              }
            });
            return; // Skip adding the building itself
          }

          // Special handling for Buy action on Buildings
          if (actionName === 'Buy' && instance.collection === 'Buildings') {
            const prices = actionData.prices || {};
            Object.entries(prices).forEach(([itemName, price]) => {
              if (!proximityBased.Buy) {
                proximityBased.Buy = [];
              }
              proximityBased.Buy.push({
                targetElement: itemName,
                targetCollection: "Items",
                targetInstanceId: instanceId,
                distance: distance,
                actionData: { cost: { money: price } }
              });
            });
            return; // Skip adding the building itself
          }

          // Special handling for Sell action on Buildings
          if (actionName === 'Sell' && instance.collection === 'Buildings') {
            const prices = actionData.prices || {};
            Object.entries(prices).forEach(([itemName, price]) => {
              if (!proximityBased.Sell) {
                proximityBased.Sell = [];
              }
              proximityBased.Sell.push({
                targetElement: itemName,
                targetCollection: "Items",
                targetInstanceId: instanceId,
                distance: distance,
                actionData: { value: price }
              });
            });
            return; // Skip adding the building itself
          }

          // Special handling for Upgrade action - check if can be upgraded
          if (actionName === 'Upgrade') {
            const currentLevel = instance.level || 1;
            const maxLevel = elementDef.maxLevel || 1;

            // Only show upgrade if not at max level
            if (currentLevel < maxLevel) {
              if (!proximityBased.Upgrade) {
                proximityBased.Upgrade = [];
              }
              proximityBased.Upgrade.push({
                targetElement: instance.element,
                targetCollection: instance.collection,
                targetInstanceId: instanceId,
                distance: distance,
                actionData: actionData,
                currentLevel: currentLevel,
                maxLevel: maxLevel
              });
            }
            return; // Skip adding to regular actions
          }

          // Initialize action type array if needed
          if (!proximityBased[actionName]) {
            proximityBased[actionName] = [];
          }

          // Add to available actions
          proximityBased[actionName].push({
            targetElement: instance.element,
            targetCollection: instance.collection,
            targetInstanceId: instanceId,
            distance: distance,
            actionData: actionData
          });
        });
      }
    }
  }

  // Merge always-available actions first, then proximity-based actions
  return { ...alwaysAvailable, ...proximityBased };
};
