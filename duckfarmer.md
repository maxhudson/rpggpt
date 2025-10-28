#### Duck Farmer

{
  title: "Duck Farmer",
  story: "Your grandfather is retiring and has left you his duck farm, including a substantial debt of $100,000. Your goal is to pay off the debt and eventually hire someone to run the farm. The farm needs repairs",
  date: "2025-01-01",
  quests: [
    "Catch more ducks",
    "Dredge the duck pond", lastDone: "2023-10-01",
    "Pay off the debt",
    "Hire a farmhand",
  ],
  elementTypes: {
    buildings: {},
    plants: {

    },
    items: {
      'Egg': {value: 5},
    }
  },
  actions: {
    'Feed Ducks', notes: "Last fed <current date>",
    'Catch Wild Ducks',
    'Train Wild Duck',
    'Dredge Pond',
    'Repair Building',
    'Sell'
    'Buy',
    'Build', "What would you like to build?"
    'Craft',
    'Harvest',
    'Water',
  },
  instructions: [
    '
    'Ducks lay 1 egg per day if fed at some point during the day. ',
  ],
  npcs: {
    'Duck': {
      instruction notes: "Last fed 2023-10-01",
    }
  }
}
