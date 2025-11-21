# Magic System Documentation

## Overview

The vibeMUD magic system provides a flexible, extensible framework for spellcasting with multiple effect types, mana management, and both player and NPC spellcasting capabilities.

**Key Features:**
- Mana pool system with automatic regeneration
- Multiple spell effect types (damage, heal, buff, debuff, summon, teleport)
- Guild-based spell access (expandable)
- NPC spellcasting during combat
- Automatic combat initiation for aggressive spells
- Timed buffs/debuffs with automatic cleanup

## Architecture

### Core Systems

**Mana System** (`src/systems/mana.js`)
- Manages magical energy pools (MP)
- Handles mana consumption and regeneration
- Auto-calculates max MP based on intelligence and level

**Magic System** (`src/systems/magic.js`)
- Loads and manages spell definitions
- Executes spell effects
- Validates casting requirements (mana, level, targeting)
- Manages buffs/debuffs with timers

### Integration Points

- **Server startup**: Loads spells from `data/guilds/global/`
- **Player creation**: Initializes mana pools automatically
- **Combat system**: NPCs can cast spells during their turns
- **Heartbeat tick**: Regenerates mana and cleans up expired effects

## Mana System

### Mana Properties

Players and NPCs with mana have these properties:
```javascript
{
  "mp": 100,           // Current mana points
  "maxMp": 100,        // Maximum mana points
  "mpRegen": 2         // Mana regenerated per second
}
```

### Mana Calculation

Max MP is calculated automatically based on intelligence and level:
```javascript
maxMp = (level * 5) + (intelligenceModifier * 2)
// Minimum: 10 MP
```

**Example:**
- Level 1, Intelligence 10 → 5 MP
- Level 5, Intelligence 16 → 31 MP (25 + 6)

### Mana Regeneration

- Regenerates automatically every second
- Amount based on `mpRegen` property (default: 1 MP/sec)
- Only regenerates when below max MP
- Managed by server heartbeat

## Spell Structure

Spells are defined as JSON files in `data/guilds/global/` (or guild-specific directories).

### Spell Template

```json
{
  "id": "spell_id",
  "name": "Spell Name",
  "description": "What the spell does",
  "manaCost": 15,
  "minLevel": 1,
  "targetType": "other",
  "combatOnly": false,
  "nonCombatOnly": false,
  "effects": [
    {
      "type": "damage",
      "amount": 20,
      "levelScale": 2
    }
  ],
  "messages": {
    "caster": "You cast the spell at {target}!",
    "target": "{caster} casts a spell at you!",
    "room": "{caster} casts a spell at {target}!"
  }
}
```

### Spell Properties

**Required:**
- `id` - Unique spell identifier
- `name` - Display name
- `description` - Spell description
- `manaCost` - MP cost to cast
- `targetType` - Targeting mode
- `effects` - Array of spell effects

**Optional:**
- `minLevel` - Minimum level requirement
- `combatOnly` - Only castable in combat
- `nonCombatOnly` - Cannot cast in combat
- `adminOnly` - Only castable by administrators
- `destroyCorpse` - Destroys target's corpse on death (no loot remains)
- `messages` - Custom messages for caster/target/room

### Target Types

- `self` - Only targets the caster
- `other` - Must target another entity (not self)
- `any` - Can target self or others
- `room` - Room-wide effect (no specific target)

## Spell Effects

### Available Effect Types

#### 1. Damage
Deals magical damage to target.

```json
{
  "type": "damage",
  "amount": 15,        // Base damage
  "levelScale": 2      // Additional damage per level
}
```

**Damage calculation:**
```javascript
totalDamage = baseDamage + intelligenceModifier + (level * levelScale)
```

#### 2. Heal
Restores HP to target.

```json
{
  "type": "heal",
  "amount": 20,
  "levelScale": 3
}
```

**Healing calculation:**
```javascript
totalHeal = baseHeal + intelligenceModifier + (level * levelScale)
```

#### 3. Buff
Temporarily increases a stat.

```json
{
  "type": "buff",
  "stat": "ac",        // ac, strength, dexterity, intelligence
  "amount": 3,
  "duration": 120      // seconds
}
```

**Buffable stats:**
- `ac` - Armor class
- `strength` - Strength score
- `dexterity` - Dexterity score
- `intelligence` - Intelligence score

