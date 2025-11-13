# Combat System Design

## Overview

The combat system manages turn-based fighting in vibeMUD using per-combat heartbeats. Each combat encounter gets its own 2-second heartbeat that processes attacks in initiative order.

## Architecture

### Core Principle
Combat is a **SYSTEM** (game rules) that uses **CORE** services (EntityManager) and calls **LIB** definitions for behavior (weapon damage, NPC AI).

### File Structure
```
src/
  ├── systems/
  │   └── combat.js              # Combat rules and encounter management
  ├── commands/
  │   ├── attack.js              # Initiate combat
  │   ├── flee.js                # Escape combat
  │   └── kill.js                # Alias for attack
  └── lib/
      ├── weapon.js              # Weapon damage calculations (future)
      └── armor.js               # Armor/defense calculations (future)
```

## Data Model

### Combat State (on participant objects)
```javascript
player.combat = {
  opponent: "goblin_001",        // Who they're fighting
  combatId: "combat_xyz",        // Which encounter
  queuedAction: null             // For future spell/item system
};
```

### Combat Encounter (ephemeral, lives in heartbeat)
```javascript
{
  id: "combat_xyz",
  participants: ["player_alice", "goblin_001"],
  initiative: ["player_alice", "goblin_001"],  // Attack order
  startTime: 1234567890
}
```

## Combat Flow

### 1. Starting Combat
```
Player types: attack goblin
  ↓
commands/attack.js validates target
  ↓
combat.engage(playerId, targetId, entityManager)
  ↓
- Set player.combat and target.combat
- Roll initiative
- Register combat heartbeat (2s interval)
- Notify room
```

### 2. Combat Round (every 2 seconds)
```
Heartbeat fires for combat_xyz
  ↓
combat.processCombatRound(encounter, entityManager)
  ↓
For each participant in initiative order:
  - Check if still valid (alive, in room, etc.)
  - Execute queued action OR default attack
  - combat.executeAttack(attackerId, defenderId, entityManager)
    - Roll to hit (based on stats)
    - Calculate damage
    - Apply damage, mark dirty
    - Notify combatants and room
  - Check for death/end conditions
  ↓
If combat ended: removeHeartbeat(combatId), clear combat state
```

### 3. Ending Combat
Combat ends when:
- Participant dies (HP ≤ 0)
- Participant flees (flee command)
- Participant leaves room (move away)
- Participant goes linkdead (disconnect)

## System Integration Points

### Uses EntityManager For:
- `get(id)` - fetch participant objects
- `addHeartbeat(combatId, config)` - register combat rounds
- `removeHeartbeat(combatId)` - end combat
- `markDirty(id)` - after HP/state changes
- `notifyPlayer(id, message)` - combat feedback
- `notifyRoom(roomId, message, excludeId)` - room notifications
- `move(corpseId, location)` - handle death (future)

### Called By Commands:
- `attack.js` → `combat.engage()`
- `flee.js` → `combat.disengage()`
- Future: `cast.js`, `use.js` → `combat.queueAction()`

### Calls Into (Future):
- `lib/weapon.js` - weapon damage modifiers
- `lib/armor.js` - defense calculations
- `systems/magic.js` - spell damage/effects
- `systems/guilds.js` - class-specific bonuses

## combat.js API

### Module Exports

```javascript
module.exports = {
  // Start combat encounter
  engage(attackerId, defenderId, entityManager): void

  // End combat for a participant
  disengage(participantId, entityManager): void

  // Process one round of combat (called by heartbeat)
  processCombatRound(encounter, entityManager): void

  // Execute single attack
  executeAttack(attackerId, defenderId, entityManager): boolean

  // Roll initiative order
  rollInitiative(id1, id2, entityManager): Array<string>

  // Calculate hit chance
  rollToHit(attacker, defender): boolean

  // Calculate damage amount
  calculateDamage(attacker, defender): number

  // Apply damage and check death
  applyDamage(targetId, amount, sourceId, entityManager): void

  // Check if combat should continue
  shouldContinueCombat(encounter, entityManager): boolean
};
```

## Stats System

Combat uses these player/NPC properties:

### Combat Stats
```javascript
{
  hp: 100,           // Current hit points
  maxHp: 100,        // Maximum hit points
  level: 1,          // Character level
  strength: 10,      // Affects damage
  dexterity: 10,     // Affects hit chance
  constitution: 10,  // Affects max HP (future)
  ac: 0              // Armor class (lower is better)
}
```

### Basic Formulas (Phase 1)
```
To Hit Roll:
  d20 + attacker.dexterity + attacker.level >= 10 + defender.ac + defender.dexterity

Damage Roll:
  1d6 + attacker.strength + weapon.damage

Initiative:
  Higher dexterity goes first (tie: random)
```

## Implementation Phases

### Phase 1: Basic Melee Combat (MVP)
**Goal:** Two entities can attack each other until one dies

**Files to create:**
- `src/systems/combat.js` - core system
- `src/commands/attack.js` - initiate combat
- `src/commands/flee.js` - escape combat

**Implementation steps:**
1. Create `combat.js` with `engage()`, `disengage()`, `processCombatRound()`
2. Implement basic hit/damage formulas (d20 system)
3. Add `attack` command that validates target and calls `combat.engage()`
4. Add `flee` command that calls `combat.disengage()`
5. Test with existing NPCs in newbie_realm

**Combat messages:**
```
You attack the goblin!
You hit the goblin for 8 damage!
The goblin hits you for 5 damage!
You miss the goblin!
The goblin misses you!
```

**Victory condition:**
- Target reaches 0 HP: notify room, set `isDead: true`, end combat
- No corpses/loot/respawn in Phase 1

