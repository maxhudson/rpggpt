
export interface Costs {
  money?: number;
  timeInMinutes?: number;
  unit?: string; // e.g., "Bag", "Pack", "Pint"
  quantity?: number; // Items per unit
  [key: string]: string | number | undefined; // Dynamic ingredient costs like "Lemons": 2
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
}

export enum RoleType {
  Customer = "customer",
  Seller = "seller",
  Employee = "employee",
  Protagonist = "protagonist",
  Antagonist = "antagonist",
  QuestGiver = "quest-giver",
  Merchant = "merchant",
  Character = "character",
}

export interface Role {
  notes?: string;
  type?: RoleType;
}

export interface Character {
  role?: string;
  location?: string;
  notes?: string;
}

export interface Action {
  notes?: string;
}

export interface Quest {
  notes?: string;
}

export interface Stat {
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
  plot?: string;
  story?: string;

  locations?: Record<string, Location>;
  characters?: Record<string, Character>;
  actions?: Record<string, Action>;
  stats?: Record<string, Stat>;
  quests?: Record<string, Quest>;
  roles?: Record<string, Role>;

  items?: Record<string, Element>;
  animals?: Record<string, Element>;
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
