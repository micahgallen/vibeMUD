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
  ├── lib/                    # Object Definitions (behavior)
  │   ├── monster.js          # Base monster
  │   ├── torch.js            # Torch with burning heartbeat
  │   ├── room.js
  │   └── healing_room.js
  │
  ├── commands/               # Command Definitions
  │   ├── look.js             # Each exports { name, aliases, execute() }
  │   ├── get.js
  │   ├── drop.js
  │   ├── put.js
  │   └── ... (16 total)
  │
  ├── systems/                # Game-Wide Rules (directory exists)
  │   └── guilds/             # Guild system structure
  │
  ├── spells/                 # Universal Spells (directory exists, empty)
  │
  ├── world/                  # Game World (static content)
  │   └── newbie_realm/
  │       ├── rooms/
  │       ├── npcs/
  │       ├── items/
  │       └── containers/
  │
  ├── data/                   # Runtime Save Data
  │   └── players/            # Player save files ONLY
  │
  ├── utils/
  │   └── password.js
  │
  ├── banner.js
  └── colors.js

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

### Adding Dynamic Behavior

1. Create definition in `src/lib/objectname.js`
2. Define `heartbeat(entityManager)` function in the definition
3. Set `heartbeatInterval` in object JSON instance
4. Heartbeat executes periodically after `initializeHeartbeats()`

### Adding Game Systems (Planned)

1. Create system file in `src/systems/systemname.js`
2. Export module with system functions
3. Systems provide game-wide rules (combat, magic, economy, guilds)
4. Can be called from commands, heartbeats, or other systems

### Adding Spells (Planned)

1. Universal spells: `src/spells/spellname.js`
2. Guild-specific spells: `src/systems/guilds/[guild]/spells/spellname.js`
3. Include `cast(caster, target, entityManager, power)` function

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
- **Systems ready**: `src/systems/` and `src/spells/` directories exist and ready for implementation
- **Heartbeats modernized**: Heartbeat functions are in object definitions (see `src/lib/torch.js`)

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

### Testing Protocol (CRITICAL)

**ALWAYS use test servers (port 4001+) for live testing. NEVER test on port 4000.**

- **Before testing:** Start test server with `PORT=4001 node src/core/server.js` or `npm run test-server`
- **After testing:** Stop test server with `pkill -f "PORT=4001"` or Ctrl+C
- **Production server (port 4000):** Must remain running and untouched during testing
- **Test connection:** Use `telnet localhost 4001` (not 4000) when testing

This ensures the production server stays running for users while you test changes.