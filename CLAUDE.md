# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the **vibeMUD** engine prototype - a LPmud-inspired MUD (Multi-User Dungeon) engine demonstrating the "Simple Object Architecture" concept. This prototype is being used to develop **"The Wumpy and Grift"** MUD, ported from the original implementation at /home/micah/wumpy.

The architecture provides a unified entity management system where everything (players, items, rooms, NPCs, commands) is an object with a unique ID, tracked by a single EntityManager that handles all location changes through one `move()` function.

## Core Concept

**Everything is an object. Every object has an ID. One manager tracks them all. One move() function handles all location changes.**

This architecture eliminates item duplication bugs by maintaining a single source of truth for all object locations and automatically updating all references through the centralized `move()` function.

## Common Commands

### Running the System

```bash
# Run the demo script (shows move operations)
npm run demo
# or: node demo.js

# PRODUCTION SERVER (port 4000)
npm start
# or: node src/core/server.js

# TEST SERVERS (different ports - use these for testing!)
npm run test-server          # Port 4001
npm run test-server:4002     # Port 4002
npm run test-server:4003     # Port 4003
# or custom port: PORT=5000 node src/core/server.js

# Connect as a client
telnet localhost 4000   # Production
telnet localhost 4001   # Test server
```

### Testing

The system includes validation to check consistency:
- Every object ID is unique
- Every item appears in exactly ONE location
- Every reference points to a real object
- Parent inventories match child locations

### Live Testing Protocol

**CRITICAL: Always use test servers (ports 4001+) for testing. NEVER test on port 4000 (production).**

#### Starting a Test Server

```bash
# Method 1: Use npm scripts (recommended)
npm run test-server              # Starts on port 4001

# Method 2: Use custom port
PORT=4001 node src/core/server.js

# Method 3: Run in background for monitoring
PORT=4001 node src/core/server.js &
```

#### Live Testing Workflow

1. **Start test server on port 4001+**
   ```bash
   npm run test-server
   ```

2. **Monitor server logs** - Watch for:
   - ERROR or WARNING messages
   - Heartbeat activity (🚶 wandering, 💬 dialogue, 🎭 emotes)
   - Combat messages (⚔️ combat, 💀 deaths)
   - Movement broadcasts

3. **Connect and test** (in another terminal):
   ```bash
   telnet localhost 4001
   ```

4. **Test specific scenarios**:
   - NPC interactions (movement, dialogue, combat)
   - Player commands (look, get, drop, say, emote)
   - Magic system (cast spells, check mana)
   - Combat system (attack, spells, death/respawn)

5. **Check server logs** for errors after testing

6. **Stop test server when done**:
   ```bash
   pkill -f "PORT=4001"
   # or if running in foreground: Ctrl+C
   ```

#### What to Look For

**In Server Logs:**
- ✅ No ERROR or WARNING from Session.sendLine
- ✅ Heartbeat messages (🚶 💬 🎭 ⚔️ 💀)
- ✅ Combat messages showing player/NPC names
- ✅ Movement broadcasts when NPCs wander

**In Client (telnet):**
- ✅ All messages displaying correctly
- ✅ Colors rendering properly
- ✅ No duplicate messages
- ✅ Combat messages appearing during fights
- ✅ NPC movement/speech visible when in same room

#### Common Issues

**Problem:** Test server won't start ("Address already in use")
- **Solution:** Port is occupied. Try different port (4002, 4003) or kill existing process

**Problem:** No messages appearing in client
- **Solution:** Check server logs for ERROR/WARNING messages from Session.sendLine

**Problem:** Messages appearing twice
- **Solution:** Check if array exclusion is working in EntityManager.notifyRoom

## Architecture

### Hierarchy

The vibeMUD architecture follows a clear hierarchy:

```
CORE (infrastructure)
  ↓
SYSTEMS (game rules)
  ↓
LIB (object behaviors)
  ↓
WORLD (instances)
```

