# vibeMUD Engine

**LPmud-inspired MUD server for "The Wumpy and Grift"**

A fully functional text-based multiplayer game server built on the "Simple Object Architecture" principle.

## Core Philosophy

```
Everything is an Object
Every object has an ID
One manager tracks them all
One move() function handles all location changes
```

**Key Concepts**:
- **Definitions** (.js files): Behavior and functions - reusable templates
- **Instances** (.json files): Data only - specific objects in the world
- **Prototypal inheritance**: Instances inherit from definitions
- **Data-driven**: Configuration over code

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the MUD server
npm start

# In another terminal, connect
telnet localhost 4000

# Or use a MUD client (TinTin++, MUSHclient, etc.)
```

Create a character and explore! The server runs on port 4000.

---

## Directory Structure

```
src/
├── core/                   # Engine Infrastructure
│   ├── server.js           # Main server loop
│   ├── EntityManager.js    # Object lifecycle, heartbeats
│   ├── Session.js          # Player connections
│   ├── NetworkDriver.js    # Telnet protocol
│   ├── CommandDispatcher.js # Command routing
│   ├── LoginHandler.js     # Authentication
│   └── colors.js           # ANSI color utilities
│
├── lib/                    # Object Definitions (19 total)
│   ├── monster.js          # Base monster template
│   ├── torch.js            # Torch with burning heartbeat
│   ├── room.js, healing_room.js, hot_tub_room.js
│   ├── item.js, weapon.js, armor.js, consumable.js
│   ├── coin.js, corpse.js, emote.js, signs.js
│   ├── shop.js, bank.js
│   ├── booth_portal.js, elevator_portal.js, haunted_elevator.js
│   └── hot_tub.js
│
├── commands/               # Command Definitions (59 total)
│   ├── look.js, get.js, drop.js, inventory.js
│   ├── north.js, south.js, east.js, west.js, up.js, down.js
│   ├── open.js, close.js, put.js, examine.js
│   ├── attack.js, cast.js, flee.js, kill.js
│   ├── buy.js, sell.js, list.js, value.js
│   ├── wear.js, wield.js, equipment.js
│   ├── eat.js, drink.js, loot.js
│   ├── deposit.js, withdraw.js, balance.js, coins.js
│   ├── say.js, chat.js, emote.js
│   ├── help.js, who.js, save.js, quit.js
│   └── ... (see src/commands/ for full list)
│
│── emotes/                 # Emote Definitions (43 total)
│   ├── applaud.json, bow.json, cheer.json
│   ├── dance.json, laugh.json, smile.json
│   └── ... (see src/emotes/ for full list)
│
├── systems/                # Game-Wide Rules (11 implemented)
│   ├── combat.js           # Combat mechanics
│   ├── magic.js            # Magic system
│   ├── mana.js             # Mana management
│   ├── leveling.js         # XP and progression
│   ├── loot.js             # Loot generation
│   ├── currency.js         # Currency system
│   ├── weight.js           # Encumbrance
│   ├── resistances.js      # Damage resistances
│   ├── movement.js         # Movement mechanics
│   ├── descriptions.js     # Dynamic descriptions
│   └── colorization.js     # Text colorization
│
├── spells/                 # Universal Spells
│
├── world/                  # Game World (5 realms)
│   ├── newbie_realm/       # Tutorial area
│   │   ├── rooms/, npcs/, items/, containers/
│   ├── sesame_street/      # Sesame Street themed
│   │   ├── rooms/, npcs/, items/
│   ├── reality_street/     # Reality-themed area
│   │   ├── rooms/, npcs/
│   ├── hill_valley/        # Back to the Future
│   │   ├── 1885/, 1955/, 1985/, 1985alt/, 2015/
│   └── shared/             # Shared rooms
│
├── data/                   # Runtime Save Data
│   └── players/            # Player save files (ONLY)
│
├── utils/
│   └── password.js         # SHA-256 password hashing
│
├── banner.js               # Welcome screen
└── colors.js               # Color system

