# Loot System Design Document

## Overview

The loot system enables NPCs/monsters to carry equipment, drop items when killed, and generate random loot based on level-based tiers and domain organization. This system integrates with the existing vibeMUD architecture following the CORE → SYSTEMS → LIB → WORLD hierarchy.

## Core Principle

**"Monsters are entities with inventory and equipment, just like players. When they die, their gear becomes loot."**

This design leverages:
- Existing domain organization (items already in `src/world/[domain]/items/`)
- Level-based automatic tier selection
- Configurable drop chances for preset equipment
- Tag-based item indexing for random loot generation

---

## 1. Item Loot Tags System

### Purpose
Add metadata to items for categorization, filtering, and drop mechanics without changing core item behavior.

### Schema

Add a `lootTags` field to item JSONs:

```json
{
  "id": "rusty_sword_001",
  "type": "item",
  "definition": "weapon",
  "name": "Rusty Sword",
  "description": "A weathered blade covered in rust.",
  "damage": "1d4",
  "value": 5,
  "weight": 3,

  "lootTags": {
    "domain": "newbie_realm",
    "subdomain": "forest",
    "tier": "trash",
    "categories": ["weapon", "melee", "sword"],
    "dropWeight": 50,
    "presetDropChance": 0.25
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `domain` | string | Primary world area (matches folder structure) |
| `subdomain` | string | Optional sub-area within domain |
| `tier` | string | Loot quality tier (see below) |
| `categories` | array | Tags for filtering (e.g., "weapon", "armor", "consumable") |
| `dropWeight` | number | Relative drop chance (higher = more common, default: 10) |
| `presetDropChance` | number | Override drop chance when equipped by monster (0.0-1.0) |

### Loot Tiers

| Tier | Description | Typical Levels | Example Items |
|------|-------------|----------------|---------------|
| `trash` | Broken/worthless | 1-2 | Rusty weapons, torn cloth |
| `poor` | Basic starter gear | 1-4 | Simple weapons, leather scraps |
| `good` | Standard equipment | 3-7 | Iron weapons, leather armor |
| `amazing` | Quality gear | 6-10 | Steel weapons, chain mail |
| `epic` | Rare powerful items | 9-13 | Enchanted weapons, plate armor |
| `legendary` | Unique artifacts | 12+ | Named weapons, magical artifacts |

**Note:** Tiers intentionally overlap. A level 4 monster can drop both `poor` and `good` items.

---

## 2. Monster Equipment & Inventory

### Current State
- Players have `inventory` arrays and `equipped` objects
- Monsters have embedded equipment data (e.g., `equippedWeapon: {name, damage}`)
- No inventory system for monsters

### New Structure

Extend monsters to match player structure:

```json
{
  "id": "goblin_warrior_001",
  "type": "npc",
  "definition": "monster",
  "name": "a goblin warrior",
  "level": 3,
  "hp": 25,
  "maxHp": 25,
  "currentRoom": "forest_clearing",

  "equipped": {
    "mainHand": "rusty_sword_001",
    "offHand": null,
    "chest": "leather_scraps_001",
    "head": null,
    "legs": null,
    "hands": null,
    "feet": null,
    "shield": null
  },

  "inventory": ["gold_coins_5", "health_potion_001"],

  "loot": {
    "guaranteedDrops": ["gold_coins_5"],
    "equippedDropChance": 0.35,
    "randomLoot": {
      "enabled": true,
      "rolls": 2,
      "tierOverride": null,
      "domainOverride": null,
      "bonusTables": ["goblinoid_loot"]
    }
  }
}
```

### Equipment Slots

Matches player equipment system:
- `mainHand` - Primary weapon
- `offHand` - Secondary weapon/tool
- `chest` - Body armor
- `head` - Helmet/hat
- `legs` - Leg armor/pants
- `hands` - Gloves/gauntlets
- `feet` - Boots
- `shield` - Shield (separate from offHand)

### Loot Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `guaranteedDrops` | array | Item IDs that always drop |
| `equippedDropChance` | number | Base chance for equipped items to drop (0.0-1.0) |
| `randomLoot.enabled` | boolean | Enable random loot generation |
| `randomLoot.rolls` | number | How many times to roll on loot table |
| `randomLoot.tierOverride` | string/array | Force specific tier(s) instead of level-based |
| `randomLoot.domainOverride` | string | Force specific domain instead of room's domain |
| `randomLoot.bonusTables` | array | Additional custom loot tables to roll on |

---

## 3. Level-Based Loot Tier Mapping

### Algorithm

Monster level automatically determines which tiers of loot can drop:

```javascript
const LEVEL_TIER_MAP = {
  1: ['trash', 'poor'],
  2: ['trash', 'poor'],
  3: ['poor', 'good'],
  4: ['poor', 'good'],
  5: ['poor', 'good'],
  6: ['good', 'amazing'],
  7: ['good', 'amazing'],
  8: ['good', 'amazing'],
  9: ['amazing', 'epic'],
  10: ['amazing', 'epic'],
  11: ['amazing', 'epic'],
  12: ['epic', 'legendary'],
  13: ['epic', 'legendary'],
  // 14+: all tiers available
};

