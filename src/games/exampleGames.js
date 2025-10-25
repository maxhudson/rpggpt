// Example game definitions using the new Game format

// export const lemonadeStand = {
//   title: "Lemonade Stand",
//   description: "Your friend is tired of selling lemonade and wants to get into the hot dog business, so he's giving you his lemonade cart. You need to pay off your student loan debt and no one is hiring so you decide to try it out.",
//   story: "The morning sun filters through your apartment window as you stare at the mountain of paperwork on your coffee table. Student loan statements, job rejection letters, and now—a rusty lemonade cart key your friend Mike dropped off last night.\n\n\"I'm done with it, man,\" he'd said, tossing you the key. \"Hot dogs are where the money's at. The cart's yours if you want it.\"\n\nYou turn the key over in your palm. $5,000 in debt. No callbacks from any of the hundreds of applications you've sent. The cart sits outside your apartment building, a faded yellow beacon of... possibility? Desperation? Maybe both.\n\nYou check your supplies: lemons, ice, water, and cups. But no sugar—Mike must have used the last of it. At least you have $45,000 in debt to motivate you. Wait, that's not how motivation works.\n\nThe clock reads 7:00 AM on Day 1. The city is waking up, and you need to decide your first move.",

//   money: -5000,
//   currentLocation: "Home",
//   weather: { condition: "sunny", high: 75, low: 55 },
//   clock: { day: 1, time: [7, 0, "am"] },
//   dayStartTime: [7, 0, "am"],
//   dayEndTime: [7, 0, "pm"],

//   locations: {
//     "Home": { notes: "Your apartment. Free. No customers." },
//     "Grocery Store": { notes: "45 mins north of home. Free. Buy ingredients here, no selling." },
//     "Park": { notes: "30 mins north of home. $35/day. 3-4 customers/hr. Only location accessible without a car." },
//     "Downtown": { notes: "45 mins north of home. $75/day. 8-10 customers/hr. Peak: 12pm-2pm, 5pm-7pm. Requires car." },
//     "Shopping Mall": { notes: "55 mins north of home. $100/day. 10-12 customers/hr. Consistent traffic. Requires car." },
//     "Stadium": { notes: "60 mins north of home. $150/day. 15-20 customers/hr during events (weekends), 0-1 otherwise. Requires car." },
//     "Beach": { notes: "75 mins north of home. $120/day. 12-15 customers/hr. Weather dependent. Highest rates and sales. Requires car." }
//   },

