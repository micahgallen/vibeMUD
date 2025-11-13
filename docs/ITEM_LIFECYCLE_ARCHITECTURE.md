# Item Lifecycle Architecture - LPC-Inspired Hierarchical Model

## The Four-Layer Inheritance Chain

```
item.js (base definition)           ← Universal item behavior
  ↓ inherits
weapon.js / consumable.js / armor.js ← Specific category behavior
  ↓ inherits
apple_001.json (template)           ← Specific item data
  ↓ clones
apple_001_123_xyz (instance)        ← Runtime object in game world
```

## Layer 1: Base Definition - `item.js`

**Purpose**: Universal item behavior for ALL items

**Location**: `src/lib/item.js`

**Defines**:
- Lifecycle management (clone, destroy)
- Stackability rules
- Save/load behavior
- Location tracking
- Display helpers
- Weight/value basics

**Example**:
```javascript
// src/lib/item.js
module.exports = {
  type: 'item',

  // Lifecycle
  isInstance: false,
  stackable: false,
  quantity: 1,

  // Display
  getDisplayName: function() {
    if (this.stackable && this.quantity > 1) {
      return `${this.name} (${this.quantity})`;
    }
    return this.name || this.id;
  },

  getDescription: function() {
    return this.description || 'An ordinary item.';
  },

  // Properties
  getWeight: function() {
    const baseWeight = this.weight || 0.1;
    return this.stackable ? baseWeight * this.quantity : baseWeight;
  },

  getValue: function() {
    const baseValue = this.value || 0;
    return this.stackable ? baseValue * this.quantity : baseValue;
  },

  // Stacking
  canStackWith: function(otherItem) {
    if (!otherItem) return false;
    if (this.id === otherItem.id) return false; // Same instance
    if (!this.stackable) return false;
    // Check if same template
    return this.__proto__ === otherItem.__proto__;
  },

  stackWith: function(otherItem, entityManager) {
    if (!this.canStackWith(otherItem)) return false;
    this.quantity += otherItem.quantity;
    entityManager.destroy(otherItem.id);
    entityManager.markDirty(this.id);
    return true;
  },

  // Saving (only instances in player inventory get saved)
  shouldSave: function() {
    if (!this.isInstance) return false;
    if (!this.location) return false;
    return this.location.type === 'inventory' || this.location.type === 'container';
  },

  toJSON: function() {
    // Only save modified properties, not inherited ones
    const data = { id: this.id };
    for (const key in this) {
      if (this.hasOwnProperty(key) && key !== '__proto__') {
        data[key] = this[key];
      }
    }
    return data;
  }
};
```

## Layer 2: Specific Definitions - `consumable.js`, `weapon.js`, `armor.js`

**Purpose**: Category-specific behavior, inherits from `item.js`

**Location**: `src/lib/`

### Example: `consumable.js`

```javascript
// src/lib/consumable.js
const item = require('./item.js');

module.exports = Object.create(item, {
  // Override stackable for consumables
  stackable: { value: true, writable: true },

  // Consumable-specific methods
  consume: {
    value: function(player, entityManager) {
      // Apply healing
      if (this.healAmount) {
        player.hp = Math.min(player.hp + this.healAmount, player.maxHp);
        entityManager.markDirty(player.id);
      }

      // Apply mana
      if (this.manaAmount) {
        player.mana = Math.min(player.mana + this.manaAmount, player.maxMana);
        entityManager.markDirty(player.id);
      }

      // Apply buffs/effects
      if (this.effects) {
        this.applyEffects(player, entityManager);
      }

      // Handle stacking or destruction
      if (this.quantity > 1) {
        this.quantity--;
        entityManager.markDirty(this.id);
      } else {
        entityManager.destroy(this.id);
      }

      return {
        success: true,
        message: `You consume ${this.name}.`
      };
    }
  },

  applyEffects: {
    value: function(player, entityManager) {
      // Handle buffs, poisons, etc.
      if (!this.effects) return;

      for (const effect of this.effects) {
        // Apply effect logic here
        console.log(`Applied ${effect.type} to ${player.id}`);
      }
    }
  }
});
```

### Example: `weapon.js`

