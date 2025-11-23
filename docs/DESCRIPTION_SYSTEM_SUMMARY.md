# Player Description System - Implementation Summary

## What Was Created

A complete player description system for "The Wumpy and Grift" MUD that generates rich, flavorful descriptions when players examine each other.

### Files Created

1. **`/home/micah/entity-manager-prototype/src/systems/descriptions.js`**
   - Main description system module
   - 10 base lewn descriptions (randomly selected but consistent per player ID)
   - 10 level-based descriptions (percentile buckets 0-10%, 10-20%, etc.)
   - 4 health descriptions (75-100%, 50-75%, 25-50%, 0-25%)
   - 5 guildless descriptions
   - Placeholder support for future guilds and equipment

2. **`/home/micah/entity-manager-prototype/docs/DESCRIPTIONS_SYSTEM.md`**
   - Comprehensive documentation
   - Style guidelines for writing descriptions
   - Extension instructions for adding races, guilds, etc.
   - Integration examples and best practices

3. **`/home/micah/entity-manager-prototype/test_descriptions.js`**
   - Executable test script demonstrating all features
   - Tests consistency (same ID = same description)
   - Tests variety (different IDs = different descriptions)
   - Shows all description types and statistics

### Files Modified

1. **`/home/micah/entity-manager-prototype/src/commands/examine.js`**
   - Updated to use the new description system when examining players
   - Lines 370-393 replaced with clean integration

## How It Works

### Architecture
- **Location**: `src/systems/` (SYSTEMS layer - game-wide rules)
- **Used By**: examine command (and potentially who, look, etc.)
- **Follows**: vibeMUD architecture hierarchy (CORE → SYSTEMS → LIB → WORLD)

### Description Components

When a player examines another player, they see:

1. **Base Description** (lewns only, for now)
   - 10 variations, consistently selected by player ID hash
   - Describes physical appearance with cartoon/looney flavor
   - Example: "This lewn appears to have been assembled from spare cartoon parts..."

2. **Level Description** (percentile-based)
   - No actual numbers shown
   - Qualitative assessment of experience
   - Ranges from "bewildered newbie" to "living legend"
   - Example: "They have the slightly bewildered look of someone who just figured out which end of the sword to hold..."

3. **Health Description** (quarters)
   - 4 states: 75-100%, 50-75%, 25-50%, 0-25%
   - Qualitative condition without showing HP numbers
   - Example: "They look healthy and hale, with the robust vigor of..."

4. **Equipment Description** (future)
   - Placeholder for when equipment system is implemented
   - Will show wielded weapons and worn armor
   - Currently returns null

5. **Guild Description**
   - Shows guild membership or guildless status
   - 5 guildless variations (selected by player ID hash)
   - Placeholder support for future guilds
   - Example: "Guildless and proud of it - or possibly just procrastinating on the paperwork..."

6. **Ghost Status** (conditional)
   - Only shown if player.isGhost is true
   - Dimmed text: "A ghostly aura surrounds this lewn..."

## Tone and Style

The descriptions follow "The Wumpy and Grift" MUD's distinctive voice:

- **Pratchett-style wit**: Self-aware, clever wordplay
- **Looney absurdism**: Cartoon physics, surreal observations
- **Urban authenticity**: Gritty but affectionate
- **Pop culture aware**: Natural references, not forced
- **Sensory detail**: Evocative, engaging descriptions

### Writing Principles
- Show, don't tell
- Second person ("They appear...")
- Present tense, active voice
- Conversational but not overly casual
- Humor that enhances, never detracts
- No game mechanic references

## Testing

Run the test script:
```bash
node test_descriptions.js
```

This demonstrates:
- All 4 test players (newbie, veteran, legend, ghost)
- Consistency test (same ID = same description)
- Variety test (different IDs = different descriptions)
- All 10 level descriptions
- All 4 health descriptions
- All 5 guildless descriptions
- Unknown guild handling
- System statistics

## Usage Example

```javascript
// In a command
const descSystem = require('../systems/descriptions');

// Generate complete description
const desc = descSystem.generateCompletePlayerDescription(player, entityManager, colors);

// Display to player
session.sendLine(desc.base);
session.sendLine(desc.level);
session.sendLine(desc.health);
if (desc.equipment) session.sendLine(desc.equipment);
session.sendLine(desc.guild);
if (desc.ghost) session.sendLine(desc.ghost);
```

## Future Enhancements

The system is designed to be extended:

