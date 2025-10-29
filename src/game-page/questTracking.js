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

    case 'Build':
    case 'Plant': {
      // Check if element exists in location
      const elementInstances = location?.elementInstances || {};
      const elementName = element || item;
      const count = Object.values(elementInstances).filter(
        instance => instance.element === elementName
      ).length;
      return count >= quantity;
    }

    case 'Eat':
    case 'Sleep':
    case 'Attack': {
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
 * Update active quest if current one is complete
 * @param {Object} game - Current game state
 * @returns {Object|null} - Update object for activeQuest or null if no change
 */
export function updateActiveQuest(game) {
  const { activeQuest } = game.instance;
  const quests = game.quests || [];

  if (!activeQuest) return null;

  // activeQuest is now stored as ID (string) - either quest.id or the string quest itself
  const currentQuestId = activeQuest;

  // Find current quest in quests array
  const currentQuest = quests.find(quest => {
    const id = typeof quest === 'string' ? quest : quest.id;
    return id === currentQuestId;
  });

  // Check if current quest is complete
  if (currentQuest && isQuestComplete(currentQuest, game)) {
    // Get next quest
    const nextQuest = getNextQuest(quests, game, currentQuestId);

    if (nextQuest) {
      // Return update object - store the ID (quest.id or the string itself)
      return {
        type: 'set',
        path: 'instance.activeQuest',
        value: typeof nextQuest === 'string' ? nextQuest : nextQuest.id
      };
    } else {
      // No more quests - clear activeQuest
      return {
        type: 'set',
        path: 'instance.activeQuest',
        value: null
      };
    }
  }

  return null;
}