#### 4. Debuff
Temporarily decreases a stat.

```json
{
  "type": "debuff",
  "stat": "strength",
  "amount": 3,
  "duration": 90
}
```

#### 5. Summon
Spawns an NPC helper.

```json
{
  "type": "summon",
  "npcDefinition": "monster",
  "name": "spectral wolf",
  "description": "A ghostly wolf prowls here.",
  "duration": 300,
  "level": 3,
  "hp": 30,
  "strength": 12,
  "dexterity": 14,
  "intelligence": 6
}
```

#### 6. Teleport
Moves caster or target to different room.

```json
{
  "type": "teleport",
  "destination": "room_id"
}
```

#### 7. DOT (Damage Over Time)
Applies ongoing damage that ticks at regular intervals.

```json
{
  "type": "dot",
  "initialDamage": 8,
  "damagePerTick": 5,
  "tickInterval": 3,
  "duration": 15,
  "stackBehavior": "stack",
  "maxStacks": 3,
  "damageType": "fire",
  "tickMessage": "🔥 {target} burns for {damage} fire damage from {spell}!"
}
```

**DOT Properties:**
- `initialDamage` - Upfront damage on cast (optional)
- `damagePerTick` - Damage dealt each tick
- `tickInterval` - Seconds between ticks
- `duration` - Total duration in seconds
- `stackBehavior` - How multiple casts stack (optional, default: "stack")
- `maxStacks` - Maximum stacks allowed (optional, default: unlimited)
- `damageType` - Type of damage for resistance checks (optional, default: "magical")
- `tickMessage` - Custom message shown on each tick (optional)

**Tick Message Placeholders:**
- `{target}` - Target entity name
- `{damage}` - Actual damage dealt (after resistances)
- `{spell}` - Spell name

**Stack Behaviors:**
- `"stack"` (default) - Multiple casts stack, dealing damage separately
- `"refresh"` - Recasting refreshes duration but doesn't add new stack
- `"none"` - Can't cast while already active on target

**Damage Types and Resistances:**
The game supports a comprehensive damage type system that applies to both spells and physical combat.

**Common Damage Types:**
- `physical` - Normal melee/ranged attacks
- `fire` - Fire-based attacks and spells
- `poison` - Toxic damage
- `force` - Pure magical force (like Magic Missile)
- `magical` - General magical damage
- `cold`, `lightning`, `acid` - Elemental damage types

**Resistance Format:**
Entities can have resistances to specific damage types (0.0 to 1.0):
```json
{
  "resistances": {
    "fire": 0.5,    // 50% fire resistance
    "poison": 0.25, // 25% poison resistance
    "force": 1.0    // Immune to force damage
  }
}
```

**How Resistances Work:**
- `0.0` = No resistance (full damage)
- `0.5` = 50% resistance (half damage)
- `1.0` = Immune (no damage, shows immunity message)
- Applies to ALL damage sources: spells, DOTs, and physical attacks

**Physical Combat Integration:**
- NPCs can have `"damageType": "fire"` to deal fire damage with melee
- Weapons can specify `"damageType": "cold"` for elemental weapons
- Default is `"physical"` if not specified

**Example with max 3 stacks:**
If you cast a 3-stack DOT four times, the oldest stack is removed and replaced with the new one.

### Multi-Effect Spells

Spells can have multiple effects:

```json
{
  "id": "holy_smite",
  "name": "Holy Smite",
  "manaCost": 25,
  "targetType": "other",
  "effects": [
    {
      "type": "damage",
      "amount": 30,
      "levelScale": 3
    },
    {
      "type": "debuff",
      "stat": "strength",
      "amount": 2,
      "duration": 60
    }
  ]
}
```

## Commands

### cast
Cast a spell on yourself or a target.

**Usage:**
```
cast <spell name> [target]
cast heal
cast magic missile goblin
cast shield bob
```

**Features:**
- Multi-word spell names supported
- Auto-finds targets in current room
- Shows mana cost after casting
- Initiates combat for aggressive spells

### spells
List available spells and view details.

**Usage:**
```
spells                  # List all spells
spells magic missile    # View spell details
```

**Display:**
- Shows which spells you can currently cast (✓/✗)
- Current mana status
- Mana cost and level requirements
- Detailed effect information

### status
View character status including mana.

