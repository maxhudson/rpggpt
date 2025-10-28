// Shared action color definitions
export const ACTION_COLORS = {
  'Plant': '#6c9861ff',      // Forest green - planting/growing
  'Build': '#997c6eff',      // Sienna brown - construction
  'Harvest': '#417e63ff',    // Brown - gathering wood/resources
  'Forage': '#90EE90',     // Light green - foraging plants
  'Craft': '#55728fff',      // Slate gray - crafting/tools
  'Attack': '#DC143C',     // Crimson red - combat
  'Deconstruct': '#865050ff', // Brown - tearing down
  'Reside in': '#D2691E',  // Chocolate - shelter/home
  'Buy': '#DAA520',        // Goldenrod - commerce/buying
  'Sell': '#B8860B',       // Dark goldenrod - selling
  'Eat': '#FF6347',        // Tomato red - food/consumption
  'Travel': '#4682B4',     // Steel blue - movement/exploration
};

export const getActionColor = (actionType) => {
  return ACTION_COLORS[actionType] || '#808080';
};