//   items: {
//     "Serving of Ice": { cost: { unit: "Bag", quantity: 32, money: 3 }, inventory: 48 },
//     "Serving of Sugar": { cost: { unit: "Bag", quantity: 10, money: 4 }, inventory: 0 },
//     "Serving of Water": { cost: { unit: "Gallon", quantity: 6, money: 2 }, inventory: 48 },
//     "Lemon": { cost: { money: 2 }, inventory: 100 },
//     "Cup": { cost: { unit: "Pack", quantity: 50, money: 5 }, inventory: 50 },
//     "Lemonade": { cost: { money: 0, timeInMinutes: 3, Lemons: 2, Ice: 1, Sugar: 1, Water: 1, Cup: 1 }, value: 5 },
//     "Strawberry": { cost: { unit: "Pint", quantity: 12, money: 6 }, value: 2, notes: "LOCKED - Help Mike with lunch rush to unlock this recipe" },
//     "Strawberry Lemonade": { cost: { money: 0, timeInMinutes: 4, Lemons: 2, Ice: 1, Sugar: 1, Water: 1, Strawberry: 2, Cup: 1 }, value: 8, notes: "LOCKED - Help Mike deliver hot dogs to unlock this recipe" },
//     "Mint Leaf": { cost: { unit: "Bunch", quantity: 8, money: 4 }, value: 1, notes: "LOCKED - Help Mike prep ingredients to unlock this recipe" },
//     "Mint Lemonade": { cost: { money: 0, timeInMinutes: 4, Lemons: 2, Ice: 1, Sugar: 1, Water: 1, "Mint Leaf": 3, Cup: 1 }, value: 6, notes: "LOCKED - Help Mike prep ingredients to unlock this recipe" },
//     "Serving of Ginger": { cost: { unit: "Pound", quantity: 3, money: 5 }, notes: "LOCKED - Help Mike manage the truck register to unlock this recipe" },
//     "Ginger Lemonade": { cost: { money: 0, timeInMinutes: 5, Lemons: 2, Ice: 1, Sugar: 2, Water: 1, "Serving of Ginger": 1, Cup: 1 }, value: 7, notes: "LOCKED - Help Mike manage the truck register to unlock this recipe" },
//     "Cucumber": { cost: { money: 2 }, notes: "LOCKED - Help Mike clean and restock the truck to unlock this recipe" },
//     "Cucumber Mint Lemonade": { cost: { money: 0, timeInMinutes: 6, Lemons: 2, Ice: 1, Sugar: 1, Water: 1, Cucumber: 2, Mint: 2, Cup: 1 }, value: 9, notes: "LOCKED - Help Mike clean and restock the truck to unlock this recipe" },
//     "Tea Bag": { cost: { unit: "Box", quantity: 50, money: 5 }, notes: "LOCKED - Help Mike with lunch rush to unlock this recipe" },
//     "Arnold Palmer": { cost: { money: 0, timeInMinutes: 6, Lemons: 1, Ice: 1, Sugar: 1, Water: 2, "Tea Bag": 1, Cup: 1 }, value: 8, notes: "LOCKED - Help Mike with lunch rush to unlock this recipe" },
//     "Car": { cost: { money: 5000 }, value: 2500, notes: "A used car that allows you to set up at farther locations (Downtown, Shopping Mall, Stadium, Beach)." },
//     "Acre of Land": { cost: { money: 50000 }, value: 50000, notes: "A piece of land you can plant crops on near town." }
//   },

//   roles: {
//     "Customer": { notes: "A customer who buys lemonade.", type: "customer" },
//     "Vendor": { notes: "A vendor who supplies ingredients.", type: "employee" },
//     "Shopper": { notes: "A shopper who brings ingredients.", type: "employee" },
//     "Sign Carrier": { notes: "A person who carries a sign to attract customers.", type: "employee" },
//     "Farmer": { notes: "A farmer who grows ingredients.", type: "employee" },
//     "Grocery Store Owner": { notes: "The owner of the grocery store where you buy ingredients.", type: "seller" }
//   },

//   actions: {
//     "Buy": { notes: "Buy ingredients - can only be done from the grocery store. Don't let player buy more than they have money for." },
//     "Sell": { notes: "Sell inventory to customers - can't be displayed as an availableAction - sales happen organically over time." },
//     "Craft": { notes: "Craft ingredients into recipes - should take timeInMinutes * quantity time. Can't craft until renting. Don't let player craft more than they have inventory for." },
//     "Travel": { notes: "Change locations" },
//     "Pass Time": { notes: "Pass a specified amount of time, typically to allow sales to happen. Offer option to work the rest of the day once it becomes 10am." },
//     "Rent": { notes: "Rent a location for the day. Can't sell or craft at a location until you've paid the daily fee." },
//     "Hire": { notes: "Converts role into employee and has hourly cost." }
//   },

//   characters: {
//     "Sally": { role: "Grocery Store Owner", location: "Grocery" },
//     "John": { role: "Customer" },
//     "Tim": { role: "Shopper" },
//     "Sarah": { role: "Sign Carrier", notes: "+1 customer per hour" }
//   },

//   quests: {
//     "First Day": { notes: "Buy sugar and craft your first lemonade" },
//     "Make a Sale": { notes: "Sell lemonade at the Park" },
//     "Help Mike - Deliveries": { notes: "Help Mike deliver hot dogs. Reward: Strawberry Lemonade recipe" },
//     "Help Mike - Prep Work": { notes: "Help Mike prep ingredients. Reward: Mint Lemonade recipe" },
//     "Help Mike - Register": { notes: "Help Mike manage the truck register. Reward: Ginger Lemonade recipe" },
//     "Help Mike - Cleaning": { notes: "Help Mike clean and restock the truck. Reward: Cucumber Mint Lemonade recipe" },
//     "Help Mike - Lunch Rush": { notes: "Help Mike during lunch rush. Reward: Arnold Palmer recipe" }
//   },