docs/                       # Documentation
├── SYSTEM_DESIGN.md        # Detailed architecture docs
└── design_quick.md         # Quick reference guide

utils/                      # Utilities and tests
├── tests/                  # Test and validation scripts
└── migrate_inventories.js  # Migration utilities

package.json
```

---

## How It Works

### Definitions vs Instances

**Definition** (`src/lib/monster.js`) - Behavior template:
```javascript
module.exports = {
  type: "npc",
  hp: 10,
  maxHp: 10,

  heartbeat: function(entityManager) {
    if (!this.wanders) return;
    // Wandering AI logic using 'this' for instance data
  }
};
```

**Instance** (`src/world/newbie_realm/npcs/rat_001.json`) - Data only:
```json
{
  "id": "rat_001",
  "definition": "monster",
  "name": "a scurrying rat",
  "currentRoom": "test_room",
  "wanders": true,
  "heartbeatInterval": 15
}
```

The instance inherits the `heartbeat()` function from the monster definition via prototypal inheritance.

### Loading Process

```javascript
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
```

### Saving Process

```javascript
saveObject(obj) {
  const dataOnly = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val !== 'function') {
      dataOnly[key] = val;               // Skip functions
    }
  }
  fs.writeFileSync(file, JSON.stringify(dataOnly, null, 2));
}
```

**Important**: Only players are saved at runtime. World content (rooms, NPCs, items) is loaded from `src/world/` as static content.

---

## Core Systems

### EntityManager

The heart of the engine:

```javascript
class EntityManager {
  objects = new Map();           // All game objects
  dirtyObjects = new Set();      // Need saving
  heartbeats = new Map();        // Active heartbeats
  sessions = new Map();          // Player connections

  // Object lifecycle
  loadAll()                      // Load all objects from disk
  get(id)                        // Retrieve any object by ID
  register(obj)                  // Add new object
  move(objectId, newLocation)    // Universal move function

  // Heartbeats
  tick()                         // Execute heartbeats
  enableHeartbeat(id, interval)  // Register heartbeat
  initializeHeartbeats()         // Start all heartbeats

  // Notifications
  notifyPlayer(playerId, msg)    // Send message to player
  notifyRoom(roomId, msg, exclude) // Notify room occupants

  // Persistence
  markDirty(id)                  // Mark for saving
  saveDirty()                    // Save modified objects
  validate()                     // Check consistency
}
```

### The move() Function

**The key to preventing item duplication bugs:**

```javascript
// Move anything anywhere with ONE function
entityManager.move(objectId, newLocation);

// Examples:
entityManager.move('sword_001', {
  type: 'container',
  owner: 'chest_001'
});

entityManager.move('gem_001', {
  type: 'inventory',
  owner: 'alice'
});

entityManager.move('potion_001', {
  type: 'room',
  room: 'test_room'
});
```

**Automatically handles**:
1. Remove from old location
2. Update location field
3. Add to new location
4. Update parent inventories
5. Mark affected objects dirty

**No duplication possible.**

### Object Location System

All objects use a unified location descriptor:

```javascript
// In player/NPC inventory
{ "type": "inventory", "owner": "player_id" }

// In a container
{ "type": "container", "owner": "chest_001" }

// On the floor in a room
{ "type": "room", "room": "tavern" }
```

### Heartbeat System

Time-based events execute per-object at configurable intervals:

```javascript
// Main loop (1 second ticks)
setInterval(() => {
  entityManager.tick();        // Execute heartbeats
  entityManager.saveDirty();   // Auto-save every second
}, 1000);