function getTiersForLevel(level) {
  if (level >= 14) {
    return ['trash', 'poor', 'good', 'amazing', 'epic', 'legendary'];
  }
  return LEVEL_TIER_MAP[level] || ['good'];
}
```

### Examples

- **Level 1 Rat**: Can drop `trash` or `poor` items (rusty weapons, torn cloth)
- **Level 5 Goblin**: Can drop `poor` or `good` items (leather armor, iron weapons)
- **Level 10 Drake**: Can drop `amazing` or `epic` items (steel weapons, enchanted gear)
- **Level 15+ Dragon**: Can drop any tier (including legendary artifacts)

---

## 4. Loot System Architecture

### File: `src/systems/loot.js`

#### Core Functions

##### `initialize(entityManager)`
Scans all items and builds indexes:
- `byDomain` - Items grouped by domain
- `bySubdomain` - Items grouped by subdomain
- `byTier` - Items grouped by tier
- `byCategory` - Items grouped by category

##### `generateLoot(monsterId, entityManager)`
Main entry point. Generates all loot for a monster:
1. Add guaranteed drops
2. Roll for equipped items (with drop chances)
3. Roll on random loot tables
4. Roll on bonus tables

Returns array of item IDs to add to corpse.

##### `_rollRandomLoot(domain, tier, level, entityManager)`
Selects random item matching domain and tier:
1. Get tier(s) for monster level
2. Find items matching domain + tier
3. Use weighted random selection based on `dropWeight`

##### `_weightedRandomItem(itemIds, entityManager)`
Weighted random selection algorithm:
```javascript
totalWeight = sum(all item dropWeights)
roll = random(0, totalWeight)
for each item:
  roll -= item.dropWeight
  if roll <= 0: return item
```

##### `_createLootItem(templateId, entityManager)`
Creates a unique instance from item template:
```javascript
instanceId = `${templateId}_${timestamp}_${random}`
instance = Object.create(template)
instance.id = instanceId
instance.isInstance = true
return instanceId
```

### Index Structure

```javascript
this.lootIndex = {
  byDomain: {
    "newbie_realm": ["sword_001", "dagger_001", ...],
    "sesame_street": ["wumpy_ale", "leather_armor_005", ...],
    ...
  },

  bySubdomain: {
    "forest": ["rusty_sword_001", ...],
    "dungeon": ["torch_001", ...],
    ...
  },

  byTier: {
    "trash": ["rusty_sword_001", "torn_cloth_001", ...],
    "poor": ["leather_scraps_001", ...],
    "good": ["iron_sword_001", "leather_armor_001", ...],
    "amazing": ["steel_sword_001", "chain_mail_001", ...],
    "epic": ["enchanted_blade_001", ...],
    "legendary": ["excalibur_001", ...]
  },

  byCategory: {
    "weapon": ["sword_001", "dagger_001", ...],
    "armor": ["leather_armor_001", ...],
    "consumable": ["potion_001", ...],
    ...
  }
};
```

---

## 5. Combat System Integration

### Modify: `src/systems/combat.js` - `createCorpse()`

**Current behavior:** Transfers player inventory to corpse

**New behavior:**
1. Transfer player inventory (existing)
2. **Generate loot from monster equipment and loot tables**
3. Transfer all loot to corpse

```javascript
function createCorpse(dead, roomId, entityManager) {
  // ... existing corpse creation ...

  // === NEW: Generate and transfer loot ===
  if (dead.type === 'npc' && dead.loot) {
    const loot = require('../systems/loot');
    const generatedLoot = loot.generateLoot(dead.id, entityManager);

    for (const itemId of generatedLoot) {
      try {
        entityManager.move(itemId, {
          type: 'container',
          owner: corpseId
        });
        console.log(`  💎 Dropped loot: ${itemId}`);
      } catch (error) {
        console.error(`  ⚠️  Failed to add loot ${itemId}:`, error.message);
      }
    }
  }

  // Transfer existing inventory (unchanged)
  if (dead.inventory && dead.inventory.length > 0) {
    for (const itemId of [...dead.inventory]) {
      entityManager.move(itemId, {
        type: 'container',
        owner: corpseId
      });
    }
  }

  // ... rest of existing code ...
}
```

---

## 6. Monster Description Enhancement

### Update: `src/commands/look.js`

When examining monsters, show equipped items:

```javascript
function getMonsterEquipmentDisplay(monster, entityManager, colors) {
  if (!monster.equipped) return '';

  const equipped = [];

  if (monster.equipped.mainHand) {
    const weapon = entityManager.get(monster.equipped.mainHand);
    if (weapon) equipped.push(`wielding ${colors.item(weapon.name)}`);
  }

  if (monster.equipped.offHand) {
    const item = entityManager.get(monster.equipped.offHand);
    if (item) equipped.push(`holding ${colors.item(item.name)}`);
  }

  if (monster.equipped.chest) {
    const armor = entityManager.get(monster.equipped.chest);
    if (armor) equipped.push(`wearing ${colors.item(armor.name)}`);
  }

  if (monster.equipped.shield) {
    const shield = entityManager.get(monster.equipped.shield);
    if (shield) equipped.push(`carrying ${colors.item(shield.name)}`);
  }

  if (monster.equipped.head) {
    const helmet = entityManager.get(monster.equipped.head);
    if (helmet) equipped.push(`wearing ${colors.item(helmet.name)} on their head`);
  }

  if (equipped.length > 0) {
    return `\n${monster.name} is ${equipped.join(', ')}.`;
  }

  return '';
}
```

**Example output:**
```
a goblin warrior
A scarred goblin clutching a rusty blade.
a goblin warrior is wielding a Rusty Sword, wearing Leather Scraps.
```

---

## 7. Monster.js Extensions

### Modify: `src/lib/monster.js`

Add default properties:

```javascript
module.exports = {
  type: 'npc',
  hp: 20,
  maxHp: 20,
  level: 1,
  wanders: true,

  // NEW: Default equipment and inventory
  equipped: {},
  inventory: [],

  // NEW: Default loot configuration
  loot: {
    guaranteedDrops: [],
    equippedDropChance: 0.25,  // 25% chance by default
    randomLoot: {
      enabled: false,  // Opt-in
      rolls: 1
    }
  },

  // ... existing heartbeat and other methods ...
};
```

---

## 8. Implementation Phases

### Phase 1: Foundation
- [x] Write design document
- [ ] Add `lootTags` to ~10 existing items (newbie_realm)
- [ ] Extend monster.js with inventory/equipped defaults
- [ ] Create basic loot.js system with indexing

### Phase 2: Core Loot Generation
- [ ] Implement `generateLoot()` function
- [ ] Implement `_rollRandomLoot()` with weighted selection
- [ ] Implement `_createLootItem()` instance creation
- [ ] Modify combat.js `createCorpse()` to call loot system

### Phase 3: Monster Equipment Display
- [ ] Update look command to show monster equipment
- [ ] Test equipment display with various monsters
- [ ] Ensure colors work correctly

### Phase 4: Testing & Examples
- [ ] Create 3-5 test monsters with different loot configs
- [ ] Create test items for each tier
- [ ] Kill monsters and verify loot drops
- [ ] Verify corpse decay with loot
- [ ] Test edge cases (no loot, guaranteed drops only, etc.)

### Phase 5: Expansion (Future)
- [ ] Add more lootTags to all items
- [ ] Create bonus loot tables (goblinoid_loot, undead_loot, etc.)
- [ ] Add domain tags to rooms for better loot matching
- [ ] Create legendary items with special properties
- [ ] Boss loot tables with guaranteed rates
- [ ] Achievement tracking for rare drops

---

## 9. Example Configurations

### Low-Level Monster (Level 1-2)
```json
{
  "id": "sewer_rat_001",
  "level": 1,
  "hp": 8,
  "maxHp": 8,
  "equipped": {},
  "inventory": [],
  "loot": {
    "randomLoot": {
      "enabled": true,
      "rolls": 1
    }
  }
}
```
**Expected drops:** Trash/poor items (20% chance to drop anything)

### Mid-Level Monster (Level 5)
```json
{
  "id": "goblin_warrior_005",
  "level": 5,
  "equipped": {
    "mainHand": "rusty_sword_001",
    "chest": "leather_scraps_001"
  },
  "inventory": ["gold_coins_10"],
  "loot": {
    "guaranteedDrops": ["gold_coins_10"],
    "equippedDropChance": 0.4,
    "randomLoot": {
      "enabled": true,
      "rolls": 2
    }
  }
}
```
**Expected drops:**
- Always: 10 gold coins
- 40% chance: Rusty Sword
- 40% chance: Leather Scraps
- 2 random poor/good items

### High-Level Boss (Level 12)
```json
{
  "id": "dragon_lord_001",
  "level": 12,
  "equipped": {
    "mainHand": "flaming_greatsword_001",
    "chest": "dragon_scale_armor_001"
  },
  "inventory": ["ancient_tome_001"],
  "loot": {
    "guaranteedDrops": ["dragon_scale_armor_001", "gold_coins_1000"],
    "equippedDropChance": 0.9,
    "randomLoot": {
      "enabled": true,
      "rolls": 5,
      "bonusTables": ["dragon_hoard", "legendary_artifacts"]
    }
  }
}
```
**Expected drops:**
- Always: Dragon Scale Armor, 1000 gold
- 90% chance: Flaming Greatsword
- 5 random epic/legendary items
- Bonus rolls on special tables

---

## 10. Benefits & Design Rationale

### Why This Design?

✅ **Leverages Existing Structure**
- Items already organized by domain in folder structure
- No need to reorganize existing content

✅ **Automatic Scaling**
- Monster level automatically selects appropriate loot tier
- No manual tier assignment needed for every monster

✅ **Flexible Configuration**
- Guaranteed drops for predictable loot
- Random drops for variety
- Equipment drops with configurable chances
- Bonus tables for special themed loot

✅ **Weighted Random**
- `dropWeight` allows fine-tuning rarity
- Common items have high weight, rare items have low weight
- Easy to balance without changing code

✅ **Domain-Aware**
- Respects world organization
- Forest monsters drop forest loot
- Dungeon monsters drop dungeon loot

✅ **Backward Compatible**
- Monsters without loot config still work (drop nothing)
- Can gradually add loot to existing monsters
- Doesn't break existing systems

✅ **Easy to Balance**
- Adjust `dropWeight` per item
- Adjust `presetDropChance` per item
- Adjust `equippedDropChance` per monster
- No code changes needed for balancing

✅ **AI-Friendly**
- JSON-based configuration
- Clear schema and examples
- Easy for AI to generate new monsters with loot

---

## 11. Future Enhancements

### Short-Term (Post-MVP)
- Add subdomain filtering for more granular loot
- Create category-specific loot tables (weapons_only, armor_only)
- Add loot multipliers for special events
- Track loot history for analytics

### Long-Term
- Player luck/fortune stats affecting drops
- Loot instancing (each player gets own loot from corpse)
- Conditional loot (only drops if certain conditions met)
- Quest item drops (100% for quest monsters)
- Seasonal/event loot modifiers
- Dynamic loot scaling based on party size
- Loot trading/auction house integration

---

## 12. Testing Checklist

### Unit Tests
- [ ] Item indexing builds correctly
- [ ] Weighted random selection works
- [ ] Tier mapping returns correct tiers for each level
- [ ] Item instance creation works
- [ ] Guaranteed drops always drop

### Integration Tests
- [ ] Monster death creates corpse with loot
- [ ] Equipped items transfer to corpse
- [ ] Random loot generates correctly
- [ ] Corpse decay doesn't lose items
- [ ] Multiple players can loot same corpse

### Edge Cases
- [ ] Monster with no loot config (drops nothing)
- [ ] Monster with empty equipped slots
- [ ] Monster with invalid item IDs (handles gracefully)
- [ ] Domain with no matching loot (falls back)
- [ ] Level 1 monster (minimum tier)
- [ ] Level 20+ monster (all tiers)

### Balance Tests
- [ ] Kill 100 level 1 monsters, verify ~20% drop rate
- [ ] Kill 100 level 5 monsters, verify tier distribution
- [ ] Kill 10 bosses, verify guaranteed drops
- [ ] Verify no legendary drops from level 1 monsters
- [ ] Verify rare items are actually rare

---

## Appendix A: Data Flow Diagram

```
Monster Dies
    ↓