//   availableActions: [
//     { type: "Travel", options: [
//       { label: "Grocery Store", costs: { minutes: 45 } },
//       { label: "Park", costs: { minutes: 30 } }
//     ]}
//   ],

//   gameOverConditions: [
//     "Money drops below -$50,000 (bankruptcy)"
//   ]
// };

// export const farmToTable = {
//   title: "Farmbnb",
//   description: "Turn an empty property into an operating farm, restaurant, and hotel.",
//   plot: [

//   ],
//   clock: { day: 1, time: [6, 0, "am"] },
//   currentLocation: "Farm",
//   money: 100000,
//   story: "Your boots pick up dew off the grass as you step out of your car by the side of the road.\n\nThere's nothing here yet—not even a driveway—nothing but potential.\n\nWhere to start first—planting or building?",

//   locations: {
//     "Farm": {
//       plants: {
//         1: { type: "Oak Tree", position: { x: 0, y: 0 } },
//       }
//     },
//     "Store": {}
//   },

//   actions: {
//     "Travel": {},
//     "Build": {},
//     "Plant": {notes: "Don't let player plant more than they have inventory for"},
//     "Harvest": {},
//     "Craft": {notes: "Don't let player craft more than they have inventory for"},
//     "Hire": {},
//     "Buy": {}
//   },

//   items: {
//     "Wildflower Seeds": {"inventory": 100, "notes": "Plant these to attract bees and other pollinators."},
//     "Corn Seeds": {},
//     "Comfrey Seeds": { cost: { unit: "Bag", quantity: 32, money: 5 }},

//     "Head of Corn": {},
//     "Head of Lettuce": {},
//     "Tomato": {},
//     "Carrot": {},
//     "Onion": {},
//     "Tortilla": { notes: "Crafted from corn" },
//     "Breakfast Burrito": {},
//     "Chile Relleno": {},
//     "Eggs, Sausage, Potatoes": {},
//     "Pancakes": {},
//     "Waffles": {},
//   },

//   tools: {

//   },

//   buildings: {
//     "Small Shed": {"notes": "Can be built anytime - "},
//     "Yurt": {"notes": "Can be built anytime"},
//     "Outhouse": {"notes": ""},
//     "House": {},
//     "Workshop": {},
//     "Greenhouse": {},
//     "Restaurant": {},
//     "Fenced Garden": {},
//     "Farm Stand": {},
//     "Chicken Coop": {},
//     "Barn": {},
//     "Grain Mill": {},
//     "Sawmill": {},
//   },

//   animals: {
//     "Chicken": {},
//     "Cow": {},
//     "Pig": {},
//     "Sheep": {},
//     "Goat": {},
//     "Horse": {},
//     "Alpaca": {},
//     "Duck": {},
//     "Bee": {},

//   },

//   plants: {
//     "Oak Tree": { },
//     "Fir Tree": {},
//     "Comfrey": { notes: "Nitrogen fixer" },
//     "Corn": {}
//   },

//   availableActions: [
//     {type: "Build", options: [
//       {label: "Small Shed", costs: {money: 5000}, timeInMinutes: 60},
//       {label: "Yurt", costs: {money: 10000}, timeInMinutes: 120},
//     ]},
//     {type: "Plant", options: [
//       {label: "Wildflower Seeds"},
//     ]},
//     {type: "Travel", label: "Go to the Store"}
//   ]
// };

// export const fantasy = {
//   title: "The Mountain Hums",
//   description: "Paths intertwine to save the kingdom",
//   plot: [
//     "A stolen sword and a poisoned wing. Three siblings, one turned dark.",
//     "Kira activates her sword for the first time - she considers looking for her trainer to tell him but he's nowhere to be found if she decides to look.",
//     "After Kira wakes up the next day her sword is missing. If player tries not to go to sleep, at some point only the sleep option should be shown.",

