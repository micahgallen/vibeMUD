# Player Description System

## Overview

The player description system generates rich, flavorful descriptions when players examine each other in vibeMUD. It follows "The Wumpy and Grift" MUD's distinctive tone: witty, self-aware, and engaging.

**Location**: `/home/micah/entity-manager-prototype/src/systems/descriptions.js`

**Architecture Level**: SYSTEMS (game-wide rules)

## Features

The system generates descriptions based on:

1. **Base Race Description** - Physical appearance (currently lewns only)
2. **Level-Based Description** - Experience level without showing numbers
3. **Health Description** - Current condition qualitatively
4. **Equipment Display** - What they're wearing/wielding (future feature)
5. **Guild Affiliation** - Membership or lack thereof
6. **Special States** - Ghost status, buffs, etc.

## Usage

### In Commands

```javascript
const descSystem = require('../systems/descriptions');

// Generate complete description
const desc = descSystem.generateCompletePlayerDescription(player, entityManager, colors);

// Use individual parts
session.sendLine(desc.base);      // Base lewn description
session.sendLine(desc.level);     // Level-based flavor
session.sendLine(desc.health);    // Health status
session.sendLine(desc.equipment); // Equipment (if any)
session.sendLine(desc.guild);     // Guild affiliation
session.sendLine(desc.ghost);     // Ghost status (if applicable)
```

### Individual Functions

```javascript
// Get just one type of description
const baseDesc = descSystem.generatePlayerDescription(player);
const levelDesc = descSystem.getLevelDescription(player.level);
const healthDesc = descSystem.getHealthDescription(player.hp, player.maxHp);
const guildDesc = descSystem.getGuildDescription(player, colors);
const equipDesc = descSystem.getEquipmentDescription(player, entityManager, colors);
```

## Base Lewn Descriptions

Currently provides **10 variations** of lewn (looney being) descriptions. Each player gets a consistent description based on their player ID hash.

**Style Guide for Base Descriptions:**
- Emphasize cartoon physics and looney logic
- Self-aware about the absurdity of their existence
- Mix philosophical musings with practical observations
- Length: 2-3 sentences, around 150-200 characters
- Tone: Wry, affectionate, slightly existential

**Example:**
```javascript
"This lewn appears to have been drawn by an animator having a particularly good day.
Their proportions are enthusiastically optimistic about the laws of physics..."
```

## Level Descriptions

**10 percentile buckets** (0-10%, 10-20%, ... 90-100%) describe experience without showing numbers.

**Style Guide:**
- Focus on confidence, competence, and bearing
- Progress from "bewildered newbie" to "living legend"
- Avoid specific game mechanics or numbers
- Use humor and relatable observations
- Length: 1-2 sentences, around 100-150 characters

**Progression:**
1. 0-10%: Total newbie ("new-car smell")
2. 10-20%: Gaining confidence
3. 20-30%: Getting the hang of it
4. 30-40%: Solidly middling
5. 40-50%: Halfway decent
6. 50-60%: Above average
7. 60-70%: Quite experienced
8. 70-80%: Veteran status
9. 80-90%: Seriously powerful
10. 90-100%: Living legend

## Health Descriptions

**4 quarters** (75-100%, 50-75%, 25-50%, 0-25%) describe physical condition qualitatively.

**Style Guide:**
- Vivid and visceral without being graphic
- Escalate from "hale" to "critical"
- Inject humor even in dire situations
- Length: 1-2 sentences, around 80-120 characters

**Categories:**
1. 75-100%: Healthy and hale
2. 50-75%: Roughed up, functional
3. 25-50%: Hurting badly
4. 0-25%: Critical condition

## Guild Descriptions

Describes guild membership or guildless status.

**Currently Supported:**
- **Guildless**: 5 variations selected by player ID hash
  - Themes: independence, procrastination, commitment issues
  - Style: Wry, nonjudgmental, mildly teasing

**Future Guild Support:**
When guilds are implemented, add entries to `GUILD_DESCRIPTIONS` object:

```javascript
GUILD_DESCRIPTIONS = {
  guildless: [...],

  warriors: "They bear the proud colors of the Warriors' Guild, along with several impressive scars and a slightly concerning collection of weaponry.",

  mages: "Arcane symbols mark them as a member of the Mages' Guild. They have that particular glassy-eyed look of someone who reads too much and sleeps too little.",

  // etc.
}
```

## Equipment Descriptions

**Status**: Placeholder for future equipment system

When the equipment system is implemented, `getEquipmentDescription()` should return strings like:

```javascript
"They are wielding a rusty sword that's seen better days, and wearing leather armor
that suggests either pragmatism or poverty. Possibly both."
```

**Style Guide for Equipment:**
- List wielded weapon(s) first, then armor/clothing
- Add flavor based on item quality/condition
- Keep it concise (1 sentence)
- Make it visual and evocative

## Ghost Status

If `player.isGhost` is true, adds:
```
"A ghostly aura surrounds this lewn, suggesting a recent and unfortunate demise."
```

Displayed in dimmed color to emphasize the ethereal nature.

## Extending the System

### Adding New Races

1. Add base descriptions array for the race:
```javascript
const DWARF_BASE_DESCRIPTIONS = [
  "A stout dwarf with...",
  "This dwarf appears...",
  // ... 10 variations
];
```

2. Update `generatePlayerDescription()`:
```javascript
if (race === 'dwarf') {
  const hash = hashString(player.id);
  const index = hash % DWARF_BASE_DESCRIPTIONS.length;
  return DWARF_BASE_DESCRIPTIONS[index];
}
```

3. Export the new constant:
```javascript
module.exports = {
  // ...
  DWARF_BASE_DESCRIPTIONS
};
```

### Adding Guild Descriptions

Simply add a new key to `GUILD_DESCRIPTIONS`:

```javascript
GUILD_DESCRIPTIONS = {
  guildless: [...],

  thieves: "They wear the subtle markers of the Thieves' Guild - namely, they're constantly " +
           "checking their pockets to make sure their own guildmates haven't robbed them. " +
           "Professional paranoia is both a job requirement and a lifestyle choice."
};
```

### Adding New Description Types

To add a new type of description (e.g., mood, weather effects, buffs):

1. Create description arrays/objects:
```javascript
const MOOD_DESCRIPTIONS = {
  happy: "They seem cheerful, with...",
  angry: "They radiate barely contained rage...",
  // etc.
};
```

2. Create accessor function:
```javascript
function getMoodDescription(player) {
  const mood = player.mood || 'neutral';
  return MOOD_DESCRIPTIONS[mood] || 'They seem emotionally ambiguous.';
}
```

3. Update `generateCompletePlayerDescription()`:
```javascript
return {
  base: generatePlayerDescription(player),
  level: getLevelDescription(player.level || 1),
  health: getHealthDescription(player.hp || 100, player.maxHp || 100),
  mood: getMoodDescription(player),  // NEW
  equipment: getEquipmentDescription(player, entityManager, colors),
  guild: getGuildDescription(player, colors),
  ghost: player.isGhost ? colors.dim('...') : null
};
```

4. Export the new function:
```javascript
module.exports = {
  // ...
  getMoodDescription,
  MOOD_DESCRIPTIONS
};
```

## Writing Style Guidelines

When adding new descriptions, follow these principles:

### Tone
- **Self-aware**: Characters know they're in a MUD and don't mind
- **Witty**: Clever wordplay, not just random humor
- **Observational**: Comment on what things say about the character
- **Affectionate**: Mock gently, never cruelly

### Structure
- **Show, don't tell**: "wearing armor held together by hope" vs "poorly equipped"
- **Sensory details**: What do they look/sound/smell like?
- **Implication**: Let readers infer character from description
- **Rhythm**: Vary sentence length for readability

### Voice
- Second person for direct descriptions ("They appear...")
- Present tense ("They wear..." not "They were wearing...")
- Active voice ("They radiate confidence" not "Confidence is radiated")
- Conversational but not overly casual

### What to Avoid
- Game mechanic references ("+5 armor bonus")
- Fourth-wall breaking that breaks immersion
- Cruelty or punching down
- Repetitive sentence structures
- Excessive length (keep descriptions punchy)

## Examples of Good Descriptions

### Base Description (Lewn)
```
"This lewn has embraced their looney nature with practical enthusiasm. Their appearance
suggests someone took a normal person, put them through a cosmic cartoon filter, and
decided 'eh, good enough.' The result is a being that's simultaneously relatable and
impossible, ordinary and absurd - basically, they fit right in around here."
```

**Why it works:**
- Sets up the concept (looney + practical)
- Uses vivid imagery (cosmic cartoon filter)
- Ends with self-aware humor (fit right in)
- Balances description with personality

### Level Description (Mid-tier)
```
"There's a certain gravitas here, the kind that comes from surviving long enough to
develop opinions about optimal combat strategies. They move with purpose, like someone
who has memorized most of the map and only occasionally walks into walls anymore."
```

**Why it works:**
- Implies experience without numbers
- Specific, relatable detail (memorizing maps)
- Humor in the last clause
- Progressive growth feel

### Health Description (Critical)
```
"They look like they're one stiff breeze away from becoming a cautionary tale. Battered,
bruised, and held together by sheer stubborn refusal to admit defeat, they're the walking
embodiment of 'it's just a flesh wound.' Someone should really get them to a healer.
Like, immediately."
```

**Why it works:**
- Vivid imagery (one stiff breeze)
- Lists build urgency (battered, bruised, held together)
- Pop culture reference (flesh wound)
- Clear action implication (get healer NOW)

### Guild Description (Guildless)
```
"They wear the invisible badge of the unguilded with either dignified independence or
stubborn indecision. The jury is still out on which."
```

**Why it works:**
- Paradox (invisible badge/wearing it)
- Offers multiple interpretations
- Short and punchy
- Leaves judgment ambiguous

## Testing

Test descriptions with various player states:

```javascript
// Test different levels
const testPlayer = {
  id: 'test_001',
  race: 'lewn',
  level: 1,
  hp: 100,
  maxHp: 100
};

console.log(descSystem.generatePlayerDescription(testPlayer));
console.log(descSystem.getLevelDescription(1));
console.log(descSystem.getLevelDescription(50));
console.log(descSystem.getLevelDescription(100));

// Test different health states
console.log(descSystem.getHealthDescription(100, 100)); // Full health
console.log(descSystem.getHealthDescription(60, 100));  // 60%
console.log(descSystem.getHealthDescription(30, 100));  // 30%
console.log(descSystem.getHealthDescription(5, 100));   // Critical

// Test guild descriptions
testPlayer.guild = undefined;
console.log(descSystem.getGuildDescription(testPlayer, colors));

testPlayer.guild = 'warriors';
console.log(descSystem.getGuildDescription(testPlayer, colors));
```

## Integration with Examine Command

The examine command (`/home/micah/entity-manager-prototype/src/commands/examine.js`) automatically uses this system when examining players.

**Flow:**
1. Player types `examine <other_player>`
2. Examine command finds the target player
3. Calls `generateCompletePlayerDescription()`
4. Displays each description component with proper spacing
5. Shows ghost status if applicable

## Future Enhancements

Planned additions to this system:

1. **Equipment System Integration**: Actual wielded/worn item descriptions
2. **Additional Races**: Dwarves, elves, robots, etc.
3. **Guild System Integration**: Rich guild-specific descriptions
4. **Buff/Debuff Display**: Visible magical effects
5. **Mood System**: Emotional states affecting description
6. **Reputation System**: How others perceive the player
7. **Customizable Descriptions**: Player-set biography snippets
8. **Dynamic Elements**: Time-of-day, location-based modifiers

## Architecture Notes

**Why it's a SYSTEM:**
- Provides game-wide rules for descriptions
- Reusable across multiple commands (examine, who, etc.)
- Defines "how player descriptions work" for the entire MUD
- Not command-specific or world-specific

**Integration with Hierarchy:**
```
CORE (EntityManager, server)
  ↓
SYSTEMS (descriptions.js)  ← You are here
  ↓
LIB (object behaviors)
  ↓
WORLD (specific instances)
```

**Used By:**
- `commands/examine.js` - When examining players
- `commands/who.js` - (Future) Who list with descriptions
- `commands/look.js` - (Future) Room contents with player descriptions
- Any command that needs to describe a player

## Maintenance

When editing descriptions:

1. **Backup First**: Copy existing descriptions before changing
2. **Maintain Count**: Keep 10 lewn variations, 10 level buckets, etc.
3. **Test Variety**: Ensure different players get different descriptions
4. **Check Length**: Keep descriptions readable and similar length
5. **Preserve Tone**: Match existing style and voice
6. **Update Docs**: Document any new features or changes

## Credits

Written for "The Wumpy and Grift" MUD, running on vibeMUD engine.

Style inspired by Terry Pratchett's wit, Stephen King's atmosphere, and LooneyMUD's irreverence.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-21
**System**: descriptions.js
**Engine**: vibeMUD