Example:
- **systems/economy.js**: "Gold = 10 silver, 5% tax" (game-wide rules)
- **lib/shop.js**: "I can buy/sell using economy system" (reusable behavior)
- **world/sesame_street/shops/general_store.json**: "I'm Bob's shop, swords = 100gp" (specific instance)

### The EntityManager (Core Engine)

**Location**: `EntityManager.js` (root, legacy) and `src/core/EntityManager.js` (newer version with definition loading)

The EntityManager is the heart of the system:

- `objects: Map<id, object>` - All game objects in memory
- `dirtyObjects: Set<id>` - Objects that need saving
- `heartbeats: Map<id, heartbeat>` - Objects with periodic updates
- `sessions: Map<playerId, session>` - Active player connections

**Key Methods**:
- `move(objectId, newLocation)` - **THE KEY FUNCTION** - moves any object anywhere, automatically updating all references
- `get(id)` - Retrieve any object by ID
- `loadAll()` - Load all objects from disk on startup
- `validate()` - Check consistency of entire game state
- `saveDirty()` - Save only modified objects to disk
- `tick(handlers)` - Execute heartbeats for dynamic behavior

### Object Types

All objects are JSON files with common structure:
```json
{
  "id": "unique_identifier",
  "type": "player|item|container|room|npc|command",
  "location": { /* location descriptor */ }
}
```

**Location descriptors** (how items track where they are):
```javascript
{ type: "inventory", owner: "player_id" }    // In a player's inventory
{ type: "container", owner: "container_id" } // In a container
{ type: "room", room: "room_id" }            // On the floor in a room
```

**Important:** Only players are saved at runtime in `src/data/players/`. All world content (rooms, NPCs, items, containers) is loaded from `src/world/` as static content. This is a MUD, not an MMO - the world is defined in files, not dynamically created.

### File Structure

**Current Structure** (after refactoring):

```
src/
  ├── core/                   # Engine
  │   ├── server.js           # Main server loop
  │   ├── EntityManager.js    # Object lifecycle, heartbeats
  │   ├── Session.js          # Player connections
  │   └── colors.js           # ANSI colors
  │
  ├── lib/                    # Object Definitions (19 total)
  │   ├── monster.js          # Base monster
  │   ├── torch.js            # Torch with burning heartbeat
  │   ├── room.js, healing_room.js, hot_tub_room.js
  │   ├── item.js, weapon.js, armor.js, consumable.js
  │   ├── coin.js, corpse.js, emote.js, signs.js
  │   ├── shop.js, bank.js
  │   ├── booth_portal.js, elevator_portal.js, haunted_elevator.js
  │   └── hot_tub.js
  │
  ├── commands/               # Command Definitions (59 total)
  │   ├── look.js, get.js, drop.js, put.js
  │   ├── attack.js, cast.js, flee.js, kill.js
  │   ├── buy.js, sell.js, list.js, value.js
  │   ├── wear.js, wield.js, equipment.js
  │   ├── eat.js, drink.js, loot.js
  │   ├── deposit.js, withdraw.js, balance.js, coins.js
  │   └── ... (see src/commands/ for full list)
  │
  ├── emotes/                 # Emote Definitions (43 total)
  │   ├── applaud.json, bow.json, cheer.json
  │   ├── dance.json, laugh.json, smile.json
  │   └── ... (see src/emotes/ for full list)
  │
  ├── systems/                # Game-Wide Rules (11 systems)
  │   ├── combat.js           # Combat mechanics
  │   ├── magic.js            # Magic system
  │   ├── mana.js             # Mana management
  │   ├── leveling.js         # XP and leveling
  │   ├── loot.js             # Loot generation
  │   ├── currency.js         # Currency system
  │   ├── weight.js           # Weight/encumbrance
  │   ├── resistances.js      # Damage resistances
  │   ├── movement.js         # Movement mechanics
  │   ├── descriptions.js     # Description system
  │   └── colorization.js     # Text colorization
  │
  ├── spells/                 # Universal Spells (directory exists)
  │
  ├── world/                  # Game World (static content)
  │   ├── newbie_realm/       # Tutorial area
  │   │   ├── rooms/, npcs/, items/, containers/
  │   ├── sesame_street/      # Sesame Street themed area
  │   │   ├── rooms/, npcs/, items/
  │   ├── reality_street/     # Reality-themed area
  │   │   ├── rooms/, npcs/
  │   ├── hill_valley/        # Back to the Future area
  │   │   ├── 1885/, 1955/, 1985/, 1985alt/, 2015/
  │   │   └── items/
  │   └── shared/             # Shared rooms
  │       └── rooms/
  │
  ├── data/                   # Runtime Save Data
  │   └── players/            # Player save files ONLY
  │
  ├── utils/
  │   └── password.js
  │
  ├── banner.js
  └── colors.js

.claude/                      # Claude Code Agents
  └── agents/
      ├── mud-coder.md        # Implementation specialist
      ├── mud-architect.md    # System designer
      ├── mud-world-builder.md # Content creator
      ├── mud-spatial-mapper.md # Spatial layout
      └── wumpy-content-porter.md # Legacy content migration

demo.js                       # Demonstration script
docs/                         # Documentation
  ├── SYSTEM_DESIGN.md
  └── design_quick.md
```

### Two-Tier Object System (Definition + Instance)

Objects can use **prototypal inheritance**:

1. **Definition** (`src/lib/torch.js`): Defines shared behavior and default properties
2. **Instance** (`src/world/newbie_realm/items/torch_001.json`): References definition and overrides specific properties

Example instance referencing a definition:
```json
{
  "id": "torch_001",
  "definition": "torch",
  "location": { "type": "room", "room": "town_square" }
}
```

The EntityManager automatically loads the definition and applies prototypal inheritance when loading instances.

### Command System

Commands are modular JavaScript files in `src/commands/`:

```javascript
module.exports = {
  id: "look",
  name: "look",
  aliases: ["l"],
  category: "basic",
  description: "Look at your surroundings",
  usage: "look",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    // Implementation here
    // Use entityManager.move() for location changes
  }
};
```

Commands are automatically loaded by the server at startup.

### Emote System

The emote system allows players to express actions and emotions. Emotes are JSON files in `src/emotes/`:

```json
{
  "id": "dance",
  "name": "dance",
  "category": "social",
  "first": "You dance around happily!",
  "third": "{actor} dances around happily!",
  "targetFirst": "You dance with {target}!",
  "targetSecond": "{actor} dances with you!",
  "targetThird": "{actor} dances with {target}!"
}
```

Players can use emotes via the `emote` command (e.g., `emote dance` or `emote dance bob`). The system supports:
- **43 emotes** including: applaud, bow, cheer, dance, laugh, smile, etc.
- **Self emotes**: Message to actor and room when no target
- **Targeted emotes**: Messages to actor, target, and room when targeting someone
- **Dynamic templates**: `{actor}` and `{target}` are replaced with actual names

### Heartbeat System

Objects can have periodic behavior via heartbeats:

**In the object JSON**:
```json
{
  "heartbeatHandler": "npc_merchant",  // Legacy pattern
  "heartbeatInterval": 30               // seconds
}
```

**Or in the definition** (preferred, new pattern):
```javascript
// src/lib/torch.js
module.exports = {
  heartbeat: function(entityManager) {
    // This function is inherited by all torch instances
    // Called periodically based on heartbeatInterval
  }
};
```

The EntityManager's `tick()` method executes heartbeats at their specified intervals.

## Critical Patterns

### Always Use move() for Location Changes

**NEVER manually modify location fields or inventory arrays.** Always use:

```javascript
entityManager.move('sword_001', {
  type: 'inventory',
  owner: 'alice'
});
```

This automatically:
- Removes item from old location
- Updates item.location
- Adds item to new location
- Updates parent arrays (inventories)
- Marks affected objects dirty
- Prevents duplication bugs

### Player Notifications