**Test scenario:**
```
> attack goblin
> (wait for combat to resolve)
> flee
```

### Phase 2: Death and Respawn
**Goal:** Handle death properly with corpses and respawn

**Additions:**
- Death creates corpse item (container with inventory)
- Dead players respawn in designated room after 30s
- Dead NPCs respawn in original location after 5 minutes
- `src/lib/corpse.js` - corpse object definition

**New commands:**
- `loot <corpse>` - take items from corpse (or use existing `get`)

**Implementation:**
1. Create corpse generation in `combat.applyDamage()` when HP ≤ 0
2. Transfer inventory to corpse using `entityManager.move()`
3. Add respawn heartbeat for dead entities
4. Move dead player to respawn room, restore HP after delay

### Phase 3: Combat Actions
**Goal:** Allow spells/items during combat

**Additions:**
- `combat.queueAction(participantId, action)` - store action for next round
- Action types: `{ type: 'spell', spell: 'fireball' }` or `{ type: 'item', item: 'potion_001' }`
- Modify `processCombatRound()` to check `participant.combat.queuedAction`

**Modified commands:**
- `cast.js` - if in combat, queue spell instead of immediate cast
- `use.js` - if in combat, queue item use

**Implementation:**
1. Add `queuedAction` field to combat state
2. Modify round processor to execute queued actions
3. Clear queued action after execution
4. Update spell/item commands to check combat state

### Phase 4: Weapons and Armor
**Goal:** Equipment affects combat effectiveness

**Additions:**
- `src/lib/weapon.js` - weapon definitions with damage
- `src/lib/armor.js` - armor definitions with AC
- Wielded weapon: `player.wielded = "sword_001"`
- Worn armor: `player.worn = { body: "chainmail_001", ... }`

**Modified formulas:**
```
Damage: 1d6 + strength + weapon.damage + level
AC: base + armor.ac + dexterity
```

**New commands:**
- `wield <weapon>` - equip weapon
- `wear <armor>` - equip armor
- `remove <item>` - unequip

**Implementation:**
1. Create weapon/armor definitions
2. Add equipment slots to player schema
3. Modify damage/AC calculations to include equipment
4. Add equip/unequip commands

### Phase 5: Advanced Combat (Future)
**Enhancements for later:**
- Multiple opponents (3v2 combat)
- Combat styles (aggressive, defensive, balanced)
- Special attacks (bash, kick, backstab)
- Fleeing has success chance based on dexterity
- Auto-attack toggle (stop fighting without fleeing)
- Guild-specific combat bonuses
- Critical hits/misses
- Status effects (poison, stun, slow)

## Edge Cases

### Participant Disconnects
```javascript
// In Session.js cleanup
if (player.combat) {
  combat.disengage(player.id, entityManager);
}
```

### Participant Moves to Different Room
```javascript
// In commands/go.js (or wherever movement happens)
if (player.combat) {
  combat.disengage(player.id, entityManager);
  session.send("You flee from combat!");
}
```

### Opponent Dies During Round
```javascript
// In processCombatRound(), check before each attack:
if (!opponent || opponent.isDead || !opponent.combat) {
  // End combat, remove heartbeat
}
```

### Both Die Simultaneously
```javascript
// In applyDamage(), check after each death:
if (allParticipantsDead) {
  removeHeartbeat(combatId);
}
```

## Testing Strategy

### Phase 1 Tests
1. Player attacks NPC, combat starts
2. Combat rounds fire every 2 seconds
3. NPC takes damage, HP decreases
4. NPC dies at 0 HP
5. Combat heartbeat removed on death
6. Player can flee before death
7. Multiple simultaneous combats don't interfere

### Manual Test Script
```javascript
// test_combat.js
const entityManager = require('./src/core/EntityManager');
const combat = require('./src/systems/combat');

// Load game world
entityManager.loadAll();

// Simulate player attacking NPC
const player = entityManager.get('test_player');
const goblin = entityManager.get('goblin_001');

console.log('Starting combat...');
combat.engage(player.id, goblin.id, entityManager);

// Let combat run for 10 seconds
setTimeout(() => {
  console.log('Player HP:', player.hp);
  console.log('Goblin HP:', goblin.hp);
  process.exit();
}, 10000);
```

## Performance Considerations

### Memory
- Combat encounters are ephemeral (not saved to disk)
- Clean up heartbeats immediately when combat ends
- Don't store combat history

### CPU
- Each combat = 1 heartbeat checking every 2s
- 100 active combats = negligible overhead
- Damage calculations are simple arithmetic

### Scaling
- Combat state stored on participant objects (already in memory)
- No new data structures in EntityManager
- Heartbeat system already handles hundreds of objects

## Future Integration Notes

### Magic System
```javascript
// In combat.processCombatRound()
if (participant.combat.queuedAction?.type === 'spell') {
  const spell = magicSystem.get(queuedAction.spell);
  spell.cast(participant.id, opponent.id, entityManager);
}
```

### Guild System
```javascript
// In combat.calculateDamage()
if (attacker.guild) {
  damage += guildSystem.getCombatBonus(attacker.guild, attacker.level);
}
```

### Quest System
```javascript
// In combat.applyDamage() on death
questSystem.checkKillObjective(sourceId, targetId, entityManager);
```

## Notes

- Combat state is NOT saved to disk (ephemeral runtime state)
- Only HP changes are saved via dirty tracking
- Death/respawn handled in Phase 2
- NPC combat AI lives in lib/monster.js heartbeat (existing system)
- Weapons/armor in Phase 4, for now all attacks are "unarmed"
