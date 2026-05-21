const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const clans = [
  "Stag",
  "Goat",
  "Wolf",
  "Raven",
  "Bear",
  "Boar",
  "Snake",
  "Dragon",
  "Horse",
  "Kraken",
  "Ox",
  "Lynx",
  "Squirrel",
  "Rat",
  "Eagle",
  "Lion",
  "Stoat",
  "Owl",
  "Hound",
  "Turtle",
  "Hippogriff"
];

function makeStarterBuild(clan) {
  return {
    name: `${clan} Starter Build`,
    clan,
    steps: [
      "# 800",
      "[Scout] Scout nearby food, ruins, shipwrecks, and safe expansion tiles",
      "[Eco] Build Woodcutter's Lodge early and keep villagers assigned to wood",
      "[Food] Secure your first food source before winter",
      "[Build] Build houses before reaching population cap",
      "[Lore] Choose an early economy lore that supports your clan plan",
      "[Goal] Enter first winter with stable food, wood, and scouting information",

      "# 800 Winter",
      "[Warning] Avoid over-colonizing during winter unless your economy is safe",
      "[Eco] Keep wood income stable for houses and early buildings",
      "[Defense] Watch for wolves or early enemy pressure near your borders",
      "[Goal] Survive winter without crashing food or happiness",

      "# 801",
      "[Colonize] Expand toward food, lore, stone, iron, or strategic choke points",
      "[Build] Add the clan's key economy or military support buildings",
      "[Lore] Continue toward your main clan-specific lore path",
      "[Military] Train only what you need to defend or clear nearby threats",
      "[Upgrade] Mine stone or iron when your economy can support it",
      "[Goal] Stabilize economy and prepare your mid-game plan",

      "# 801 Winter",
      "[Warning] Do not spend too much food before winter unless you are safe",
      "[Defense] Keep enough military or towers to survive pressure",
      "[Eco] Fix happiness, food, or wood problems before expanding again",
      "[Goal] Exit winter ready to scale",

      "# 802",
      "[Upgrade] Upgrade important economy buildings or military tools",
      "[Military] Commit toward your chosen military path",
      "[Lore] Pick lore that supports your win condition",
      "[Build] Add production, defense, trade, or relic support as needed",
      "[Goal] Transition into your main game plan",

      "# 803",
      "[Military] Build enough army to defend, pressure, or support teammates",
      "[Trade] Add krowns/trade if the game is going long",
      "[Goal] Push your win condition or prepare for a decisive fight",

      "# 804",
      "[Goal] Execute the final plan: domination, fame, trade, lore, or team support",
      "[Warning] Replace this starter template with a real optimized clan build later"
    ],
    loreOrder: [],
    loreMode: "json",
    militaryPath: "",
    situationalTags: ["Starter", "Template", "Beginner"],
    username: "The Longhouse",
    userID: "system-seed",
    upvotes: [],
    schemaVersion: 2,
    isStarterBuild: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

async function seedStarterBuilds() {
  const batch = db.batch();

  clans.forEach((clan) => {
    const docId = `starter-${clan.toLowerCase().replace(/\s+/g, "-")}`;
    const ref = db.collection("builds").doc(docId);

    batch.set(ref, makeStarterBuild(clan), {
      merge: true
    });
  });

  await batch.commit();

  console.log(`Seeded ${clans.length} starter builds successfully.`);
}

seedStarterBuilds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });