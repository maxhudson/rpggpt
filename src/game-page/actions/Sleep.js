export function handleSleep(game) {
  const { activeCharacter } = game.instance;
  const characterData = game.instance.characters?.[activeCharacter];

  if (!characterData) {
    return { success: false, message: 'Character not found', updates: [] };
  }

  const maxEnergy = game.elements?.Stats?.Energy?.max || 100;

  const updates = [
    { type: 'set', path: `instance.characters.${activeCharacter}.stats.Energy`, value: maxEnergy }
  ];

  return {
    success: true,
    updates,
    storyText: 'You rest and restore your energy.'
  };
}