// Per-object intervals
tick() {
  for (const [id, hb] of this.heartbeats) {
    if (now - hb.lastTick >= hb.interval * 1000) {
      const obj = this.get(id);

      // Call object's heartbeat function
      if (obj.heartbeat && typeof obj.heartbeat === 'function') {
        obj.heartbeat(this);
      }

      hb.lastTick = now;
    }
  }
}
```

**Example**: Torch burns down over time (see `src/lib/torch.js`)

### Command System

Commands are modular JavaScript files:

```javascript
// src/commands/look.js
module.exports = {
  id: "look",
  name: "look",
  aliases: ["l"],
  category: "basic",
  description: "Look at your surroundings",
  usage: "look",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    session.sendLine(colors.roomName(room.name));
    session.sendLine(room.description);

    // ... show exits, items, NPCs, other players
  }
};
```

Commands are automatically loaded at server startup.

---

## Development Workflow

### Adding a New Item

```bash
# Create JSON file in src/world/[realm]/items/
# Example: src/world/newbie_realm/items/shield_001.json
{
  "id": "shield_001",
  "type": "item",
  "name": "Wooden Shield",
  "location": { "type": "room", "room": "test_room" },
  "defense": 2
}
```

### Adding a New Monster

```bash
# Create JSON file in src/world/[realm]/npcs/
{
  "id": "goblin_001",
  "definition": "monster",
  "name": "a goblin warrior",
  "currentRoom": "dark_cave",
  "hp": 25,
  "maxHp": 25,
  "wanders": true,
  "heartbeatInterval": 20
}
```

The monster inherits behavior from `src/lib/monster.js`.

### Adding a New Command

```bash
# Create src/commands/mycommand.js
module.exports = {
  id: "mycommand",
  name: "mycommand",
  aliases: ["mc"],
  category: "basic",
  description: "Does something cool",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    // Implementation
    // Use entityManager.move() for location changes
    // Use colors.* for colored output
  }
};
```

Server auto-loads on startup.

### Adding a New Room

```bash
# Create JSON file in src/world/[realm]/rooms/
{
  "id": "dark_cave",
  "type": "room",
  "name": "A Dark Cave",
  "description": "Damp walls glisten in the dim light. Water drips from stalactites above.",
  "exits": {
    "north": "forest_path",
    "east": "underground_lake"
  }
}
```

### Adding Dynamic Behavior

```bash
# Create definition in src/lib/myobject.js
module.exports = {
  type: "item",

  heartbeat: function(entityManager) {
    // This function is inherited by all instances
    // Called periodically based on heartbeatInterval
    console.log(`${this.name} heartbeat triggered`);
  }
};

# Set heartbeatInterval in instance JSON
{
  "id": "magic_item_001",
  "definition": "myobject",
  "name": "Glowing Crystal",
  "heartbeatInterval": 30,
  "location": { "type": "room", "room": "wizard_tower" }
}
```

---

## Architecture Hierarchy

```
CORE (infrastructure)
  ↓
SYSTEMS (game rules)
  ↓
LIB (object behaviors)
  ↓
WORLD (instances)
```

**Example**:
- **Core**: EntityManager, Session, NetworkDriver
- **Systems**: `systems/economy.js` - "Gold = 10 silver, 5% tax"
- **Lib**: `lib/shop.js` - "I can buy/sell using economy system"
- **World**: `world/tavern/shops/bobs_shop.json` - "I'm Bob's shop, swords cost 100gp"

---

## Current Status

**✅ Fully Implemented**:
- **Core Engine**: Unified entity management with single `move()` function
- **Heartbeat System**: Per-object intervals with definition-based behavior
- **Multiplayer Server**: Telnet protocol with session management
- **Commands**: 59 modular commands (movement, combat, inventory, shopping, banking, social)
- **Emotes**: 43 social emotes for player expression
- **Game Systems**: 11 implemented systems:
  - Combat system with damage calculation
  - Magic system with spell casting
  - Mana management and regeneration
  - Leveling system with XP progression
  - Loot generation and drops
  - Currency system (coins, banking)
  - Weight and encumbrance
  - Damage resistances
  - Movement mechanics
  - Dynamic description generation
  - Text colorization utilities
- **Object Definitions**: 19 lib definitions (monsters, weapons, armor, shops, banks, portals, etc.)
- **Multiple Worlds**: 5 realms (newbie_realm, sesame_street, reality_street, hill_valley with time periods, shared)
- **Prototypal Inheritance**: Definitions + instances pattern
- **Auto-save**: Dirty tracking with per-second saves
- **Authentication**: SHA-256 password hashing
- **Location System**: Unified tracking (rooms, inventories, containers)
- **ANSI Colors**: Full colorization support

**🚧 In Development**:
- Guild system expansion
- Additional spell content
- World content (actively porting from /home/micah/wumpy)

---

## Key Features

- **Single source of truth**: One `move()` for all location changes
- **Dirty tracking**: Only save what changed
- **Heartbeats**: Time-based events per object
- **Sessions**: Real-time player notifications
- **Validation**: Check world consistency
- **Auto-save**: Every second via heartbeat
- **Modular**: Systems are independent
- **AI-friendly**: Easy JSON instance creation
- **No duplication bugs**: Impossible by design

---

## Testing

```bash
# Start the server
npm start

