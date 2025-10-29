export default {
  title: "Lemonade Stand",
  description: "Your friend is tired of selling lemonade and wants to get into the hot dog business, so he's giving you his lemonade cart. You need to pay off your student loan debt and no one is hiring so you decide to try it out.",
  minMoney: -10000,
  quests: [
    { id: "first_day", to: "Buy sugar and craft your first lemonade", conditions: [{ action: "Buy", item: "Sugar", quantity: 1 }, { action: "Craft", item: "Lemonade", quantity: 1 }] },
    { id: "make_a_sale", to: "Sell lemonade at the Park", conditions: [{ action: "Sell", item: "Lemonade", quantity: 1 }] },
    { id: "help_mike_deliveries", to: "Help Mike deliver hot dogs", conditions: [] },
    { id: "help_mike_prep", to: "Help Mike prep ingredients", conditions: [] },
    { id: "help_mike_register", to: "Help Mike manage the truck register", conditions: [] },
    { id: "help_mike_cleaning", to: "Help Mike clean and restock the truck", conditions: [] },
    { id: "help_mike_lunch_rush", to: "Help Mike during lunch rush", conditions: [] }
  ],
  enabledActions: {
    "Buy": { elementTypes: ["Buildings"] },
    "Sell": { elementTypes: ["Buildings", "Items"] },
    "Craft": { elementTypes: ["Items"] },
    "Travel": { elementTypes: ["Locations"] },
    "Pass Time": { elementTypes: [] },
    "Rent": { elementTypes: ["Locations"] },
    "Hire": { elementTypes: ["Characters"] }
  },
  elements: {
    "Characters": {
      "Player": {
        isPlayable: true,
        description: "Recent graduate trying to pay off student loans",
        defaultLocation: "Home",
        defaultPosition: { x: 0, y: 0 }
      },
      "Mike": {
        isPlayable: false,
        description: "Your friend who is switching from lemonade to hot dogs",
        defaultLocation: "Downtown"
      },
      "Sally": {
        isPlayable: false,
        description: "Grocery store owner",
        defaultLocation: "Grocery Store"
      },
      "John": {
        isPlayable: false,
        description: "A customer"
      },
      "Tim": {
        isPlayable: false,
        description: "A potential shopper you could hire"
      },
      "Sarah": {
        isPlayable: false,
        description: "A sign carrier who can attract +1 customer per hour"
      }
    },
    "Items": {
      "Ice": { color: "#E0F7FA", actions: { "Buy": { cost: { money: 3 }, output: { Items: { "Ice": 32 } } } } },
      "Sugar": { color: "#FFFFFF", actions: { "Buy": { cost: { money: 4 }, output: { Items: { "Sugar": 10 } } } } },
      "Water": { color: "#2196F3", actions: { "Buy": { cost: { money: 2 }, output: { Items: { "Water": 6 } } } } },
      "Lemon": { color: "#FFEB3B", actions: { "Buy": { cost: { money: 2 }, output: { Items: { "Lemon": 1 } } } } },
      "Cup": { color: "#FFF8DC", actions: { "Buy": { cost: { money: 5 }, output: { Items: { "Cup": 50 } } } } },
      "Lemonade": {
        color: "#FFFF99",
        actions: {
          "Craft": { timeInMinutes: 3, cost: { Items: { "Lemon": 2, "Ice": 1, "Sugar": 1, "Water": 1, "Cup": 1 } } },
          "Sell": { value: 5 }
        }
      },
      "Strawberry": { color: "#FF6B6B", actions: { "Buy": { cost: { money: 6 }, output: { Items: { "Strawberry": 12 } } } } },
      "Strawberry Lemonade": {
        color: "#FFB3BA",
        actions: {
          "Craft": { timeInMinutes: 4, cost: { Items: { "Lemon": 2, "Ice": 1, "Sugar": 1, "Water": 1, "Strawberry": 2, "Cup": 1 } } },
          "Sell": { value: 8 }
        }
      },
      "Mint Leaf": { color: "#98FB98", actions: { "Buy": { cost: { money: 4 }, output: { Items: { "Mint Leaf": 8 } } } } },
      "Mint Lemonade": {
        color: "#BDFCC9",
        actions: {
          "Craft": { timeInMinutes: 4, cost: { Items: { "Lemon": 2, "Ice": 1, "Sugar": 1, "Water": 1, "Mint Leaf": 3, "Cup": 1 } } },
          "Sell": { value: 6 }
        }
      },
      "Ginger": { color: "#F4A460", actions: { "Buy": { cost: { money: 5 }, output: { Items: { "Ginger": 3 } } } } },
      "Ginger Lemonade": {
        color: "#FFE4B5",
        actions: {
          "Craft": { timeInMinutes: 5, cost: { Items: { "Lemon": 2, "Ice": 1, "Sugar": 2, "Water": 1, "Ginger": 1, "Cup": 1 } } },
          "Sell": { value: 7 }
        }
      },
      "Cucumber": { color: "#90EE90", actions: { "Buy": { cost: { money: 2 }, output: { Items: { "Cucumber": 1 } } } } },
      "Cucumber Mint Lemonade": {
        color: "#AFFFAF",
        actions: {
          "Craft": { timeInMinutes: 6, cost: { Items: { "Lemon": 2, "Ice": 1, "Sugar": 1, "Water": 1, "Cucumber": 2, "Mint Leaf": 2, "Cup": 1 } } },
          "Sell": { value: 9 }
        }
      },
      "Tea Bag": { color: "#8B4513", actions: { "Buy": { cost: { money: 5 }, output: { Items: { "Tea Bag": 50 } } } } },
      "Arnold Palmer": {
        color: "#C19A6B",
        actions: {
          "Craft": { timeInMinutes: 6, cost: { Items: { "Lemon": 1, "Ice": 1, "Sugar": 1, "Water": 2, "Tea Bag": 1, "Cup": 1 } } },
          "Sell": { value: 8 }
        }
      },
      "Car": { color: "#4A90E2", actions: { "Buy": { cost: { money: 5000 } } } },
      "Acre of Land": { color: "#8B7355", actions: { "Buy": { cost: { money: 50000 } } } }
    },
    "Buildings": {
      "Grocery Store": {
        spriteId: "Grocery Store",
        maxLevel: 1,
        actions: {
          "Buy": {
            prices: {
              "Ice": 3,
              "Sugar": 4,
              "Water": 2,
              "Lemon": 2,
              "Cup": 5,
              "Strawberry": 6,
              "Mint Leaf": 4,
              "Ginger": 5,
              "Cucumber": 2,
              "Tea Bag": 5
            }
          }
        }
      }
    },
    "Locations": {
      "Home": {
        notes: "Your apartment. Free. No customers."
      },
      "Grocery Store": {
        notes: "45 mins north of home. Free. Buy ingredients here, no selling."
      },
      "Park": {
        notes: "30 mins north of home. $35/day. 3-4 customers/hr. Only location accessible without a car.",
      },
      "Downtown": {
        notes: "45 mins north of home. $75/day. 8-10 customers/hr. Peak: 12pm-2pm, 5pm-7pm. Requires car.",
      },
      "Shopping Mall": {
        notes: "55 mins north of home. $100/day. 10-12 customers/hr. Consistent traffic. Requires car.",
      },
      "Stadium": {
        notes: "60 mins north of home. $150/day. 15-20 customers/hr during events (weekends), 0-1 otherwise. Requires car.",
      },
      "Beach": {
        notes: "75 mins north of home. $120/day. 12-15 customers/hr. Weather dependent. Highest rates and sales. Requires car.",
      }
    },
    "Stats": {}
  },
  instance: {
    activeLocation: "Home",
    activeCharacter: "Player",
    clock: { day: 1, time: [7, 0, "am"] },
    dayStartTime: [7, 0, "am"],
    dayEndTime: [7, 0, "pm"],
    weather: { condition: "sunny", high: 75, low: 55 },
    storyText: "The morning sun filters through your apartment window as you stare at the mountain of paperwork on your coffee table. Student loan statements, job rejection letters, and now—a rusty lemonade cart key your friend Mike dropped off last night.\n\n\"I'm done with it, man,\" he'd said, tossing you the key. \"Hot dogs are where the money's at. The cart's yours if you want it.\"\n\nYou turn the key over in your palm. $5,000 in debt. No callbacks from any of the hundreds of applications you've sent. The cart sits outside your apartment building, a faded yellow beacon of... possibility? Desperation? Maybe both.\n\nYou check your supplies: lemons, ice, water, and cups. But no sugar—Mike must have used the last of it. At least you have $45,000 in debt to motivate you. Wait, that's not how motivation works.\n\nThe clock reads 7:00 AM on Day 1. The city is waking up, and you need to decide your first move.",
    activeQuest: "first_day",
    characters: {
      "Player": {
        location: "Home",
        stats: {}
      },
      "Mike": {
        location: "Downtown",
        stats: {}
      },
      "Sally": {
        location: "Grocery Store",
        stats: {}
      },
      "John": {
        location: "Park",
        stats: {}
      },
      "Tim": {
        location: "Park",
        stats: {}
      },
      "Sarah": {
        location: "Downtown",
        stats: {}
      }
    },
    inventory: {
      "Ice": 48,
      "Water": 48,
      "Lemon": 100,
      "Cup": 50
    },
    money: -5000,
    locations: {
      "Home": {
        elementInstances: {}
      },
      "Grocery Store": {
        inventory: {},
        elementInstances: {
          1: { x: -1, y: -3, collection: "Buildings", element: "Grocery Store", level: 1 }
        }
      },
      "Park": { inventory: {}, elementInstances: {} },
      "Downtown": { inventory: {}, elementInstances: {} },
      "Shopping Mall": { inventory: {}, elementInstances: {} },
      "Stadium": { inventory: {}, elementInstances: {} },
      "Beach": { inventory: {}, elementInstances: {} }
    }
  }
};
