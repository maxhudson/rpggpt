
export const surviville = {
  title: "A Ghost Town",
  description: "Classic town builder",
  quests: [
    "Harvest 5 branches to build a workbench",
    "Build a workbench so you can craft an axe",
    "Craft an axe so you can cut down a tree for wood",
    "Harvest enough wood to build a basic shelter",
    "Build a basic shelter so you can rest better and have more energy during the day",
    "Forage for berries to keep your energy and health up",
    "Plant Bush",
    "Plant Tree"
  ],
  enabledActions: {
    "Walk": {elementTypes: ["Objects", "Buildings", "Characters", "Plants"]},

    "Harvest": {elementTypes: ["Plants", "Objects"]},
    "Forage": {elementTypes: ["Plants"]},
    "Plant": {elementTypes: ["Items"]},

    // "Attack": {elementTypes: ["Animals", "Characters"]},
    // "Flee": {elementTypes: ["Animals"], notes: "Escape when being attacked"},

    "Build": {elementTypes: ["Buildings"]},
    "Upgrade": {elementTypes: ["Buildings", "Items"]},
    "Deconstruct": {elementTypes: ["Buildings"]},
    "Reside in": {elementTypes: ["Buildings"]},
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
        "Plant": {level: 10, xp: 0},
        "Build": {level: 10, xp: 0},
        // "Attack": {level: 10, xp: 0},
      }},

      "Tomislov": {isPlayable: false, actions: {
        "Forage": {level: 5, xp: 0},
        "Build": {level: 3, xp: 0}
      }},
      "Luna": {isPlayable: false, actions: {
        "Buy": {level: 5, xp: 0},
        // "Attack": {level: 3, xp: 0},
        "Craft": {level: 4, xp: 0}
      }},
    },
    "Buildings": {
      "Basic Shelter": {color: "#D2691E", spriteId: "Basic Shelter", maxLevel: 3, actions: {
        "Build": {timeInHours: 4, cost: {"Wood": 10, "Animal Hide": 6}},
        "Upgrade": {timeInHours: 4, cost: {"Wood": 5, "Animal Hide": 4, "Stone": 2}},
        "Deconstruct": {},
        "Reside in": {capacity: {base: 1, addPerLevel: 1}}
      }},
      "Cabin": {color: "#A0522D", maxLevel: 3, actions: {
        "Build": {timeInHours: 200, cost: {"Wood": 100, "Stone": 50}},
        "Upgrade": {timeInHours: 200, cost: {"Wood": 50, "Stone": 25}},
        "Deconstruct": {},
        "Reside in": {capacity: {base: 2, addPerLevel: 1}}
      }},
      "Smelter": {color: "#DC143C", maxLevel: 5, actions: {
        "Build": {timeInHours: 50, cost: {"Stone": 30, "Clay": 20}},
        "Upgrade": {timeInHours: 50, cost: {"Stone": 15, "Clay": 10}},
        "Deconstruct": {},
        "Craft": {compatibleItems: ["Iron"]}
      }},
      "Workbench": {color: "#8B4513", maxLevel: 3, actions: {
        "Build": {timeInHours: 2, cost: {"Wood": 5}},
        "Upgrade": {timeInHours: 2, cost: {"Wood": 3}},
        "Deconstruct": {},
        "Craft": {compatibleItems: ["Axe", "Pickaxe", "Bow"]}
      }},
      "Trading Post": {color: "#DAA520", maxLevel: 1, actions: {
        "Build": {timeInHours: 100, cost: {"Wood": 50, "Stone": 30, "Animal Hide": 10}},
        "Deconstruct": {},
        "Buy": {prices: {"Berry": 5, "Wood": 2, "Stone": 3, "Animal Hide": 8, "Meat Cutlet": 12, "Mushroom": 4, "Fiber": 3, "Clay": 2, "Iron Ore": 10, "Iron": 20}},
        "Sell": {prices: {"Berry": 3, "Wood": 1, "Stone": 2, "Animal Hide": 5, "Meat Cutlet": 8, "Mushroom": 2, "Fiber": 2, "Clay": 1, "Iron Ore": 6, "Iron": 15}},
      }},
    },
    "Plants": {
      "Tree": {color: "#228B22", spriteId: "Tree", actions: {
        "Harvest": {output: {"Wood": [10, 20], "Tree Seed": [0, 1]}, requiredItem: "Axe"},
        "Plant": {timeInHours: 0.25, costs: {"Tree Seed": 1}}
      }},
      "Berry Bush": {color: "#8B008B", spriteId: "Berry Bush", actions: {
        "Forage": {output: {"Berry": [1, 10], "Berry Bush Seed": [0, 1]}},
        "Plant": {timeInHours: 0.25, costs: {"Berry Bush Seed": 1}}
      }},
      "Tall Grass": {color: "#90EE90", spriteId: "Tall Grass", actions: {
        "Forage": {output: {"Mushroom": [0, 5], "Fiber": [1, 5]}}
      }},
    },
    "Animals": {
      "Deer": {
        color: "#D2691E",
        maxLevel: 10,
        stats: {base: {"Health": [15, 20], "Attack": 1, "Evasiveness": [3, 5]}, addPerLevel: {"Health": 2, "Attack": 1, "Evasiveness": 1}},
        actions: {
          "Attack": {},
          "Harvest": {output: {"Meat Cutlet": 3, "Animal Hide": 2}, requiresZeroHealth: true}
        }
      },
      "Wolf": {
        color: "#696969",
        maxLevel: 10,
        stats: {base: {"Health": [15, 20], "Attack": [3, 5], "Evasiveness": [5, 7]}, addPerLevel: {"Health": 3, "Attack": 1, "Evasiveness": 1}},
        actions: {
          "Attack": {},
          "Harvest": {output: {"Meat Cutlet": 2, "Animal Hide": 1}, requiresZeroHealth: true},
          "Flee": {},
        }
      },
    },
    "Objects": {
      "Branch": {
        color: "#8B4513",
        spriteId: "Branch",
        actions: {"Harvest": {output: {"Wood": 1}}},
      },
      "Rock": {
        color: "#808080",
        spriteId: "Rock",
        actions: {"Harvest": {output: {"Stone": 1}}}
      },
      "Boulder": {
        color: "#696969",
        capacity: [20, 30],
        actions: {"Harvest": {output: {"Stone": [5, 15]}, requiredItem: "Pickaxe"}}
      },
      "Clay Deposit": {
        color: "#CD853F",
        capacity: [500, 1000],
        actions: {"Harvest": {output: {"Clay": [5, 15]}, requiredItem: "Pickaxe"}}
      },
      "Iron Ore Deposit": {
        color: "#B87333",
        capacity: [50, 100],
        actions: {"Harvest": {output: {"Iron Ore": [1, 3]}, requiredItem: "Pickaxe"}}
      },
    },
    "Items": {
      "Animal Hide": {color: "#8B4513"},
      "Wood": {color: "#8B4513"},
      "Stone": {color: "#808080"},
      "Clay": {color: "#CD853F"},
      "Iron Ore": {color: "#B87333"},
      "Fiber": {color: "#F5DEB3"},
      "Mushroom": {color: "#A0522D", actions: {"Eat": {calories: 25}}},

      "Berry": {color: "#8B008B", actions: {"Eat": {calories: 50}}},
      "Meat Cutlet": {color: "#DC143C", actions: {"Eat": {calories: 100}}},

      "Iron": {color: "#708090", actions: {
        "Craft": {timeInHours: 2, cost: {"Iron Ore": 2, "Wood": 1}}
      }},

      "Tree Seed": {color: "#8B4513"},
      "Berry Bush Seed": {color: "#8B008B"},

      "Axe": {color: "#696969", maxLevel: 5, actions: {
        "Craft": {timeInHours: 4, cost: {"Wood": 2, "Stone": 1}},
        "Upgrade": {timeInHours: 4, cost: {"Wood": 2, "Stone": 1}},
        "Harvest": {compatibility: {"Plants": ["Tree"]}}
      }},
      "Pickaxe": {color: "#696969", maxLevel: 5, actions: {
        "Craft": {timeInHours: 4, cost: {"Wood": 4, "Stone": 2}},
        "Upgrade": {timeInHours: 4, cost: {"Wood": 4, "Stone": 2}},
        "Harvest": {compatibility: {"Objects": ["Boulder", "Clay Deposit", "Iron Ore Deposit"]}}
      }},
      "Bow": {color: "#8B4513", maxLevel: 10, actions: {
        "Craft": {timeInHours: 6, cost: {"Wood": 3, "Fiber": 2}},
        "Upgrade": {timeInHours: 3, cost: {"Wood": 3, "Fiber": 2}},
        "Attack": {compatibility: {"Animals": ["Deer", "Wolf"]}, damage: {base: [5, 10], addPerLevel: [2, 3]}}
      }},
    },
    "Locations": {
      "Forest": {},
      "The Cave": {}
    }
  },
  instance: {
    activeLocation: "Forest",
    activeCharacter: "Hannes",
    clock: { day: 1, time: [8, 0, "am"] },
    storyText: "Hannes wakes up in the Forest alone. Hakira is missing.",
    activeQuest: "Harvest 5 branches to build a workbench",
    locations: {
      "Forest": {
        characters: {
          "Hannes": {x: 0, y: 0, levels: {
            "Forge": {level: 10, xp: 0},
            "Craft": {level: 10, xp: 0},
          }}
        },
        elementInstances: {
          1: {x: 1, y: 0, collection: "Buildings", element: "Basic Shelter", level: 1},

          10: {x: -1, y: -2, collection: "Plants", element: "Tree"},
          23: {x: -2, y: -2, collection: "Objects", element: "Branch"},

          11: {x: 2, y: -4, collection: "Plants", element: "Tree"},
          12: {x: 3, y: -4, collection: "Plants", element: "Tree"},
          20: {x: 2, y: -3, collection: "Objects", element: "Branch"},
          21: {x: 3, y: -3, collection: "Objects", element: "Branch"},

          30: {x: 3, y: -2, collection: "Plants", element: "Berry Bush"},
          31: {x: 5, y: -2, collection: "Plants", element: "Berry Bush"},
          32: {x: 5, y: -4, collection: "Plants", element: "Berry Bush"},

          40: {x: 5, y: 1, collection: "Plants", element: "Tall Grass"},
          41: {x: 3, y: 4, collection: "Plants", element: "Tall Grass"},
          42: {x: 2, y: 4, collection: "Plants", element: "Tall Grass"},
          43: {x: -3, y: 2, collection: "Plants", element: "Tall Grass"},

          55: {x: 1, y: -3, collection: "Objects", element: "Rock"},
          56: {x: 4, y: -1, collection: "Objects", element: "Rock"},
          57: {x: 0, y: 4, collection: "Objects", element: "Rock"},
          58: {x: -1, y: 3, collection: "Objects", element: "Rock"},

          // Northern Forest - 50 trees in natural clusters
          // Path through forest: clear lane at x=0 going north

          // West side - Dense cluster near (-7, -6)
          100: {x: -8, y: -5, collection: "Plants", element: "Tree"},
          101: {x: -7, y: -5, collection: "Plants", element: "Tree"},
          102: {x: -6, y: -5, collection: "Plants", element: "Tree"},
          103: {x: -7, y: -6, collection: "Plants", element: "Tree"},
          104: {x: -6, y: -6, collection: "Plants", element: "Tree"},
          105: {x: -8, y: -6, collection: "Plants", element: "Tree"},
          106: {x: -7, y: -7, collection: "Plants", element: "Tree"},
          107: {x: -6, y: -7, collection: "Plants", element: "Tree"},

          // West side - Medium cluster near (-4, -8)
          108: {x: -5, y: -7, collection: "Plants", element: "Tree"},
          109: {x: -4, y: -7, collection: "Plants", element: "Tree"},
          110: {x: -3, y: -7, collection: "Plants", element: "Tree"},
          111: {x: -5, y: -8, collection: "Plants", element: "Tree"},
          112: {x: -4, y: -8, collection: "Plants", element: "Tree"},
          113: {x: -3, y: -8, collection: "Plants", element: "Tree"},
          114: {x: -4, y: -9, collection: "Plants", element: "Tree"},

          // West side - Sparse trees near path
          115: {x: -2, y: -6, collection: "Plants", element: "Tree"},
          116: {x: -1, y: -8, collection: "Plants", element: "Tree"},
          117: {x: -2, y: -10, collection: "Plants", element: "Tree"},

          // West side - Small cluster north (-6, -10)
          118: {x: -7, y: -10, collection: "Plants", element: "Tree"},
          119: {x: -6, y: -10, collection: "Plants", element: "Tree"},
          120: {x: -5, y: -10, collection: "Plants", element: "Tree"},
          121: {x: -6, y: -11, collection: "Plants", element: "Tree"},
          122: {x: -7, y: -11, collection: "Plants", element: "Tree"},

          // West side - Far north cluster
          123: {x: -4, y: -12, collection: "Plants", element: "Tree"},
          124: {x: -3, y: -12, collection: "Plants", element: "Tree"},
          125: {x: -4, y: -13, collection: "Plants", element: "Tree"},
          126: {x: -5, y: -13, collection: "Plants", element: "Tree"},

          // East side - Dense cluster near (6, -6)
          127: {x: 5, y: -5, collection: "Plants", element: "Tree"},
          128: {x: 6, y: -5, collection: "Plants", element: "Tree"},
          129: {x: 7, y: -5, collection: "Plants", element: "Tree"},
          130: {x: 5, y: -6, collection: "Plants", element: "Tree"},
          131: {x: 6, y: -6, collection: "Plants", element: "Tree"},
          132: {x: 7, y: -6, collection: "Plants", element: "Tree"},
          133: {x: 6, y: -7, collection: "Plants", element: "Tree"},
          134: {x: 7, y: -7, collection: "Plants", element: "Tree"},
          135: {x: 8, y: -6, collection: "Plants", element: "Tree"},

          // East side - Medium cluster near (3, -9)
          136: {x: 2, y: -8, collection: "Plants", element: "Tree"},
          137: {x: 3, y: -8, collection: "Plants", element: "Tree"},
          138: {x: 4, y: -8, collection: "Plants", element: "Tree"},
          139: {x: 2, y: -9, collection: "Plants", element: "Tree"},
          140: {x: 3, y: -9, collection: "Plants", element: "Tree"},
          141: {x: 4, y: -9, collection: "Plants", element: "Tree"},
          142: {x: 3, y: -10, collection: "Plants", element: "Tree"},

          // East side - Sparse trees near path
          143: {x: 1, y: -7, collection: "Plants", element: "Tree"},
          144: {x: 2, y: -11, collection: "Plants", element: "Tree"},

          // East side - North cluster (6, -11)
          145: {x: 5, y: -11, collection: "Plants", element: "Tree"},
          146: {x: 6, y: -11, collection: "Plants", element: "Tree"},
          147: {x: 7, y: -11, collection: "Plants", element: "Tree"},
          148: {x: 6, y: -12, collection: "Plants", element: "Tree"},
          149: {x: 5, y: -13, collection: "Plants", element: "Tree"},
          150: {x: 6, y: -13, collection: "Plants", element: "Tree"},

          // Branches clustered near tree groups
          // West clusters
          200: {x: -8, y: -7, collection: "Objects", element: "Branch"},
          201: {x: -5, y: -6, collection: "Objects", element: "Branch"},
          202: {x: -6, y: -8, collection: "Objects", element: "Branch"},
          203: {x: -3, y: -9, collection: "Objects", element: "Branch"},
          204: {x: -5, y: -11, collection: "Objects", element: "Branch"},
          205: {x: -7, y: -12, collection: "Objects", element: "Branch"},
          206: {x: -2, y: -7, collection: "Objects", element: "Branch"},

          // East clusters
          210: {x: 8, y: -7, collection: "Objects", element: "Branch"},
          211: {x: 5, y: -7, collection: "Objects", element: "Branch"},
          212: {x: 4, y: -10, collection: "Objects", element: "Branch"},
          213: {x: 2, y: -10, collection: "Objects", element: "Branch"},
          214: {x: 5, y: -12, collection: "Objects", element: "Branch"},
          215: {x: 7, y: -13, collection: "Objects", element: "Branch"},
          216: {x: 1, y: -8, collection: "Objects", element: "Branch"},

          // Sparse branches in clearings
          217: {x: -1, y: -9, collection: "Objects", element: "Branch"},
          218: {x: 1, y: -10, collection: "Objects", element: "Branch"},
          219: {x: -2, y: -12, collection: "Objects", element: "Branch"},

          // Southern area - Tall Grass in bunches
          // West grass patch
          300: {x: -7, y: 3, collection: "Plants", element: "Tall Grass"},
          301: {x: -6, y: 3, collection: "Plants", element: "Tall Grass"},
          302: {x: -7, y: 4, collection: "Plants", element: "Tall Grass"},
          303: {x: -6, y: 4, collection: "Plants", element: "Tall Grass"},
          304: {x: -5, y: 4, collection: "Plants", element: "Tall Grass"},

          // Center-west bunch
          305: {x: -3, y: 5, collection: "Plants", element: "Tall Grass"},
          306: {x: -2, y: 5, collection: "Plants", element: "Tall Grass"},
          307: {x: -3, y: 6, collection: "Plants", element: "Tall Grass"},
          308: {x: -2, y: 6, collection: "Plants", element: "Tall Grass"},
          309: {x: -4, y: 6, collection: "Plants", element: "Tall Grass"},

          // Center-east bunch
          310: {x: 2, y: 4, collection: "Plants", element: "Tall Grass"},
          311: {x: 3, y: 4, collection: "Plants", element: "Tall Grass"},
          312: {x: 2, y: 5, collection: "Plants", element: "Tall Grass"},
          313: {x: 3, y: 5, collection: "Plants", element: "Tall Grass"},
          314: {x: 4, y: 5, collection: "Plants", element: "Tall Grass"},

          // East grass patch
          315: {x: 6, y: 7, collection: "Plants", element: "Tall Grass"},
          316: {x: 7, y: 7, collection: "Plants", element: "Tall Grass"},
          317: {x: 6, y: 8, collection: "Plants", element: "Tall Grass"},
          318: {x: 7, y: 8, collection: "Plants", element: "Tall Grass"},
          319: {x: 5, y: 8, collection: "Plants", element: "Tall Grass"},

          // Far south cluster
          320: {x: -1, y: 9, collection: "Plants", element: "Tall Grass"},
          321: {x: 0, y: 9, collection: "Plants", element: "Tall Grass"},
          322: {x: 1, y: 9, collection: "Plants", element: "Tall Grass"},
          323: {x: 0, y: 10, collection: "Plants", element: "Tall Grass"},
          324: {x: 1, y: 10, collection: "Plants", element: "Tall Grass"},

          // Southern area - Rocks in clusters
          // West rock pile
          400: {x: -8, y: 5, collection: "Objects", element: "Rock"},
          401: {x: -7, y: 5, collection: "Objects", element: "Rock"},
          402: {x: -8, y: 6, collection: "Objects", element: "Rock"},
          403: {x: -7, y: 6, collection: "Objects", element: "Rock"},
          404: {x: -6, y: 6, collection: "Objects", element: "Rock"},

          // Center-west rocks
          405: {x: -4, y: 7, collection: "Objects", element: "Rock"},
          406: {x: -3, y: 7, collection: "Objects", element: "Rock"},
          407: {x: -4, y: 8, collection: "Objects", element: "Rock"},
          408: {x: -3, y: 8, collection: "Objects", element: "Rock"},

          // Central cluster
          409: {x: 0, y: 6, collection: "Objects", element: "Rock"},
          410: {x: 1, y: 6, collection: "Objects", element: "Rock"},
          411: {x: 0, y: 7, collection: "Objects", element: "Rock"},
          412: {x: 1, y: 7, collection: "Objects", element: "Rock"},
          413: {x: -1, y: 7, collection: "Objects", element: "Rock"},

          // East rock group
          414: {x: 4, y: 9, collection: "Objects", element: "Rock"},
          415: {x: 5, y: 9, collection: "Objects", element: "Rock"},
          416: {x: 4, y: 10, collection: "Objects", element: "Rock"},
          417: {x: 5, y: 10, collection: "Objects", element: "Rock"},
          418: {x: 6, y: 10, collection: "Objects", element: "Rock"},

          // Sparse southern rocks
          419: {x: -5, y: 10, collection: "Objects", element: "Rock"},
          420: {x: -2, y: 11, collection: "Objects", element: "Rock"},
          421: {x: 2, y: 11, collection: "Objects", element: "Rock"},
          422: {x: 7, y: 11, collection: "Objects", element: "Rock"},

          // // Resource deposits (far corners)
          // 60: {x: 24, y: -20, collection: "Objects", element: "Boulder"},
          // 61: {x: -25, y: 19, collection: "Objects", element: "Clay Deposit"},
          // 62: {x: 22, y: 22, collection: "Objects", element: "Iron Ore Deposit"},

          // // Deer near different biome areas
          // 70: {x: 19, y: 1, collection: "Animals", element: "Deer", level: 1, health: 17},
          // 71: {x: -15, y: -13, collection: "Animals", element: "Deer", level: 1, health: 18},
          // 72: {x: -7, y: 16, collection: "Animals", element: "Deer", level: 1, health: 16},

          // // Wolf in the dangerous northwest area
          // 80: {x: -22, y: -18, collection: "Animals", element: "Wolf", level: 1, health: 18},
        },
        inventory: {}
      },
      "The Cave": {
        characters: {},
        elementInstances: {},
        inventory: {}
      }
    }
  }
};

// Export all games as a collection
export const allGames = {
  surviville
};
