export default {
  title: "The Mountain Hums",
  description: "Paths intertwine to save the kingdom",
  quests: [
    { id: "find_the_sword", to: "Find your mother's sword that was stolen", conditions: [] },
    { id: "discover_casseus_past", to: "Uncover Casseus' family history", conditions: [] },
    { id: "defeat_damen", to: "Unite with your siblings to defeat Damen", conditions: [] },
    { id: "heal_herra", to: "Find a way to heal Herra's poisoned wing", conditions: [] },
    { id: "uncover_warlord_plan", to: "Discover the warlord's intentions", conditions: [] }
  ],
  enabledActions: {
    "Travel": { elementTypes: ["Locations"] },
    "Hum": { elementTypes: [] },
    "Fight": { elementTypes: ["Characters"] },
    "Talk": { elementTypes: ["Characters"] },
    "Investigate": { elementTypes: [] },
    "Hunt": { elementTypes: [] },
    "Craft": { elementTypes: ["Items"] },
    "Sleep": { elementTypes: [] },
    "Use": { elementTypes: ["Items"] }
  },
  elements: {
    "Characters": {
      "Kira": {
        isPlayable: true,
        description: "Lives in a castle. Has never successfully activated her mother's sword but one day she starts to hum and the sword vibrates her bones harmonically. It has a backstory of having burned an entire city by a warlord, who her mom initially took the sword from.",
        defaultLocation: "Castle",
        defaultPosition: { x: 0, y: 0 },
        actions: {
          "Hum": { level: 1, xp: 0 },
          "Fight": { level: 1, xp: 0 },
          "Craft": { level: 1, xp: 0 }
        }
      },
      "Lana": {
        isPlayable: false,
        description: "Kira's cat",
        defaultLocation: "Castle"
      },
      "Casseus": {
        isPlayable: false,
        description: "Kira's brother raised in the mountains.",
        defaultLocation: "Mountain"
      },
      "Damen": {
        isPlayable: false,
        description: "The dark brother who has stolen Kira's sword. A spy in the castle who it turns out was watching her when she hums at the beginning of the story. Assistant to the king.",
        defaultLocation: "Castle"
      },
      "Warlord": {
        isPlayable: false,
        description: "A mysterious figure who has a history with Kira's family."
      },
      "Herra": {
        isPlayable: false,
        description: "A dragon that Casseus has befriended. Can be used to travel quickly when wing is healthy.",
        defaultLocation: "Mountain"
      },
      "Rich": {
        isPlayable: false,
        description: "Father of Kira and Damen. Has a history with the warlord, who is actually the father of Damen.",
        defaultLocation: "Castle"
      },
      "Captain Thorne": {
        isPlayable: false,
        description: "The grizzled head of the guard, who has seen many battles.",
        defaultLocation: "Castle"
      },
      "Maya": {
        isPlayable: false,
        description: "A young servant who has worked in the castle for years and knows its secrets.",
        defaultLocation: "Castle"
      },
      "Aldric": {
        isPlayable: false,
        description: "A visiting merchant who often brings news from distant lands.",
        defaultLocation: "Village"
      },
      "Theo": {
        isPlayable: false,
        description: "Her trainer, a seasoned warrior who has taught her the ways of combat.",
        defaultLocation: "Castle"
      }
    },
    "Items": {
      "The Sword of Embers": {
        color: "#FF4500",
        oneOfAKind: true,
        description: "A legendary sword that responds to humming"
      },
      "Short Sword": {
        color: "#C0C0C0",
        description: "Generic short sword",
        actions: {
          "Fight": { damage: { base: [3, 5] } }
        }
      },
      "Flash Powder": {
        color: "#FFD700",
        description: "A powder that can be used to blind enemies temporarily.",
        actions: {
          "Use": { effect: "blind" }
        }
      },
      "Herb Tea": {
        color: "#90EE90",
        description: "A healing tea made from local herbs. Requires crafting level 2",
        actions: {
          "Craft": { timeInMinutes: 30, cost: { Items: { "Herb Leaf": 3 } }, requiredLevel: 2 },
          "Use": { output: { Stats: { "Health": 10 } } }
        }
      },
      "Herb Leaf": {
        color: "#228B22",
        description: "A leaf that can be used to make herb tea."
      },
      "The Shield of Perocles": {
        color: "#4169E1",
        oneOfAKind: true,
        description: "A legendary shield that can block any attack. Can only be found in the Hidden Cave."
      },
      "The Tooth of Amara": {
        color: "#FFFFFF",
        oneOfAKind: true,
        description: "A powerful artifact"
      }
    },
    "Locations": {
      "Castle": {
        description: "A grand castle where Kira lives"
      },
      "Mountain": {
        description: "Can only travel here once you've met Casseus. A hint in the village where Casseus and Kira meet leads to the mountains."
      },
      "Village": {
        description: "A seamstress in the village can help Kira identify a thread she finds when investigating."
      },
      "Hidden Cave": {
        description: "Easy to miss - up to player to say they want to investigate. This location should be difficult but possible to notice mid-way through the story."
      }
    },
    "Stats": {
      "Health": { maxAmount: 100, startingAmount: 100, color: "#FF0000" },
      "Energy": { maxAmount: 100, startingAmount: 100, color: "#FFD700" }
    }
  },
  instance: {
    activeLocation: "Castle",
    activeCharacter: "Kira",
    clock: { day: 1, time: [8, 0, "pm"] },
    storyText: "Chapter 1: The Sword of Embers\n\nKira stood in the castle courtyard, the sunset casting long red shadows across gray cobblestones. She held her mother's sword in her hands. It was a relic of power, but it had never responded to her touch. Today, however, something felt different. As she began to hum a tune her mother used to sing, the sword vibrated softly, sending a shiver through her bones.\n\n\"What is this?\" she whispered, eyes wide with wonder. The sword had never done this before.",
    activeQuest: "find_the_sword",
    characters: {
      "Kira": {
        location: "Castle",
        x: 0,
        y: 0,
        actions: {
          "Hum": { level: 1, xp: 0 },
          "Fight": { level: 1, xp: 0 },
          "Craft": { level: 1, xp: 0 }
        },
        stats: {
          "Health": 100,
          "Energy": 100
        }
      }
    },
    locations: {
      "Castle": {
        inventory: {
          "The Sword of Embers": 1
        },
        elementInstances: {
          1: { x: 0, y: 0, collection: "Characters", element: "Lana" },
          2: { x: 5, y: 3, collection: "Characters", element: "Rich" },
          3: { x: -3, y: 2, collection: "Characters", element: "Captain Thorne" },
          4: { x: 2, y: -1, collection: "Characters", element: "Maya" },
          5: { x: 4, y: 4, collection: "Characters", element: "Theo" },
          6: { x: -2, y: 3, collection: "Characters", element: "Damen" }
        }
      },
      "Mountain": { inventory: {}, elementInstances: {} },
      "Village": { inventory: {}, elementInstances: {} },
      "Hidden Cave": { inventory: {}, elementInstances: {} }
    }
  }
};
