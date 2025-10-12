export function getPrompt(game, history, userInput) {
  let prompt = `You are a game engine for a ${game.title} simulation game.

Current game state: ${JSON.stringify(game, null, 2)}

User action: ${userInput}

Previous history: ${JSON.stringify(history, null, 2)}

Generate a JSON response with the following structure:
{
  "additionalStoryText": "Describe what happened next in the story very concisely.",
  "updatedClock": {
    "day": 1,
    "time": [7, 30, "am"]
  },
  "inventoryUpdates": { //differentials to apply to current inventory (e.g., -2 means decrease by 2, +5 means increase by 5)
    "Lemons": -2,
    "Serving of Ice": -1
  },
  "itemsSold": { //sales happen naturally over time based on specified market behavior by location - they should reduce inventory and increase money correspondingly, in addition to any other side-effect costs/incomes from the selected action
    "Lemonade": {"quantity": 3, "revenue": 15}
  },
  "moneySpent": 10, //money spent on purchases, fees, etc. (optional)
  "grossMoneyMade": 15, //total money earned (optional)
  "netMoneyChange": 5 //(gross income - expenses), can be positive, negative, or zero
  "updatedMoney": <new money amount if changed (optional)>,
  "gameOverMessage": null, //or a string explaining why the game is over if any gameOverConditions are met
  "nextAvailableActions": [
    {
      "type": "Go",
      "options": [
        {"label": "Grocery Store", "costs": {"minutes": 10}},
        {"label": "Park", "costs": {"minutes": 15}}
      ]
    },
    {
      "type": "Craft",
      "options": [
        {"label": "Lemonade", "costs": {"minutes": 0.5, "Lemons": 2, "Ice": 1, "Sugar": 1, "Water": 1, "Cup": 1}}
      ]
    },
    {
      "type": "Investigate", "label": "Search near the window"}
  ]
}

Rules:
- IMPORTANT: Only use "options" array for Go/Travel, Buy, Craft, Build, and Plant actions (actions that loop over collections like locations, items, buildings, seeds). All other actions (Hum, Sleep, Investigate, Talk, Fight, etc.) should be direct actions without options - just {"type": "ActionName", "label": "2-5 words providing context"}.
- Never extend the schema beyond current structure
- Only allow actions that are possible given current inventory, money, time, and location
- Update clock based on time costs
- Write engaging story text for each action
- Don't allow users to craft/build/buy/sell things not in the spec
- Don't allow the user to buy items they can't afford or have not yet unlocked - don't allow user to buy anything that doesn't have a cost defined.
- Don't apply multiple actions at once other than selling - for example, Renting should not automatically happen just because you Travel somewhere.
- Check gameOverConditions each turn. If any condition is met, set gameOverMessage to a descriptive string explaining what happened.
- If action cannot be completed (insufficient inventory, money, etc), respond with:
  {"success": false, "message": "You don't have enough inventory to craft X" or "You can't afford that"}
- Don't create any new items, locations, actions, etc that are not already defined in the game.`;

  // Add Build-specific rule if Build actions exist
  if (game.availableActions?.some(a => a.type === 'Build')) {
    prompt += '\n- Build actions: Only include buildings the player can currently afford (check money and building materials). Users select one building at a time.';
  }

  // Add Plant-specific rule if Plant actions exist
  if (game.availableActions?.some(a => a.type === 'Plant')) {
    prompt += '\n- Plant actions: Allow quantity selection like Buy/Craft. Users can plant multiple seeds in one action.';
  }

  prompt += '\n\nDon\'t include any other text or markdown formatting - we\'ll be calling JSON.parse() directly on your response';

  return prompt;
}
