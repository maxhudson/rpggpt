const safePassage = {
  title: "Safe Passage",
  description: "A mysterious journey through fields and beyond, helping spirits find peace",
  quests: [
    { id: "wake_up", to: "Understand where you are", conditions: [] },
    { id: "find_first_ingredient", to: "Discover your first spell ingredient", conditions: [] }
  ],
  enabledActions: {
    "Sit": { elementTypes: [] },
    "Pick Flowers": { elementTypes: ["Plants"] },
    "Travel": { elementTypes: ["Locations"] },
    "Investigate": { elementTypes: [] },
    "Cast": { elementTypes: ["Items"] }
  },
  elements: {
    "Characters": {
      "The Nameless": {
        isPlayable: true,
        description: "A being with no memory, wearing a white robe",
        defaultLocation: "The Field",
        defaultPosition: { x: 0, y: 0 }
      }
    },
    "Items": {
      "The Brush": {
        color: "#000000",
        oneOfAKind: true,
        description: "A magical brush that can paint reality"
      },
      "White Robe": {
        color: "#FFFFFF",
        oneOfAKind: true,
        description: "A pristine white robe"
      },
      "Flower": {
        color: "#FF69B4",
        description: "A delicate flower from the field",
        actions: {
          "Pick Flowers": { output: { Items: { "Flower": 1 } }, timeInMinutes: 2 }
        }
      }
    },
    "Plants": {
      "Wildflower Patch": {
        color: "#FFB6C1",
        spriteId: "Wildflower Patch",
        actions: {
          "Pick Flowers": { output: { Items: { "Flower": [2, 5] } }, timeInMinutes: [5, 10] }
        }
      }
    },
    "Locations": {
      "The Field": {
        description: "An endless field stretching beyond the horizon. Time passes slowly here."
      }
    },
    "Stats": {}
  },
  instance: {
    activeLocation: "The Field",
    activeCharacter: "The Nameless",
    clock: { day: 1, time: [12, 0, "pm"] },
    storyText: "Nameless eyes open slowly.\n\nA field stretching beyond the horizon comes into focus.\n\nGentle winds push clouds across the sky calmly. Birds fly quietly overhead.\n\nTime passes slowly, hardly at all.\n\nYour vision is clear, but not your memory.\n\nNowhere to go—not in time or in place.",
    activeQuest: "wake_up",
    characters: {
      "The Nameless": {
        location: "The Field",
        x: 0,
        y: 0,
        stats: {}
      }
    },
    locations: {
      "The Field": {
        inventory: {
          "White Robe": 1,
          "The Brush": 1
        },
        elementInstances: {
          1: { x: 3, y: 2, collection: "Plants", element: "Wildflower Patch" },
          2: { x: -2, y: 4, collection: "Plants", element: "Wildflower Patch" },
          3: { x: 5, y: -3, collection: "Plants", element: "Wildflower Patch" },
          4: { x: -4, y: -1, collection: "Plants", element: "Wildflower Patch" }
        }
      }
    }
  }
};

export default safePassage;