//     "Kira and Casseus grew up without knowledge of each other but their paths are brought together when their mysteries coincide.",
//     "Their brother Damen wants to challenge them for the throne of the kingdom, which technically Casseus is first in line for.",
//     "Their fight comes half way through the story. The fight cannot be talked out of. The dragon is also difficult to heal and requires a side quest in order to do that (need to find someone in the village who can produce a potion).",
//     "The three have to team up in the end when the warlord returns to the kingdom.",
//   ],
//   story: "Chapter 1: The Sword of Embers\n\nKira stood in the castle courtyard, the sunset casting long red shadows across gray cobblestones. She held her mother's sword in her hands. It was a relic of power, but it had never responded to her touch. Today, however, something felt different. As she began to hum a tune her mother used to sing, the sword vibrated softly, sending a shiver through her bones.\n\n\"What is this?\" she whispered, eyes wide with wonder. The sword had never done this before.",

//   clock: { day: 1, time: [8, 0, "pm"] },
//   currentLocation: "Castle",

//   locations: {
//     "Castle": {},
//     "Mountain": { notes: "Can only travel here once you've met Casseus. A hint in the village where Casseus and Kira meet leads to the mountains."},
//     "Village": { notes: "A seamstress in the village can help Kira identify a thread she finds when investigating."},
//     "Hidden Cave": { notes: "Easy to miss - up to player to say they want to investigate. Do not mention this location or give this away - this is supposed to be difficult but possible to notice mid-way through the story. " }
//   },

//   actions: {
//     "Travel": { notes: "Travel to a different location." },
//     "Hum": { level: 1 }, //mini game balance/harmonize - improves general luck & magical ability
//     "Fight": { level: 1 }, //mini game combat - accuracy of click
//     "Talk": {}, //have to enter your own text
//     "Investigate": {},
//     "Hunt": {},
//     "Craft": { notes: "", level: 1},
//     "Sleep": { notes: "Sleep shouldn't list out a cost in time even though sleeping jumps to the next day."},
//     "Trade": { notes: ""},
//     "Use": { notes: "Use an item from your inventory." }
//   },

//   items: {
//     "The Sword of Embers": { inventory: 1, oneOfAKind: true },
//     "Short Sword": { notes: "Generic short sword" },
//     "Flash Powder": { notes: "A powder that can be used to blind enemies temporarily." },
//     "Herb Tea": { notes: "A healing tea made from local herbs. Requires crafting level 2" },
//     "Herb Leaf": { notes: "A leaf that can be used to make herb tea." },
//     "The Shield of Perocles": { oneOfAKind: true, notes: "A legendary shield that can block any attack. Can only be found in the Hidden Cave." },
//     "The Tooth of Amara": { oneOfAKind: true, notes: "Can only..." }
//   },

//   stats: {
//     "Health": {},
//     "Energy": {}
//   },

//   characters: {
//     "Kira": { notes: "Lives in a castle. Has never successfully activated her mother's sword but one day she starts to hum and the sword vibrates her bones harmonically. It has a backstory of having burned an entire city by a warlord, who her mom initially took the sword from." },
//     "Lana": { notes: "Kira's cat"},
//     "Casseus": { notes: "Kira's brother raised in the mountains."},
//     "Damen": { notes: "The dark brother who has stolen Kira's sword. A spy in the castle who it turns out was watching her when she hums at the beginning of the story. Assistant to the king. Absolutely do not give Damen away until Kira, Casseus, and Damen all meet in person. Mention him and other secondary characters early on in the story in a natural way when possible." },
//     "Warlord": { notes: "A mysterious figure who has a history with Kira's family." },
//     "Herra": { notes: "A dragon that Casseus has befriended. Can be used to travel quickly when wing is healthy." },
//     "Rich": { notes: "Father of Kira and Damen. Has a history with the warlord, who is actually the father of Damen." },

//     "Captain Thorne": { notes: "The grizzled head of the guard, who has seen many battles." },
//     "Maya": { notes: "A young servant who has worked in the castle for years and knows its secrets." },
//     "Aldric": { notes: "A visiting merchant who often brings news from distant lands." },
//     "Theo": { notes: "Her trainer, a seasoned warrior who has taught her the ways of combat." },
//   },

