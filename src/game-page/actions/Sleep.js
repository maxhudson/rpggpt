export function handleSleep(game) {
  const { activeCharacter, activeLocation } = game.instance;
  const characterData = game.instance.characters?.[activeCharacter];

  if (!characterData) {
    return { success: false, message: 'Character not found', updates: [] };
  }

  const maxEnergy = game.elements?.Stats?.Energy?.maxAmount || 100;

  const updates = [
    { type: 'set', path: `instance.characters.${activeCharacter}.stats.Energy`, value: maxEnergy },
    { type: 'set', path: `instance.characters.${activeCharacter}.energyFromEatingSinceLastSlept`, value: 0 }
  ];

  // Reset lastForaged on all forageable plants in the current location
  const location = game.instance.locations?.[activeLocation];
  if (location?.elementInstances) {
    Object.entries(location.elementInstances).forEach(([instanceId, instance]) => {
      // Check if this is a plant with a Forage action
      if (instance.collection === 'Plants') {
        const plantDef = game.elements?.Plants?.[instance.element];
        if (plantDef?.actions?.Forage && instance.lastForaged !== undefined) {
          // Reset the lastForaged timestamp so it can be foraged again
          updates.push({
            type: 'unset',
            path: `instance.locations.${activeLocation}.elementInstances.${instanceId}.lastForaged`
          });
        }
      }
    });
  }

  return {
    success: true,
    updates,
    storyText: 'You rest and restore your energy.'
  };
}