1. **Additional Races**: Add description arrays for dwarves, elves, robots, etc.
2. **Guild System**: Add guild-specific descriptions to GUILD_DESCRIPTIONS object
3. **Equipment System**: Implement getEquipmentDescription() to show weapons/armor
4. **Buff/Debuff Display**: Add visible magical effects
5. **Mood System**: Add emotional state descriptions
6. **Custom Biographies**: Player-written description snippets

See `/home/micah/entity-manager-prototype/docs/DESCRIPTIONS_SYSTEM.md` for detailed extension instructions.

## Integration Notes

### Examine Command
The examine command automatically uses this system when examining players. No additional work needed.

### Future Commands
Other commands can easily integrate:
- `who` command - Show level descriptions in player list
- `look` command - Show base descriptions for players in room
- `score` command - Show your own descriptions

### Player Object Requirements
The system expects these player properties:
- `id` (required) - For consistent hash-based selection
- `race` (optional, defaults to 'lewn')
- `level` (optional, defaults to 1)
- `hp` (optional, defaults to 100)
- `maxHp` (optional, defaults to 100)
- `guild` (optional, defaults to 'guildless')
- `isGhost` (optional, defaults to false)

## Style Consistency

All 10 lewn base descriptions follow this pattern:
- Length: ~300-400 characters
- Structure: 2-3 sentences
- Focus: Physical appearance + philosophical observation
- Tone: Affectionate absurdism

All 10 level descriptions follow this pattern:
- Length: ~200-300 characters
- Structure: 1-2 sentences
- Focus: Confidence, competence, bearing
- Progression: Clear growth from newbie to legend

All 4 health descriptions follow this pattern:
- Length: ~200-300 characters
- Structure: 1-2 sentences
- Focus: Physical condition + humor
- Escalation: From healthy to critical

All 5 guildless descriptions follow this pattern:
- Length: ~150-200 characters
- Structure: 1 sentence
- Focus: Independence vs. indecision
- Tone: Wry, nonjudgmental

## Maintenance

When adding or editing descriptions:
1. **Backup first** - Copy existing descriptions
2. **Maintain count** - Keep 10 lewns, 10 levels, etc.
3. **Test variety** - Ensure different players get different descriptions
4. **Check length** - Keep similar to existing descriptions
5. **Preserve tone** - Match established style and voice
6. **Update docs** - Document any changes

## Technical Details

### Hash-Based Selection
Uses simple string hashing to consistently select descriptions based on player ID:
- Same player ID always gets the same base description
- Different player IDs get different descriptions (usually)
- Hash function is deterministic and fast

### Percentile Buckets for Levels
Assumes max level 100, divides into 10 buckets:
- 0-10%: Bucket 0 (levels 1-10)
- 10-20%: Bucket 1 (levels 11-20)
- ... etc ...
- 90-100%: Bucket 9 (levels 91-100)

Adjust `maxLevel` constant in `getLevelDescription()` if max level changes.

### Health Quarters
Simple percentage-based thresholds:
- 75-100%: Healthy
- 50-75%: Roughed up
- 25-50%: Hurting
- 0-25%: Critical

## File Locations

```
/home/micah/entity-manager-prototype/
├── src/
│   ├── systems/
│   │   └── descriptions.js          # Main system module
│   └── commands/
│       └── examine.js                # Updated to use system
├── docs/
│   └── DESCRIPTIONS_SYSTEM.md        # Full documentation
├── test_descriptions.js              # Test script
└── DESCRIPTION_SYSTEM_SUMMARY.md     # This file
```

## Quick Reference

### Adding a New Race

```javascript
// In src/systems/descriptions.js

const DWARF_BASE_DESCRIPTIONS = [
  "A stout dwarf with...",
  // ... 10 variations
];

// In generatePlayerDescription()
if (race === 'dwarf') {
  const hash = hashString(player.id);
  const index = hash % DWARF_BASE_DESCRIPTIONS.length;
  return DWARF_BASE_DESCRIPTIONS[index];
}

// Export
module.exports = {
  // ...
  DWARF_BASE_DESCRIPTIONS
};
```

### Adding a New Guild

```javascript
// In src/systems/descriptions.js

GUILD_DESCRIPTIONS = {
  guildless: [...],

  warriors: "They bear the proud colors of the Warriors' Guild..."
};
```

### Testing Your Changes

```bash
# Run the test script
node test_descriptions.js

# Or test in-game
npm start
# In another terminal: telnet localhost 4000
# Login and use: examine <other_player>
```

---

**Created**: 2025-11-21
**vibeMUD Engine**: The Wumpy and Grift
**Architecture**: SYSTEMS layer (game-wide rules)