```javascript
// Notify one player
entityManager.notifyPlayer(playerId, "You feel a chill.");

// Notify everyone in a room (except one player)
entityManager.notifyRoom(roomId, "Alice enters.", excludePlayerId);
```

### Finding Objects

```javascript
// Get by ID
const sword = entityManager.get('sword_001');

// Get all of a type
const allPlayers = entityManager.getByType('player');

// Filter from all objects
const itemsInRoom = Array.from(entityManager.objects.values()).filter(obj =>
  obj.type === 'item' &&
  obj.location?.type === 'room' &&
  obj.location?.room === roomId
);
```

### Dirty Tracking

Always mark objects dirty after modifying them:

```javascript
player.hp += 10;
entityManager.markDirty(player.id);
```

The server auto-saves dirty objects every second.

## Development Workflow

### Adding a New Item

1. Create JSON file in `src/world/[realm]/items/` (e.g., `src/world/sesame_street/items/`)
2. Set location (room, inventory, or container)
3. Optional: Reference a definition from `src/lib/` for shared behavior using `"definition": "weapon"`

### Adding a New Command

1. Create `src/commands/commandname.js` with the module.exports structure
2. Implement `execute(session, args, entityManager, colors)` function
3. Use `entityManager.move()` for any location changes
4. Server auto-loads on startup

### Adding a New Room

1. Create JSON file in `src/world/[realm]/rooms/`
2. Define exits: `{ "exits": { "north": "other_room_id" } }`
3. Optional: Add `items` array for objects on the floor

### Adding a New World/Realm

1. Create directory structure in `src/world/[realm_name]/`
2. Add subdirectories: `rooms/`, `npcs/`, `items/`, `containers/` as needed
3. Create room JSON files with unique IDs across all realms
4. Link realms via room exits or portal objects
5. Consider using themed naming (e.g., `sesame_street_*`, `hill_valley_*`)

**Existing realms**:
- `newbie_realm` - Tutorial area
- `sesame_street` - Sesame Street themed world
- `reality_street` - Reality-themed area
- `hill_valley` - Back to the Future world (1885, 1955, 1985, 1985alt, 2015)
- `shared` - Common/shared rooms

### Adding Dynamic Behavior

1. Create definition in `src/lib/objectname.js`
2. Define `heartbeat(entityManager)` function in the definition
3. Set `heartbeatInterval` in object JSON instance
4. Heartbeat executes periodically after `initializeHeartbeats()`

### Adding Game Systems

1. Create system file in `src/systems/systemname.js`
2. Export module with system functions
3. Systems provide game-wide rules (combat, magic, economy, leveling, etc.)
4. Can be called from commands, heartbeats, or other systems

**Implemented systems** (11 total):
- `combat.js` - Combat mechanics and damage calculation
- `magic.js` - Spell casting and magic system
- `mana.js` - Mana management and regeneration
- `leveling.js` - Experience points and character progression
- `loot.js` - Loot generation and drops
- `currency.js` - Money and currency handling
- `weight.js` - Weight and encumbrance system
- `resistances.js` - Damage type resistances
- `movement.js` - Movement mechanics and restrictions
- `descriptions.js` - Dynamic description generation
- `colorization.js` - Text colorization utilities

### Adding Emotes

1. Create JSON file in `src/emotes/emotename.json`
2. Define `first`, `third`, `targetFirst`, `targetSecond`, `targetThird` messages
3. Use `{actor}` and `{target}` placeholders for dynamic names
4. Server auto-loads on startup

### Adding Spells

1. Universal spells: `src/spells/spellname.js`
2. Guild-specific spells: `src/systems/guilds/[guild]/spells/spellname.js`
3. Include appropriate casting logic and effects
4. Integrate with magic.js and mana.js systems

## Important Notes

### Architecture & Naming

- **Engine name**: vibeMUD
- **World name**: The Wumpy and Grift
- **Source material**: /home/micah/wumpy (original implementation being ported)
- **Target structure**: Follow design_quick.md for the intended file organization

### Code Structure