```javascript
// src/lib/weapon.js
const item = require('./item.js');

module.exports = Object.create(item, {
  // Weapons are not stackable
  stackable: { value: false, writable: false },

  // Weapon properties
  durability: { value: 100, writable: true },
  maxDurability: { value: 100, writable: true },

  // Weapon methods
  getDamage: {
    value: function() {
      // Parse damage dice (e.g., "1d8+2")
      return this.damage || "1d4";
    }
  },

  reduceDurability: {
    value: function(amount, entityManager) {
      this.durability = Math.max(0, this.durability - amount);
      entityManager.markDirty(this.id);

      if (this.durability === 0) {
        this.broken = true;
        return { broken: true, message: `Your ${this.name} breaks!` };
      }

      return { broken: false };
    }
  },

  repair: {
    value: function(amount, entityManager) {
      if (!this.broken && this.durability === this.maxDurability) {
        return { success: false, message: "This weapon doesn't need repair." };
      }

      this.durability = Math.min(this.maxDurability, this.durability + amount);
      this.broken = false;
      entityManager.markDirty(this.id);

      return { success: true, message: `You repair ${this.name}.` };
    }
  }
});
```

### Example: `armor.js`

```javascript
// src/lib/armor.js
const item = require('./item.js');

module.exports = Object.create(item, {
  stackable: { value: false, writable: false },

  // Armor properties
  armorClass: { value: 0, writable: true },
  slot: { value: 'body', writable: true }, // head, body, hands, legs, feet

  getArmorClass: {
    value: function() {
      if (this.broken) return 0;
      return this.armorClass || 0;
    }
  },

  reduceDurability: {
    value: function(amount, entityManager) {
      this.durability = Math.max(0, (this.durability || this.maxDurability) - amount);
      entityManager.markDirty(this.id);

      if (this.durability === 0) {
        this.broken = true;
        return { broken: true, message: `Your ${this.name} falls apart!` };
      }

      return { broken: false };
    }
  }
});
```

## Layer 3: Templates - `src/world/*/items/*.json`

**Purpose**: Specific item data, inherits from category definition