# Connect with telnet
telnet localhost 4000

# Or use any MUD client
```

**Test Scripts:**
All test and validation scripts are located in `utils/tests/`:
- `test_integration.js` - Integration tests
- `test_combat.js` - Combat system tests
- `validate_json.js` - JSON validation
- And more...

### Validation

The system includes consistency checks:
- Every object ID is unique
- Every item appears in exactly ONE location
- Every reference points to a real object
- Parent inventories match child locations

Run `entityManager.validate()` to check.

---

## Example Session

```
$ telnet localhost 4000
Connected to localhost.

==============================================================
     Welcome to The Wumpy and Grift
==============================================================

Enter your character name: alice
Password: ****

Welcome back, Alice!
Type "help" for a list of commands.

> look

Test Room
=========
A simple test room for demonstrating EntityManager

Exits: north

a scurrying rat is here.

You see Red Apple here.

> get apple
You pick up Red Apple.

> inventory
You are carrying:
  Red Apple

> north
[Movement to next room...]
```

---

## Performance

- **Scales to thousands of objects**
- **Heartbeats are efficient** (only active objects tick)
- **Dirty tracking minimizes disk writes**
- **In-memory Map for O(1) lookups**

For larger scales, add database layer (same architecture applies).

---

## Documentation

- `CLAUDE.md` - Instructions for AI assistants working on this codebase
- `docs/SYSTEM_DESIGN.md` - Detailed architecture documentation
- `docs/design_quick.md` - Quick reference guide

---

## File Organization Rules

**IMPORTANT: Keep the root directory clean!**

Only these files belong in the root directory:
- `CLAUDE.md`, `GEMINI.md`, `README.md` - Core documentation
- `package.json`, `package-lock.json` - npm configuration
- `.gitignore` - Git configuration

**All other files must go in appropriate subdirectories:**

| File Type | Correct Location | Examples |
|-----------|-----------------|----------|
| Documentation | `docs/` | System designs, plans, maps, guides |
| Tests | `utils/tests/` | test_*.js, validate_*.js, verify_*.js |
| Utilities | `utils/` | Migration scripts, helper tools |
| Source Code | `src/` | Commands, systems, lib definitions |
| AI Agents | `.claude/agents/` | Specialized agent definitions |

**Examples:**
- ❌ `test_combat.js` in root → ✅ `utils/tests/test_combat.js`
- ❌ `COMBAT_PLAN.md` in root → ✅ `docs/COMBAT_PLAN.md`
- ❌ `migrate_items.js` in root → ✅ `utils/migrate_items.js`

---

## Philosophy

This is a **MUD**, not an MMO:
- World is defined in files, not dynamically created
- Players are saved at runtime in `src/data/players/`
- World content lives in `src/world/` as static templates
- Focus on depth, not scale

**The vibe**: LPmud-inspired, text-based, nostalgic, but modern architecture.

---

## Credits

Built for "The Wumpy and Grift" MUD. Porting content from `/home/micah/wumpy`.

Powered by the Simple Object Architecture concept.