handleDeath() in combat.js
    ↓
createCorpse()
    ↓
loot.generateLoot(monsterId)
    ↓
┌─────────────────────────────────────┐
│ 1. Add guaranteedDrops              │
│ 2. Roll for equipped items          │
│ 3. Roll random loot (N times)       │
│ 4. Roll bonus tables                │
└─────────────────────────────────────┘
    ↓
Return array of item IDs
    ↓
For each item ID:
  entityManager.move(itemId, corpse)
    ↓
Corpse now contains loot
    ↓
Players can loot corpse
    ↓
Corpse decays after 5 minutes
```

---

## Appendix B: File Changes Summary

### New Files
- `src/systems/loot.js` - Core loot system

### Modified Files
- `src/lib/monster.js` - Add inventory/equipped defaults
- `src/systems/combat.js` - Integrate loot generation
- `src/commands/look.js` - Display monster equipment
- Various item JSONs - Add lootTags

### No Changes Required
- `src/lib/corpse.js` - Already handles inventory
- `src/lib/weapon.js` - Already complete
- `src/lib/armor.js` - Already complete
- `src/lib/item.js` - Already complete

---

**Document Version:** 1.0
**Date:** 2025-11-21
**Status:** Ready for Implementation
**Next Step:** Phase 1 - Foundation
