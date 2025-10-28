export function getPrompt(game, history, userInput) {
  let prompt = `You are a game engine for a ${game.title} simulation game.

Current game state: ${JSON.stringify(game, null, 2)}

User action: ${userInput}

Previous history: ${JSON.stringify(history, null, 2)}

Generate a JSON response with the following structure:
{
  "storyText": "Describe what happened as a result of the action. Be concise but engaging.",
  "updates": [
    {"type": "set", "path": "instance.clock.day", "value": 1},
    {"type": "set", "path": "instance.clock.time", "value": [7, 30, "am"]},
    {"type": "set", "path": "instance.activeLocation", "value": "Forest"},
    {"type": "set", "path": "instance.locations.Forest.characters.Hannes.x", "value": 10},
    {"type": "set", "path": "instance.locations.Forest.characters.Hannes.y", "value": -5},
    {"type": "set", "path": "instance.locations.Forest.inventory.Wood", "value": 15},
    {"type": "set", "path": "instance.locations.Forest.elementInstances.50", "value": {"x": 25, "y": -10, "collection": "Buildings", "element": "Workbench", "level": 1}},
    {"type": "unset", "path": "instance.locations.Forest.elementInstances.11"}
  ],
  "success": true,
  "gameOverMessage": null
}

Action Implementation Rules:

${Object.entries(game.enabledActions || {}).map(([actionName, actionConfig]) => {
  const validCollections = actionConfig.elementTypes || [];

  let implementation = '';
  switch(actionName) {
    case 'Harvest':
      implementation = 'Valid on: Plants, Objects. (1) Check requiredTool in inventory, (2) Set inventory with harvested items, (3) UNSET the harvested elementInstance';
      break;
    case 'Build':
      implementation = 'Valid on: Buildings. User prompt includes "at position (x, y)". (1) VERIFY all materials in inventory meet cost requirements - reject if insufficient, (2) If new: create elementInstance with unique ID at level 1 at x,y coordinates; If upgrade: increase level, (3) Decrease materials from inventory';
      break;
    case 'Craft':
      implementation = 'Valid on: Items. (1) VERIFY all materials in inventory meet cost requirements - reject if insufficient, (2) Increase crafted item in inventory, (3) Decrease materials from inventory';
      break;
    case 'Plant':
      implementation = 'Valid on: Plants. User prompt includes "at position (x, y)". Plant action has costs (e.g., "Tree Seed": 1). (1) VERIFY all costs are met in inventory - reject if not, (2) Create new elementInstance (Plant) at specified x,y coordinates, (3) Decrease costs from inventory';
      break;
    case 'Deconstruct':
      implementation = 'Valid on: Buildings. (1) UNSET the building elementInstance, (2) Return partial materials to inventory based on level';
      break;
    case 'Attack':
      implementation = 'Valid on: Animals. (1) Calculate combat (Health, Attack, Evasiveness), (2) Reduce animal Health or kill, (3) Add loot to inventory if killed';
      break;
    case 'Buy':
      implementation = 'Valid on: Buildings (Trading Post). (1) Check building.actions.Buy.prices for item cost, (2) VERIFY player has sufficient money - reject if not, (3) Add item to inventory, (4) Decrease money';
      break;
    case 'Sell':
      implementation = 'Valid on: Buildings (Trading Post). (1) Check building.actions.Sell.prices for item value, (2) VERIFY item exists in inventory - reject if not, (3) Remove item from inventory, (4) Increase money';
      break;
    case 'Travel':
      implementation = 'Valid on: Locations. (1) Set instance.activeLocation to new location';
      break;
    default:
      implementation = `Valid on: ${validCollections.join(', ')}. Check element definition for specific action rules.`;
  }
  return `- ${actionName}: ${implementation}`;
}).join('\n')}

General update rules:
- Use "set" to create or update any value at a given path
- Use "unset" to remove elements from elementInstances
- Path uses dot notation: "instance.locations.Forest.inventory.Wood"
- Update clock time based on action's timeInHours
- Don't update character position (client handles movement)

CRITICAL INVENTORY RULES:
- NEVER allow negative inventory values
- Before any action that costs materials (Build, Craft, Plant, Buy), check that ALL required items exist in sufficient quantity
- If ANY required material is missing or insufficient, set success: false with a message explaining what's missing
- Example: Building Workbench costs Wood: 5, Stone: 2. If inventory has Wood: 3, Stone: 2, reject with message "Not enough Wood (have 3, need 5)"
- Only decrease inventory AFTER verifying all costs can be paid

Time rules:
- Time format is [hour, minute, period] where period is "am" or "pm"
- Add timeInHours from action to current time
- Advance day when time goes past 11:59pm
- Actions without timeInHours cost 0 time (like Walk)

Response format rules:
- If action cannot be completed, respond with: {"success": false, "message": "Explanation of why it failed", "updates": []}
- If game over condition is met, set gameOverMessage to explanation string
- IMPORTANT: Don't include any other text or markdown formatting - we'll be calling JSON.parse() directly on your response
- Return ONLY the JSON object, no code blocks, no explanations

Story text rules:
- Keep story text concise (2-4 sentences)
- Describe the immediate result of the action
- Include any important state changes (items gained/lost, time passed, etc.)
- Don't repeat information that's already visible in the UI

Quest system:
- instance.activeQuest is a string matching an entry in game.quests array (linear progression)
- When user completes activeQuest (e.g., "Harvest Branch" when user harvests Branch), advance to next quest in array
- Update: {"type": "set", "path": "instance.activeQuest", "value": "nextQuestString"}
- If no more quests, unset activeQuest
- Mention completion in storyText`;

  return prompt;
}