- **All legacy files removed**: No more root-level EntityManager.js, HeartbeatHandlers.js, or server.js
- **Unified structure**: All code now lives in `src/` following the design_quick.md architecture
- **Data consolidated**: Runtime save data (players only) in `src/data/players/`, world content in `src/world/`
- **Systems implemented**: 11 game systems in `src/systems/` (combat, magic, leveling, currency, loot, etc.)
- **Heartbeats modernized**: Heartbeat functions are in object definitions (see `src/lib/torch.js`)
- **Multiple worlds**: newbie_realm, sesame_street, reality_street, hill_valley (BTTF themed)
- **Rich command set**: 59 commands covering movement, combat, shopping, banking, inventory management
- **Emote system**: 43 social emotes for player expression

### File Placement Rules (CRITICAL)

**NEVER place files in the root directory except:**
- `CLAUDE.md`, `GEMINI.md`, `README.md` (documentation)
- `package.json`, `package-lock.json` (npm configuration)
- `.gitignore` (git configuration)

**Always use proper directories:**
- **Documentation**: `docs/` - All planning docs, system designs, maps, summaries, READMEs, implementation plans
- **Tests**: `utils/tests/` - All test scripts, validation scripts, verification scripts
- **Utilities**: `utils/` - Migration scripts, helper scripts, one-off utilities
- **Source code**: `src/` - All production code (commands, systems, lib definitions, world content)
- **Claude agents**: `.claude/agents/` - Specialized agent definitions

**Examples of what NOT to do:**
- ❌ Creating `test_feature.js` in root
- ❌ Creating `FEATURE_PLAN.md` in root
- ❌ Creating `validate_data.js` in root
- ❌ Creating `migrate_items.js` in root

**Examples of correct placement:**
- ✅ `utils/tests/test_feature.js`
- ✅ `docs/FEATURE_PLAN.md`
- ✅ `utils/tests/validate_data.js`
- ✅ `utils/migrate_items.js`

### Technical Details

- Player authentication uses SHA-256 password hashing (see `src/utils/password.js`)
- The server uses telnet protocol on port 4000
- All game state is stored as JSON files for easy inspection and version control
- The `validate()` function is your friend - run it to check for consistency bugs

### Hierarchy

Remember the architecture hierarchy when adding features:
1. **CORE**: Infrastructure (EntityManager, server, sessions) - rarely changes
2. **SYSTEMS**: Game-wide rules (combat, magic, economy) - defines "how the game works"
3. **LIB**: Object behaviors (monster, torch, room definitions) - reusable templates
4. **WORLD**: Specific instances (The Wumpy and Grift content) - actual game content

### Specialized Claude Agents

This repository includes specialized agents in `.claude/agents/` for different development tasks:

- **mud-coder.md**: Implementation specialist - Use when implementing features, systems, or objects based on architectural plans. Handles creating lib definitions, commands, world content, and system implementations.

- **mud-architect.md**: System designer - Use for architectural decisions and high-level system design.

- **mud-world-builder.md**: Content creator - Use when creating new game world content, areas, and narrative elements.

- **mud-spatial-mapper.md**: Spatial layout specialist - Use for designing room layouts and spatial relationships.

- **wumpy-content-porter.md**: Legacy migration expert - Use when porting content from /home/micah/wumpy to the new vibeMUD architecture. Handles careful translation while preserving descriptions and gameplay.

These agents are designed to work together: architect designs systems, coder implements them, world-builder creates content, spatial-mapper organizes geography, and content-porter migrates legacy material.

### Testing Protocol (CRITICAL)

**ALWAYS use test servers (port 4001+) for live testing. NEVER test on port 4000.**

- **Before testing:** Start test server with `PORT=4001 node src/core/server.js` or `npm run test-server`
- **After testing:** Stop test server with `pkill -f "PORT=4001"` or Ctrl+C
- **Production server (port 4000):** Must remain running and untouched during testing
- **Test connection:** Use `telnet localhost 4001` (not 4000) when testing

This ensures the production server stays running for users while you test changes.