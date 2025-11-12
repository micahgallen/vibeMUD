vibeMUD - Design Summary

  Core Philosophy

  "Everything is an Object" - LPmud-inspired MUD engine for "The Wumpy and Grift" with:
  - Definitions (.js): Behavior/functions - reusable templates
  - Instances (.json): Data only - specific objects in world
  - Prototypal inheritance: Instances inherit from definitions
  - Data-driven: Configuration over code

  Directory Structure

  mud/
  ├── src/
  │   ├── core/                   # Engine
  │   │   ├── server.js           # Main loop
  │   │   ├── EntityManager.js    # Object lifecycle, heartbeats
  │   │   ├── Session.js          # Player connections
  │   │   └── colors.js           # ANSI colors
  │   │
  │   ├── lib/                    # Object Definitions (behavior)
  │   │   ├── monster.js          # Base monster
  │   │   ├── weapon.js
  │   │   ├── torch.js
  │   │   ├── room.js
  │   │   └── shop.js
  │   │
  │   ├── commands/               # Command Definitions
  │   │   ├── look.js             # Metadata + execute()
  │   │   ├── get.js
  │   │   └── north.js
  │   │
  │   ├── systems/                # Game-Wide Rules
  │   │   ├── combat.js           # Combat mechanics
  │   │   ├── magic.js            # Magic rules
  │   │   ├── economy.js          # Currency/trading
  │   │   └── guilds/
  │   │       ├── warriors/
  │   │       │   ├── guild.js
  │   │       │   └── abilities/
  │   │       └── mages/
  │   │           ├── guild.js
  │   │           └── spells/
  │   │
  │   ├── spells/                 # Universal Spells
  │   │   ├── fireball.js
  │   │   └── heal.js
  │   │
  │   ├── world/                  # Game World (instances)
  │   │   ├── newbie_realm/
  │   │   │   ├── rooms/
  │   │   │   ├── npcs/
  │   │   │   ├── items/
  │   │   │   └── spawners/
  │   │   ├── shadowfen/
  │   │   └── dragon_peaks/
  │   │
  │   ├── data/                   # Runtime Save Data
  │   │   └── players/
  │   │
  │   └── utils/
  │
  ├── docs/
  │   └── SYSTEM_DESIGN.md
  ├── tests/
  └── package.json

  Key Patterns

  Definitions vs Instances

  Definition (src/lib/monster.js)
  module.exports = {
    type: "npc",
    hp: 10,
    maxHp: 10,

    heartbeat: function(entityManager) {
      if (!this.wanders) return;
      // Wandering logic using 'this' for instance data
    }
  };

  Instance (src/world/shadowfen/npcs/rat_001.json)
  {
    "id": "rat_001",
    "definition": "monster",
    "name": "a scurrying rat",
    "currentRoom": "swamp_entrance",
    "wanders": true,
    "heartbeatInterval": 15
  }

  Loading Process

  loadObject(file) {
    const data = JSON.parse(fs.readFileSync(file));

    if (data.definition) {
      const def = require(`./lib/${data.definition}.js`);
      const obj = Object.create(def);      // Prototype chain
      Object.assign(obj, data);            // Merge instance data
      return obj;
    }

    return data;
  }

  Saving Process

  saveObject(obj) {
    const dataOnly = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val !== 'function') {
        dataOnly[key] = val;               // Skip functions
      }
    }
    fs.writeFileSync(file, JSON.stringify(dataOnly, null, 2));
  }

  Core Systems

  EntityManager (src/core/EntityManager.js)

  class EntityManager {
    objects = new Map();           // All game objects
    dirtyObjects = new Set();      // Need saving
    heartbeats = new Map();        // Active heartbeats
    sessions = new Map();          // Player connections

    // Object lifecycle
    loadAll()
    get(id)
    register(obj)
    move(objectId, newLocation)    // Universal move

    // Heartbeats
    tick()
    enableHeartbeat(id, interval)
    initializeHeartbeats()

    // Notifications
    notifyPlayer(playerId, msg)
    notifyRoom(roomId, msg)

    // Persistence
    markDirty(id)
    saveDirty()
  }

  Heartbeat System

  Main loop (1 second ticks)
  setInterval(() => {
    entityManager.tick();
  }, 1000);

  Per-object intervals
  tick() {
    for (const [id, hb] of this.heartbeats) {
      if (now - hb.lastTick >= hb.interval * 1000) {
        const obj = this.get(id);

        // Check for custom heartbeat function
        if (obj.heartbeat && typeof obj.heartbeat === 'function') {
          obj.heartbeat(this);
        }

        hb.lastTick = now;
      }
    }
  }

  Commands (src/commands/look.js)

  module.exports = {
    name: "look",
    aliases: ["l"],
    category: "basic",
    description: "Look at surroundings",
    requiresLogin: true,

    execute: function(session, args, entityManager, colors) {
      const player = session.player;
      const room = entityManager.get(player.currentRoom);

      session.sendLine(colors.cyan + room.name + colors.reset);
      session.sendLine(room.description);
    }
  };

  Systems (src/systems/magic.js)

  module.exports = {
    manaRegenerationRate: 1,

    castSpell: function(caster, spellName, target, entityManager) {
      const spell = this.getSpell(spellName);
      const power = this.calculateSpellPower(caster, spell);
      return spell.cast(caster, target, entityManager, power);
    },

    calculateSpellPower: function(caster, spell) {
      let power = 1.0;
      power += (caster.intelligence - 10) * 0.05;

      const room = entityManager.get(caster.currentRoom);
      if (room.leyLine) power *= 1.5;

      return power;
    }
  };

  Guilds (src/systems/guilds/mages/guild.js)

  module.exports = {
    id: "mages_guild",
    name: "Circle of the Arcane",

    requirements: { level: 5, intelligence: 15 },

    spells: ["fireball", "heal", "arcane_missile"],

    canLearn: function(player, spellName) {
      return this.spells.includes(spellName) &&
             player.level >= this.getSpell(spellName).requiredLevel;
    },

    getSpell: function(spellName) {
      try {
        return require(`../../spells/${spellName}.js`);
      } catch {
        return require(`./spells/${spellName}.js`);
      }
    }
  };

  Hierarchy

  CORE (infrastructure)
    ↓
  SYSTEMS (game rules)
    ↓
  LIB (object behaviors)
    ↓
  WORLD (instances)

  Example:
  - systems/economy.js: "Gold = 10 silver, 5% tax"
  - lib/shop.js: "I can buy/sell using economy system"
  - world/tavern_shop.json: "I'm Bob's shop, swords = 100gp"

  Object Location System

  All objects have location field:

  // In inventory
  { "type": "inventory", "owner": "player_id" }

  // In container
  { "type": "container", "owner": "chest_001" }

  // In room
  { "type": "room", "room": "tavern" }

  Universal move() handles all location changes:
  1. Remove from old location
  2. Update location field
  3. Add to new location
  4. Mark dirty

  Development Workflow

  Add new monster:
  1. Create JSON in src/world/[realm]/npcs/
  2. Set "definition": "monster"
  3. Configure HP, spells, wanders flag

  Add new spell:
  1. Universal: src/spells/fireball.js
  2. Guild-specific: src/systems/guilds/mages/spells/arcane_missile.js
  3. Include cast() function

  Add new realm:
  1. Create src/world/new_realm/
  2. Add rooms/, npcs/, items/
  3. Connect via room exits

  Key Features

  - Single source of truth: One move() for all location changes
  - Dirty tracking: Only save what changed
  - Heartbeats: Time-based events per object
  - Sessions: Real-time player notifications
  - Validation: Check world consistency
  - Auto-save: Every 60 seconds
  - Modular: Systems are independent
  - AI-friendly: Easy JSON instance creation