**Displays:**
- ❤️ Health bar (magenta)
- ✨ Mana bar (blue) - only if player has mana
- Active buffs/debuffs with time remaining
- Buffed AC in combat stats

## NPC Spellcasting

### Setup

NPCs can cast spells during combat by adding:

```json
{
  "id": "evil_mage",
  "definition": "monster",
  "mp": 100,
  "maxMp": 100,
  "mpRegen": 2,
  "spells": ["magic_missile", "heal"],
  "spellCastChance": 0.4
}
```

**Properties:**
- `spells` - Array of spell IDs the NPC knows
- `spellCastChance` - Probability to cast instead of attack (default: 0.4 = 40%)

### Combat Behavior

During each combat round:
1. NPC rolls to cast (based on `spellCastChance`)
2. If casting, randomly selects from known spells
3. Checks mana availability
4. Casts spell (damage on enemy, heal/buff on self)
5. Falls back to basic attack if can't cast

## Player Spell Access

### Current System (Pre-Guild)

All players can cast all global spells if they have enough mana.

**Spell list in player file:**
```json
{
  "spells": [
    "magic_missile",
    "heal",
    "shield",
    "weaken",
    "summon_wolf"
  ]
}
```

*Note: The `spells` array is currently not enforced - all players can cast any spell. This will change when the guild system is implemented.*

### Future: Guild System

When guilds are implemented:
- Each guild will have specific spell lists
- Players can only cast spells from their guild
- Global spells available to all guilds
- Spell access checked via `player.spells.includes(spellId)`

## Creating New Spells

### Step 1: Create Spell File

Create a new JSON file in `data/guilds/global/`:

```json
{
  "id": "lightning_bolt",
  "name": "Lightning Bolt",
  "description": "A powerful bolt of electricity strikes your enemy.",
  "manaCost": 20,
  "minLevel": 3,
  "targetType": "other",
  "effects": [
    {
      "type": "damage",
      "amount": 25,
      "levelScale": 3
    }
  ],
  "messages": {
    "caster": "You unleash a lightning bolt at {target}!",
    "target": "{caster} strikes you with lightning!",
    "room": "{caster} hurls a lightning bolt at {target}!"
  }
}
```

### Step 2: Restart Server

The spell will be automatically loaded on server startup.

### Step 3: Test

```
spells lightning bolt
cast lightning bolt goblin
```

### Creating Admin-Only Spells

Admin-only spells require administrator privileges to cast. Add `"adminOnly": true` to the spell definition:

```json
{
  "id": "deathblast",
  "name": "Deathblast",
  "description": "Administrator weapon - instantly annihilates target.",
  "manaCost": 1,
  "adminOnly": true,
  "destroyCorpse": true,
  "targetType": "other",
  "effects": [
    {
      "type": "damage",
      "amount": 999999
    }
  ]
}
```

**Admin Check:**
- Players must have `isAdmin: true` in their player file
- Non-admins will see: "This spell requires administrator privileges!"
- Admin-only spells show `[ADMIN]` badge in spell lists
- Detail view shows "⚠️ ADMIN ONLY" warning

**Corpse Destruction:**
- Add `"destroyCorpse": true` to completely annihilate target
- No corpse or loot remains after death
- Shows message: "The cosmic energy disintegrates even the remains - nothing is left."

## Example Spells

### 1. Magic Missile (Damage)
```json
{
  "id": "magic_missile",
  "name": "Magic Missile",
  "description": "A bolt of magical force strikes your enemy.",
  "manaCost": 10,
  "minLevel": 1,
  "targetType": "other",
  "effects": [
    {
      "type": "damage",
      "amount": 15,
      "levelScale": 2
    }
  ]
}
```

### 2. Heal (Restoration)
```json
{
  "id": "heal",
  "name": "Heal",
  "description": "Channel healing energy to restore hit points.",
  "manaCost": 15,
  "minLevel": 1,
  "targetType": "any",
  "effects": [
    {
      "type": "heal",
      "amount": 20,
      "levelScale": 3
    }
  ]
}
```

### 3. Shield (Buff)
```json
{
  "id": "shield",
  "name": "Shield",
  "description": "Conjure a magical shield that increases armor class.",
  "manaCost": 12,
  "minLevel": 2,
  "targetType": "any",
  "effects": [
    {
      "type": "buff",
      "stat": "ac",
      "amount": 3,
      "duration": 120
    }
  ]
}
```

