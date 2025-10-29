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

// Find the nearest object to the character from a location
// Returns { instanceId, instance, distance } or null if no objects in range
export const findNearestObject = (game, maxDistance = INTERACTION_DISTANCE) => {
  const characterPosition = getCharacterPosition(game, game.instance.activeCharacter);
  if (!characterPosition) return null;

  const { x: charX, y: charY } = characterPosition;
  const location = game.instance.locations[game.instance.activeLocation];

  let nearestObject = null;
  let minDistance = Infinity;

  Object.entries(location?.elementInstances || {}).forEach(([instanceId, instance]) => {
    // Calculate distance to the nearest edge of the object
    const distance = calculateDistanceToObject(charX, charY, instance, sprites);

    if (distance <= maxDistance && distance < minDistance) {
      minDistance = distance;
      nearestObject = {
        instanceId,
        instance,
        distance
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

  // Add always-available actions (Build, Plant)
  // These show up even when not near specific elements

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


  // Process only the nearest object for proximity-based actions
  if (nearestObject) {
    const { instanceId, instance, distance } = nearestObject;

    // Find the element definition using collection and element
    const elementCategory = game.elements[instance.collection];
    if (elementCategory) {
      const elementDef = elementCategory[instance.element];
      if (elementDef) {
        // Get actions for this element
        const actions = elementDef.actions || {};

        Object.entries(actions).forEach(([actionName, actionData]) => {
          // Check if this action is enabled in the game
          const enabledAction = game.enabledActions?.[actionName];
          if (!enabledAction) return;

          // Skip Harvest action on animals with health > 0
          if (actionName === 'Harvest' && instance.collection === 'Animals' && instance.health && instance.health > 0) {
            return;
          }

          if (actionName === 'Build' || actionName === 'Plant') return;

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