**Characteristics**:
- NO `location` field (templates aren't in the world)
- Reference `definition` which inherits from `item.js`
- Pure data, no functions
- Loaded into `entityManager.templates`

### Example: Apple (Consumable)

```json
{
  "id": "apple_001",
  "definition": "consumable",
  "name": "Red Apple",
  "description": "A crisp red apple, perfect for a quick snack.",
  "value": 3,
  "weight": 0.2,
  "healAmount": 5
}
```

### Example: Iron Sword (Weapon)

```json
{
  "id": "iron_sword_001",
  "definition": "weapon",
  "name": "Iron Sword",
  "description": "A sturdy iron blade with a leather-wrapped hilt.",
  "value": 50,
  "weight": 3.5,
  "damage": "1d8",
  "durability": 100,
  "maxDurability": 100
}
```

### Example: Leather Armor

```json
{
  "id": "leather_armor_001",
  "definition": "armor",
  "name": "Leather Armor",
  "description": "Supple leather armor, well-worn but serviceable.",
  "value": 30,
  "weight": 8.0,
  "armorClass": 2,
  "slot": "body",
  "durability": 80,
  "maxDurability": 80
}
```

## Layer 4: Instances - Runtime Objects

**Purpose**: Actual items in the game world

**Creation**: `entityManager.clone(templateId, overrides)`

**Characteristics**:
- Unique ID: `apple_001_1763042902108_xyz`
- Has `location` field
- `isInstance: true`
- Can be modified at runtime
- Destroyed via `entityManager.destroy(id)`

**Inheritance chain**:
```javascript
instance.__proto__ === template (apple_001.json)
template.__proto__ === consumable.js
consumable.js.__proto__ === item.js
```

## EntityManager Implementation

### New Storage Structure

```javascript
class EntityManager {
  constructor() {
    this.templates = new Map();   // Item/NPC templates from world files
    this.instances = new Map();   // Runtime item instances
    this.players = new Map();     // Player characters
    this.rooms = new Map();       // Rooms
    this.definitions = new Map(); // Loaded definitions (item.js, consumable.js, etc.)
  }
}
```

### Method: `loadDefinition(name)`

```javascript
loadDefinition(name) {
  if (this.definitions.has(name)) {
    return this.definitions.get(name);
  }

  try {
    const defPath = path.join(__dirname, '../lib', `${name}.js`);
    const definition = require(defPath);
    this.definitions.set(name, definition);
    return definition;
  } catch (error) {
    console.error(`Failed to load definition ${name}:`, error.message);
    return null;
  }
}
```

### Method: `loadTemplate(jsonData)`

```javascript
loadTemplate(jsonData) {
  // Load the definition (e.g., "consumable")
  const definition = this.loadDefinition(jsonData.definition || 'item');

  if (!definition) {
    console.warn(`Definition ${jsonData.definition} not found for ${jsonData.id}`);
    return null;
  }

  // Create template with prototypal inheritance
  const template = Object.create(definition);
  Object.assign(template, jsonData);

  // Templates should never have location
  delete template.location;

  this.templates.set(template.id, template);
  return template;
}
```

### Method: `clone(templateId, overrides)`

```javascript
clone(templateId, overrides = {}) {
  const template = this.templates.get(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Generate unique instance ID
  const instanceId = `${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create instance with prototypal inheritance
  const instance = Object.create(template);
  Object.assign(instance, {
    id: instanceId,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    isInstance: true,
    quantity: template.stackable ? 1 : undefined,
    ...overrides
  });

  // Register the instance
  this.instances.set(instanceId, instance);

  // Add to location if specified
  if (instance.location) {
    this.addToLocation(instance);
  }

  console.log(`✨ Cloned ${templateId} → ${instanceId}`);
  return instance;
}
```

### Method: `destroy(instanceId)`

```javascript
destroy(instanceId) {
  const instance = this.instances.get(instanceId);
  if (!instance) {
    console.warn(`Cannot destroy ${instanceId}: not found`);
    return false;
  }

  if (!instance.isInstance) {
    throw new Error(`Cannot destroy template ${instanceId}`);
  }

  // Remove from location
  this.removeFromLocation(instance);

  // Remove from instances
  this.instances.delete(instanceId);

  // Remove from dirty tracking
  this.dirtyObjects.delete(instanceId);

  console.log(`🗑️  Destroyed ${instanceId}`);
  return true;
}
```

### Method: `loadAll()`

```javascript
loadAll() {
  console.log('📂 Loading all objects...');

  // 1. Load item templates from world files
  const worldPaths = [
    path.join(__dirname, '../world/newbie_realm'),
    path.join(__dirname, '../world/sesame_street'),
    path.join(__dirname, '../world/reality_street')
  ];

  for (const worldPath of worldPaths) {
    const itemsDir = path.join(worldPath, 'items');
    if (fs.existsSync(itemsDir)) {
      const files = fs.readdirSync(itemsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(itemsDir, file), 'utf8'));
        this.loadTemplate(data);
      }
      console.log(`  ✓ Loaded ${files.length} item templates from ${path.basename(worldPath)}`);
    }
  }

  // 2. Load rooms
  // 3. Load NPCs
  // 4. Load players
  // 5. Restore player inventory instances by cloning templates

  console.log(`✅ Loaded ${this.templates.size} templates, ${this.instances.size} instances\n`);
}
```

## Migration Steps

### Step 1: Implement Base item.js ✓
Create `src/lib/item.js` with universal item behavior.

### Step 2: Update Specific Definitions
Update `src/lib/consumable.js`, create `src/lib/weapon.js`, `src/lib/armor.js` to inherit from item.js.

### Step 3: Implement EntityManager Methods
Add `clone()`, `destroy()`, update `loadAll()`, modify storage structure.

### Step 4: Clean World Files
Remove ALL `location` fields from world item JSON files. They are templates, not instances.

### Step 5: Update Commands
- `buy.js` - use `clone()` instead of manual creation
- `eat.js` - call `item.consume()`, let it handle `destroy()`
- `drop.js` - keep using `move()`
- `sell.js` - use `destroy()` after sale

### Step 6: Delete Legacy Items
Remove all non-compliant items, orphaned instances, and validation errors.

### Step 7: Update Save System
Only save player-owned instances. On load, restore by cloning templates.

## Clean Slate Approach

**Delete these**:
- `gem_001` with alice reference
- All `apple_001_*_*` orphaned instances
- All `sword_001` old instances
- Any item with `location` in world files

**Keep only**:
- Templates in `src/world/*/items/` (no location)
- Instances in player inventories (will be recreated on load)

## Benefits

1. **True hierarchical inheritance**: item.js → weapon.js → template → instance
2. **No backward compatibility baggage**: Clean slate
3. **Proper lifecycle**: clone → use → destroy
4. **Memory efficient**: Destroyed items are gone
5. **LPC-inspired**: Matches proven MUD architecture
6. **Type safety**: All weapons inherit weapon.js, all consumables inherit consumable.js
