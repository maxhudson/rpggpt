import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper: Clean markdown code blocks from JSON responses
function cleanJsonResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

function buildEventPrompt(game, history) {
  return `You are a creative game master for an RPG game. Generate a random event that fits the current game state and adds interesting gameplay choices.

FULL GAME STATE:
${JSON.stringify(game, null, 2)}

RECENT HISTORY:
${history.slice(-5).map(h => {
  if (h.type === 'prompt') return `Player: ${h.content}`;
  if (h.type === 'response') return `Game: ${h.content.storyText || ''}`;
  return '';
}).filter(Boolean).join('\n')}

Generate a random event that:
1. Fits the current game context and location
2. Is interesting and creates meaningful choices
3. Has consequences that affect the game state
4. Presents 4 different response options to the player

Return a JSON object with this structure:
{
  "eventTitle": "Short title for the event",
  "eventDescription": "2-3 sentences describing what happens",
  "options": [
    {
      "id": "option_1",
      "label": "Brief action label (e.g., 'Help them', 'Attack', 'Negotiate')",
      "description": "What the player does if they choose this"
    },
    {
      "id": "option_2",
      "label": "Brief action label",
      "description": "What the player does if they choose this"
    },
    {
      "id": "option_3",
      "label": "Brief action label",
      "description": "What the player does if they choose this"
    },
    {
      "id": "option_4",
      "label": "Brief action label",
      "description": "What the player does if they choose this"
    }
  ]
}

The options should represent different approaches (e.g., aggressive, cautious, clever, generous) and have different risk/reward profiles.

Return ONLY the JSON object, no other text.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { game, history } = req.body;

    if (!game) {
      return res.status(400).json({ error: 'Game state is required' });
    }

    const prompt = buildEventPrompt(game, history || []);

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const assistantMessage = response.content[0].text;
      const cleanedMessage = cleanJsonResponse(assistantMessage);

      const eventData = JSON.parse(cleanedMessage);

      // Validate response structure
      if (!eventData.eventTitle || !eventData.eventDescription || !eventData.options || eventData.options.length !== 4) {
        throw new Error('Invalid event structure returned from AI');
      }

      return res.status(200).json(eventData);
    } catch (error) {
      console.error('Failed to generate event:', error);
      return res.status(500).json({ error: `Failed to generate event: ${error.message}` });
    }
  } catch (error) {
    console.error('Error in generate-event handler:', error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}