//   quests: {
//     "Find the Sword of Embers": { notes: "Kira's quest to find her mother's sword." },
//     "Discover Casseus' Past": { notes: "Casseus' quest to uncover his family's history." },
//     "Defeat Damen": { notes: "The siblings must unite to defeat their brother Damen." },
//     "Heal Herra's Wing": { notes: "Find a way to heal Herra's poisoned wing." },
//     "Uncover the Warlord's Plan": { notes: "Discover the warlord's intentions." }
//   },

//   availableActions: [
//     { type: "Hum" },
//     { type: "Sleep" },
//     { type: "Travel", label: "Tell Trainer Theo"}
//   ],

//   gameOverConditions: [
//     "Health reaches 0",
//     "Damen wins the throne (sword not recovered in time)"
//   ]
// };

// export const theGuardian = {
//   title: "The Guardian",
//   clock: { day: 1, time: [9, 0, "am"] },
//   currentLocation: "Home"
// };

// export const cityBuilder = {
//   title: "Village Builder",
//   description: "You and a band of travellers don't think you can make it to California so you decide to settle in the middle of nowhere.",
//   clock: { day: 1, time: [8, 0, "am"] },
//   currentLocation: "",
//   money: 100000000,
//   locations: {
//     "": { notes: "" },
//   },
//   buildings: {

//   },
// };

// export const artisticAnime = {

// };

// gta


//inspirations - skyrim, spirits, - no memory? - paint, spirit farer - looking for someone - without the memories, a test
//helping people pass through the canyon

export const safePassage = {
  plot: [
    'Player wakes up in an empty field',
    'Find first ingredient '
  ],
  locations: {
    "The Field": {},
    // "The Canyon": {},
    // "The Gate": {},
    // "The Tower": {},
    // "The Bridge": {}
  },
  spells: {
    // "Clarity": {notes: ""},
    // "Equinimity": {notes: ""},
    // "Spaciousness": {},


    //unlock your specialty first
    //water

    //fire
    //plant
  },
  actions: {
    "Sit": {notes: "Can be used to pass time"},
    "Pick Flowers": {notes: ""},
    // "Travel": {},
    // "Cast": {notes: ""} //multiple specialties available
    //magic Paint brush
  },
  items: {
    // "White Robe": {oneOfAKind: true}, //white, gray, and black

    "The Brush": {oneOfAKind: true, notes: ""},

    //spells require items to learn
  },
  characters: {
    //different places around the world - Paris, Tehran, Tokyo, New York
  },
  story: `Nameless eyes open slowly.

A field stretching beyond the horizon comes into focus.

Gentle winds push clouds across the sky calmly. Birds fly quietly overhead.

Time passes slowly, hardly at all.

Your vision is clear, but not your memory.

Nowhere to go-not in time or in place.`,
  availableActions: [
    {type: 'Sit'},
    {type: 'Pick Flowers'}
  ]
};


export const perma = {
  title: "The Culturist", //permaculture, syntropy, symbiosis, regenerative ag
  description: "",
  currentLocation: "The Farm",
  clock: { day: 1, time: [8, 0, "am"] },
  money: 100000,
  story: "",
  locations: {
    "The Farm": {
      walkingBottomOffset: 15,
      elementBottomOffset: 30,
      backgroundLayers: [
        {color: '#8b9567', height: 39, bottom: 0, addNoise: true},
        {color: '#6f7653ff', height: 1, bottom: 39 },
        {color: "#b9ae7fff", height: 8, bottom: 14, opacity: 0.6 },
        {color: '#cdc899ff', height: 1, bottom: 22},
        {color: '#777f5bff', height: 1, bottom: 14 },
      ],
      elements: [
        {type: "Oak Tree", x: 0},
        {type: "Cabin", x: 350}
      ]
    }
  },
  plants: {

  },
  buildings: {

  },
  characters: {

  },
};

// Export all games as a collection
export const allGames = {
  safePassage,
  perma
  // lemonadeStand,
  // farmToTable,
  // fantasy,
  // theGuardian,
  // cityBuilder
};
