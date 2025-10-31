/**
 * Quest tracking and completion logic for client-side quest management
 */

/**
 * Check if a quest condition is met
 * @param {Object} condition - Quest condition {action, item/element, quantity}
 * @param {Object} game - Current game state
 * @returns {boolean} - Whether the condition is met
 */
export function checkQuestCondition(condition, game) {
  const { action, item, element, quantity } = condition;
  const { activeLocation, activeCharacter } = game.instance;
  const location = game.instance.locations[activeLocation];
  const characterData = game.instance.characters[activeCharacter];

  switch (action) {
    case 'Harvest':
    case 'Forage':
    case 'Craft': {
      // Check inventory in location
      const inventory = location?.inventory || {};
      const itemAmount = inventory[item] || 0;
      return itemAmount >= quantity;
    }

    case 'Build': {
      // Check if element exists in location
      const elementInstances = location?.elementInstances || {};
      const elementName = element || item;
      const count = Object.values(elementInstances).filter(
        instance => instance.element === elementName
      ).length;
      return count >= quantity;
    }

    case 'Plant': {
      // Check if player-planted elements exist in location
      const elementInstances = location?.elementInstances || {};
      const elementName = element || item;
      const count = Object.values(elementInstances).filter(
        instance => instance.element === elementName && instance.wasPlanted === true
      ).length;
      return count >= quantity;
    }

    case 'Attack': {
      // Check if animal has been attacked (wasAttacked flag)
      const elementInstances = location?.elementInstances || {};
      const elementName = element || item;
      const attackedAnimals = Object.values(elementInstances).filter(
        instance => instance.collection === 'Animals' && instance.element === elementName && instance.wasAttacked === true
      );
      return attackedAnimals.length >= quantity;
    }

    case 'Eat':
    case 'Sleep': {
      // These are tracked via character stats or action counts
      // For now, we can't easily track these client-side
      // Could be extended with action counters in the future
      return false;
    }

    default:
      return false;
  }
}

/**
 * Check if a quest is complete
 * @param {Object|String} quest - Quest object with conditions or string for AI quests
 * @param {Object} game - Current game state
 * @returns {boolean} - Whether the quest is complete
 */
export function isQuestComplete(quest, game) {
  // String quests are AI-tracked, can't determine completion client-side
  if (typeof quest === 'string') {
    return false;
  }

  // Object quests with conditions
  if (quest.conditions && Array.isArray(quest.conditions)) {
    // All conditions must be met
    return quest.conditions.every(condition =>
      checkQuestCondition(condition, game)
    );
  }

  return false;
}

/**
 * Get the next available quest from the quest list
 * @param {Array} quests - List of all quests (objects or strings)
 * @param {Object} game - Current game state
 * @param {String} currentQuestId - ID or string of current active quest
 * @returns {Object|String|null} - Next quest or null if none available
 */
export function getNextQuest(quests, game, currentQuestId) {
  if (!quests || quests.length === 0) return null;

  // Find current quest index
  const currentIndex = quests.findIndex(quest => {
    const id = typeof quest === 'string' ? quest : quest.id;
    return id === currentQuestId;
  });

  // If current quest not found or we're at the end, return null
  if (currentIndex === -1 || currentIndex >= quests.length - 1) {
    return null;
  }

  // Return next quest
  return quests[currentIndex + 1];
}

/**
 * Check all quests and return updates for newly completed ones
 * @param {Object} game - Current game state
 * @returns {Array} - Array of update objects for newly completed quests
 */
export function updateCompletedQuests(game) {
  const quests = game.quests || [];
  const completedQuests = game.instance?.completedQuests || {};
  const updates = [];
  const newlyCompleted = [];

  // Check each quest
  for (const quest of quests) {
    // Skip string quests (AI-tracked)
    if (typeof quest === 'string') continue;

    const questId = quest.id;

    // Skip if already completed
    if (completedQuests[questId]) continue;

    // Check if quest is complete
    if (isQuestComplete(quest, game)) {
      updates.push({
        type: 'set',
        path: `instance.completedQuests.${questId}`,
        value: { completedAt: Date.now() }
      });
      newlyCompleted.push(quest);
    }
  }

  return { updates, newlyCompleted };
}

/**
 * Get all incomplete quests
 * @param {Object} game - Current game state
 * @returns {Array} - Array of incomplete quest objects
 */
export function getIncompleteQuests(game) {
  const quests = game.quests || [];
  const completedQuests = game.instance?.completedQuests || {};

  return quests.filter(quest => {
    if (typeof quest === 'string') return true; // Keep string quests (AI-tracked)
    return !completedQuests[quest.id];
  });
}

/**
 * @deprecated Use updateCompletedQuests instead
 */
export function updateActiveQuest(game) {
  const result = updateCompletedQuests(game);
  if (result.updates.length > 0) {
    // Return first update for backwards compatibility
    return result.updates[0];
  }
  return null;
}