### 4. Weaken (Debuff)
```json
{
  "id": "weaken",
  "name": "Weaken",
  "description": "Sap your enemy's strength with dark magic.",
  "manaCost": 8,
  "minLevel": 2,
  "targetType": "other",
  "effects": [
    {
      "type": "debuff",
      "stat": "strength",
      "amount": 3,
      "duration": 90
    }
  ]
}
```

### 5. Summon Wolf (Summoning)
```json
{
  "id": "summon_wolf",
  "name": "Summon Wolf",
  "description": "Call forth a spectral wolf to fight by your side.",
  "manaCost": 25,
  "minLevel": 3,
  "targetType": "self",
  "effects": [
    {
      "type": "summon",
      "npcDefinition": "monster",
      "name": "spectral wolf",
      "description": "A ghostly wolf with glowing blue eyes prowls here.",
      "duration": 300,
      "level": 3,
      "hp": 30,
      "strength": 12,
      "dexterity": 14,
      "intelligence": 6
    }
  ]
}
```

### 6. Deathblast (Admin-Only Annihilation)
```json
{
  "id": "deathblast",
  "name": "Deathblast",
  "description": "An administrator's ultimate weapon - instantly annihilates any target. No corpse remains.",
  "manaCost": 1,
  "minLevel": 1,
  "targetType": "other",
  "adminOnly": true,
  "destroyCorpse": true,
  "effects": [
    {
      "type": "damage",
      "amount": 999999,
      "levelScale": 0,
      "damageType": "cosmic"
    }
  ],
  "messages": {
    "caster": "You channel cosmic power and unleash DEATHBLAST at {target}!",
    "target": "{caster} raises their hand and reality screams!",
    "room": "⚡💀⚡ {caster} DEATHBLASTS {target} into oblivion! ⚡💀⚡"
  }
}
```

## Technical Details

### Buff/Debuff Management

**Application:**
- Buffs/debuffs are stored in `activeBuffs` and `activeDebuffs` arrays
- Each has unique ID, stat, amount, duration, and expiration timestamp
- Stats are modified immediately on application

**Cleanup:**
- Server heartbeat checks for expired effects every second
- Expired effects are automatically removed
- Stats are restored when effects expire
- Players are notified when effects wear off

**Example buff object:**
```javascript
{
  id: "buff_123456789_abc",
  spellId: "shield",
  stat: "ac",
  amount: 3,
  duration: 120,
  startTime: 1700000000000,
  endTime: 1700000120000
}
```

### Combat Integration

**Aggressive Spell Detection:**
- Damage and debuff effects are considered aggressive
- Casting aggressive spell at NPC initiates combat
- Combat proceeds normally with spell effects applied

**NPC Casting in Combat:**
- NPCs with `spells` array can cast during combat rounds
- Spell selection is random from known spells
- Mana check before casting
- Falls back to basic attack if can't cast

### Performance Considerations

**Mana Regeneration:**
- Runs once per second for all entities
- Only processes entities below max MP
- Minimal overhead (~O(n) where n = players + NPCs with mana)

**Buff/Debuff Cleanup:**
- Runs once per second
- Only processes entities with active effects
- Removes expired effects in batch

## Future Enhancements

**Planned Features:**
- Guild system with guild-specific spell lists
- Spell skill/proficiency system
- Spell success/failure mechanics
- Concentration spells (require focus, broken by damage)
- Area-of-effect spells
- Spell scrolls and spellbooks
- Spell components/reagents
- Counterspells and spell resistance
- Spell combinations/synergies

## Troubleshooting

### Spells not loading
- Check spell JSON syntax is valid
- Verify file is in `data/guilds/global/`
- Check server startup logs for spell loading messages
- Restart server after adding new spells

### Buffs showing negative time
- Server needs restart to enable buff cleanup
- Old buffs will be cleaned on next heartbeat tick

### Mana not regenerating
- Ensure server has been restarted with mana regen code
- Check player has `maxMp` and `mpRegen` properties
- Verify `mp < maxMp`

### NPC not casting spells
- Check NPC has `spells` array with valid spell IDs
- Verify NPC has `mp` and `maxMp` properties
- Ensure NPC is in combat
- Check `spellCastChance` (default 40%)

---

**Last Updated:** November 16, 2025
**Version:** 1.0.0
**Author:** vibeMUD Magic System
