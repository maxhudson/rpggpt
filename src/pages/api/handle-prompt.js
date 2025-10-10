import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Store active streams for pause/resume functionality
const activeStreams = new Map();

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

// Helper: Call Claude API and parse JSON response
async function callClaudeForJson(message, maxTokens = 10000) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: message }]
  });

  const assistantMessage = response.content[0].text;
  const cleanedMessage = cleanJsonResponse(assistantMessage);

  try {
    return JSON.parse(cleanedMessage);
  } catch (parseError) {
    console.error('Failed to parse Claude response as JSON:', parseError);
    console.error('Raw response:', assistantMessage);
    throw new Error('Invalid response format from AI');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { prompt } = req.body;

    try {
      const parsedResponse = await callClaudeForJson(prompt, 2000);
      return res.status(200).json(parsedResponse);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error('Error handling prompt:', error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}
