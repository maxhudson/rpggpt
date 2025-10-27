
export const surviville = {
  title: "Surviville",
  description: "Classic town builder",
  quests: [
    "Build Campsite",
    "Attack Deer",
    "Forage Berries",
    "Plant Bush",
    "Craft Axe",
    "Harvest Tree",
    "Plant Tree",
    "Attack Wolf"
  ],
  enabledActions: {
    "Walk": {elementTypes: ["Objects", "Buildings", "Characters", "Plants"]},

    "Harvest": {elementTypes: ["Plants", "Objects"]},
    "Forage": {elementTypes: ["Plants"]},
    "Plant": {elementTypes: ["Items"]},

    "Attack": {elementTypes: ["Animals", "Characters"]},
    "Flee": {elementTypes: ["Animals"], notes: "Escape when being attacked"},

    "Build": {elementTypes: ["Buildings"]},
    "Deconstruct": {elementTypes: ["Buildings"]},
    "Reside": {elementTypes: ["Buildings"]},
    "Buy": {elementTypes: ["Buildings"]},
    "Sell": {elementTypes: ["Buildings"]},

    "Craft": {elementTypes: ["Items"]},
    "Eat": {elementTypes: ["Items"]},
  },
  elements: {
    "Characters": {
      "Hannes": {isPlayable: true, actions: {
        "Forage": {level: 10, xp: 0},
        "Craft": {level: 10, xp: 0}
      }},
      "Hakira": {isPlayable: true, actions: {
        "Attack": {level: 10, xp: 0},
        "Build": {level: 10, xp: 0},
      }},

      "Tomislov": {isPlayable: false, actions: {
        "Forage": {level: 5, xp: 0},
        "Build": {level: 3, xp: 0}
      }},
      "Luna": {isPlayable: false, actions: {
        "Attack": {level: 3, xp: 0},
        "Craft": {level: 4, xp: 0}
      }},
    },
    "Buildings": {
      "Campsite": {maxLevel: 3, actions: {
        "Build": {timeInHours: {base: 4, addPerLevel: 4}, cost: {base: {"Wood": 10, "Animal Hide": 6}, addPerLevel: {"Wood": 5, "Animal Hide": 4, "Stone": 2}}},
        "Deconstruct": {},
        "Reside": {capacity: {base: 1, addPerLevel: 1}}
      }},
      "Cabin": {maxLevel: 3, actions: {
        "Build": {timeInHours: {base: 200, addPerLevel: 200}, cost: {base: {"Wood": 100, "Stone": 50}, addPerLevel: {"Wood": 50, "Stone": 25}}},
        "Deconstruct": {},
        "Reside": {capacity: {base: 2, addPerLevel: 1}}
      }},
      "Smelter": {maxLevel: 5, actions: {
        "Build": {timeInHours: {base: 50, addPerLevel: 50}, cost: {base: {"Stone": 30, "Clay": 20}, addPerLevel: {"Stone": 15, "Clay": 10}}},
        "Deconstruct": {},
        "Craft": {compatibleItems: ["Iron"]}
      }},
      "Workbench": {maxLevel: 1, actions: {
        "Build": {timeInHours: {base: 2}, cost: {base: {"Wood": 5, "Stone": 2}}},
        "Deconstruct": {},
        "Craft": {compatibleItems: ["Axe", "Pickaxe", "Bow"]}
      }},
      "Trading Post": {maxLevel: 1, actions: {
        "Build": {timeInHours: {base: 100}, cost: {base: {"Wood": 50, "Stone": 30, "Animal Hide": 10}}},
        "Deconstruct": {},
        "Buy": {prices: {"Berry": 5, "Wood": 2, "Stone": 3, "Animal Hide": 8, "Meat Cutlet": 12, "Mushroom": 4, "Fiber": 3, "Clay": 2, "Iron Ore": 10, "Iron": 20}},
        "Sell": {prices: {"Berry": 3, "Wood": 1, "Stone": 2, "Animal Hide": 5, "Meat Cutlet": 8, "Mushroom": 2, "Fiber": 2, "Clay": 1, "Iron Ore": 6, "Iron": 15}},
      }},
    },
    "Plants": {
      "Tree": {actions: {
        "Harvest": {output: {"Wood": [10, 20], "Tree Seed": [0, 1]}},
      }},
      "Berry Bush": {actions: {
        "Forage": {output: {"Berry": [1, 10], "Berry Bush Seed": [0, 1]}}
      }},
      "Tall Grass": {actions: {
        "Forage": {output: {"Mushroom": [0, 5], "Fiber": [1, 5]}}
      }},
    },
    "Animals": {
      "Deer": {
        maxLevel: 10,
        stats: {base: {"Health": [15, 20], "Attack": 1, "Evasiveness": [3, 5]}, addPerLevel: {"Health": 2, "Attack": 1, "Evasiveness": 1}},
        actions: {
          "Attack": {},
          "Harvest": {output: {"Meat Cutlet": 3, "Animal Hide": 2}}
        }
      },
      "Wolf": {
        maxLevel: 10,
        stats: {base: {"Health": [15, 20], "Attack": [3, 5], "Evasiveness": [5, 7]}, addPerLevel: {"Health": 3, "Attack": 1, "Evasiveness": 1}},
        actions: {
          "Attack": {},
          "Harvest": {output: {"Meat Cutlet": 2, "Animal Hide": 1}},
          "Flee": {},
        }
      },
    },
    "Objects": {
      "Branch": {
        actions: {"Harvest": {output: {"Wood": 1}}}
      },
      "Rock": {
        capacity: [20, 30],
        actions: {"Harvest": {output: {"Stone": [5, 15]}}}
      },
      "Clay Deposit": {
        capacity: [500, 1000],
        actions: {"Harvest": {output: {"Clay": [5, 15]}}}
      },
      "Iron Ore Deposit": {
        capacity: [50, 100],
        actions: {"Harvest": {output: {"Iron Ore": [1, 3]}}}
      },
    },
    "Items": {
      "Animal Hide": {},
      "Wood": {},
      "Stone": {actions: {
        "Attack": {damage: [1, 2]}
      }},
      "Clay": {},
      "Iron Ore": {},
      "Fiber": {},
      "Mushroom": {actions: {"Eat": {calories: 25}}},

      "Berry": {actions: {"Eat": {calories: 50}}},
      "Meat Cutlet": {actions: {"Eat": {calories: 100}}},

      "Iron": {actions: {
        "Craft": {timeInHours: 2, cost: {"Iron Ore": 2, "Wood": 1}}
      }},

      "Tree Seed": {actions: {
        "Plant": {timeInHours: 1, growsInto: "Tree"}
      }},
      "Berry Bush Seed": {actions: {
        "Plant": {timeInHours: 1, growsInto: "Berry Bush"}
      }},

      "Axe": {maxLevel: 5, actions: {
        "Craft": {timeInHours: {base: 4, addPerLevel: 4}, cost: {base: {"Wood": 2, "Stone": 1}, addPerLevel: {"Wood": 2, "Stone": 1}}},
        "Harvest": {compatibility: {"Plants": ["Tree"]}}
      }},
      "Pickaxe": {maxLevel: 5, actions: {
        "Craft": {timeInHours: {base: 4, addPerLevel: 4}, cost: {base: {"Wood": 4, "Stone": 2}, addPerLevel: {"Wood": 4, "Stone": 2}}},
        "Harvest": {compatibility: {"Objects": ["Rock", "Clay Deposit", "Iron Ore Deposit"]}}
      }},
      "Bow": {maxLevel: 10, actions: {
        "Craft": {timeInHours: {base: 6, addPerLevel: 6}, cost: {base: {"Wood": 3, "Fiber": 2}, addPerLevel: {"Wood": 3, "Fiber": 2}}},
        "Attack": {compatibility: {"Animals": ["Deer", "Wolf"]}, damage: {base: [5, 10], addPerLevel: [2, 3]}}
      }},
    },
    "Locations": {
      "Forest": {
        elementInstances: {
          1: {x: 10, y: -10, type: "Tree"},
          2: {x: 15, y: -5, type: "Berry Bush"},
          3: {x: 20, y: -15, type: "Tall Grass"},
          4: {x: 25, y: -20, type: "Rock"},
          5: {x: 30, y: -25, type: "Clay Deposit"},
          6: {x: 35, y: -30, type: "Iron Ore Deposit"},
          7: {x: 40, y: -35, type: "Deer", level: 1, health: 17},
          8: {x: 45, y: -40, type: "Wolf", level: 1, health: 18},
          9: {x: 50, y: -45, type: "Campsite", level: 1},

          // Hannes (active character)
          10: {x: 0, y: 0, type: "Hannes"},

          // Branch elements (for gathering wood)
          11: {x: -20, y: 10, type: "Branch"},
          12: {x: -10, y: 15, type: "Branch"},
          13: {x: 5, y: 20, type: "Branch"},
          14: {x: 25, y: 5, type: "Branch"},
          15: {x: -15, y: -10, type: "Branch"},
          16: {x: 10, y: 25, type: "Branch"},
          17: {x: -25, y: -5, type: "Branch"},
        },
        inventory: {}
      },
      "The Cave": {
        elementInstances: {},
        inventory: {}
      }
    }
  },
  instance: {
    activeLocation: "Forest",
    activeCharacter: "Hannes",
    clock: { day: 1, time: [8, 0, "am"] }
  }
};

// Export all games as a collection
export const allGames = {
  surviville
};
