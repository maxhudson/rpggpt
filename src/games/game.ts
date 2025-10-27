var actions = [
  {type: "character", action: "Hire", condition: {maxDistance: 50, isHireable: true}}, //costs
  {type: "character", action: "Fire", condition: {maxDistance: 50, isHireable: true}},
  {type: "character", action: "Talk", condition: {maxDistance: 50}}, //time

  {type: "building", action: "Build", condition: {isCompatibleWithLocation: true}}, //costs money, time - can't build if something already there
  {type: "building", action: "Deconstruct", condition: {maxDistance: 20}},

  // {type: "tool", action: "Use", condition: {inInventory: true, usableElementIsNearby: true, maxDistance: 20}}, //when player has a tool in inventory or in storage in a building at the location, they can use it on compatible nearby elements

  {type: "plant", action: "Till", condition: {maxDistance: 20}}, //time
  {type: "plant", action: "Plant", condition: {maxDistance: 20}}, //costs seeds, time
  {type: "plant", action: "Water", condition: {maxDistance: 20}}, //1 minute per water, water qty depends on plant
  {type: "plant", action: "Harvest", condition: {maxDistance: 20, isReadyToHarvest: true}}, //time

  {type: "item", action: "Craft", condition: {hasRequiredIngredientsInInventory: true}}, //costs ingredients, time
  {type: "item", action: "Sell", condition: {isInInventory: true, isInLocationWithMarketDemand: true}}, //gains money
  {type: "item", action: "Buy", condition: {isInLocationWithMarketSupply: true}}, //time
  {type: "item", action: "Use"}, //i.e. health / food

  {type: "location", action: "Travel", condition: {isConnectedToCurrentLocation: true}}, //costs time
];



export interface Costs {
  quantity?: number; // Items per unit
  [key: string]: string | number; // Dynamic ingredient costs like "Lemons": 2
}

export interface ElementInstance {
  type: string;
  inventory?: number;

}

export interface Element {
  inventory?: number;
  oneOfAKind?: boolean;

  cost?: Costs;
  value?: number;

  notes?: string;
}

export interface Location {
  notes?: string;
  elementInstances: {
    [key: string]: ElementInstance;
  }
}

export interface Character {
  // role?: string;
  location?: string;
  notes?: string;
  isHireable?: boolean;
  hireCostPerDay?: number;
  //keys are actions i.e. "Plant"
  stats:
  isPlayable?: boolean; //when a player starts a new game they should get to pick which character to play (which come with starting stats)

}

// export enum RoleType {
//   Customer = "customer",
//   Seller = "seller",
//   Employee = "employee",
//   Protagonist = "protagonist",
//   Antagonist = "antagonist",
//   // QuestGiver = "quest-giver",
//   Merchant = "merchant",
//   Character = "character",
// }

// export interface Action {
//   notes?: string;
// }

export interface Quest {
  notes?: string;
}

export interface AvailableActionOption {
  label: string;
  costs?: Costs;
}

export interface AvailableAction {
  type: string;
  options?: AvailableActionOption[];
}

export interface Weather {
  condition: string;
}

export interface Clock {
  day: number;
  time: [number, number, string];
}

export interface Game {
  title: string;
  description?: string;
  plot?: string[];
  story?: string;

  locations?: Record<string, Location>;
  characters?: Record<string, Character>;
  // actions?: Record<string, Action>;
  // stats?: Record<string, Stat>;
  quests?: Record<string, Quest>;
  // roles?: Record<string, Role>;

  items?: Record<string, Element>;
  tools?: Record<string, Element>; //unlocks "Use" action when in inventory
  // animals?: Record<string, Element>;
  plants?: Record<string, Element>;
  buildings?: Record<string, Element>;

  money?: number;
  currentLocation: string;
  weather?: Weather;
  clock?: Clock;
  dayStartTime?: [number, number, string];
  dayEndTime?: [number, number, string];

  availableActions?: AvailableAction[];
  gameOverConditions?: string[];
}
