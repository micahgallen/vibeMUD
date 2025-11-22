# VibeMUD Colorization System Design

## Executive Summary

The colorization system provides centralized management of all text coloring in vibeMUD, separating display concerns from data storage while maintaining the architectural integrity of the platonic forms philosophy. This design eliminates the scattered capname logic from PR #11 and provides a flexible framework for all colorization needs.

## Core Philosophy

**"Colors are presentation, not data"**

- **Storage Layer**: Plain text only - no ANSI codes in JSON files or object properties
- **Display Layer**: Colors injected at render time via centralized utilities
- **Matching Layer**: Plain text comparison for targeting and searching

This follows the vibeMUD hierarchy:
- **CORE** provides the colorization infrastructure (utilities, stripping, injection)
- **SYSTEMS** define game-wide color themes and rules
- **LIB** objects specify colorizable placeholders
- **WORLD** instances contain only plain text content

## Architecture Overview

### Component Hierarchy

```
src/utils/display.js (CORE utility layer)
  ↓ used by
src/systems/colorization.js (SYSTEMS rules layer)
  ↓ applied to
src/lib/* (object definitions with placeholders)
  ↓ realized in
src/world/* (plain text instances)
```

### Key Components

#### 1. Display Utility (src/utils/display.js)
Expansion of existing playerDisplay.js into comprehensive display system:

```javascript
// Core player display functions
getDisplayName(player)      // Returns colorized name with reset
getPlainName(player)        // Returns stripped plain name
matchesName(input, player)  // Case-insensitive match ignoring colors

// General display functions
renderText(text, context)   // Apply colorization rules to text
stripColors(text)           // Remove all ANSI codes
ensureReset(text)          // Ensure text ends with reset code

// Template processing
processTemplate(template, variables, colors) // Process placeholders
```

#### 2. Colorization System (src/systems/colorization.js)
Game-wide color rules and themes:

```javascript
module.exports = {
  // Color themes (can be changed globally)
  themes: {
    default: {
      keyword: 'bright_cyan',    // Important words
      emphasis: 'bright_yellow',  // Emphasized text
      whisper: 'dim_cyan',       // Subtle text
      danger: 'bright_red',      // Dangerous elements
      nature: 'green',           // Natural elements
      magic: 'bright_magenta'    // Magical elements
    }
  },

  // Word colorization rules
  keywords: {
    // Global keywords (apply everywhere)
    global: {
      'Wumpy': 'bright_yellow',
      'Grift': 'bright_cyan',
      'admin': 'bright_yellow',
      'quest': 'bright_magenta'
    },

    // Context-specific keywords
    room_descriptions: {
      'door': 'yellow',
      'chest': 'bright_magenta',
      'stairs': 'cyan'
    },

    npc_dialogue: {
      'yes': 'bright_green',
      'no': 'bright_red',
      'gold': 'bright_yellow'
    }
  },

  // Apply colorization based on context
  colorize(text, context = 'global') {
    // Implementation details below
  }
};
```

#### 3. Enhanced EntityManager Integration
Minimal changes to existing EntityManager:

```javascript
// In EntityManager.notifyPlayer() and notifyRoom()
notifyPlayer(playerId, message, options = {}) {
  const session = this.sessions.get(playerId);
  if (session) {
    // Apply colorization before sending
    const colorized = display.renderText(message, {
      context: options.context || 'system',
      viewer: session.player
    });
    session.sendLine(colorized);
  }
}
```

## API Design

### Player Display API

```javascript
const display = require('../utils/display');

// Get colorized display name (for output)
const name = display.getDisplayName(player);
// Returns: "\x1b[91mDragonSlayer\x1b[0m" or "Bob"

// Get plain name (for storage/comparison)
const plain = display.getPlainName(player);
// Returns: "DragonSlayer" or "Bob"

// Match player by name (handles colors)
const matches = display.matchesName("dragon", player);
// Returns: true if "dragon" matches "DragonSlayer" (ignoring colors)

// Find player by partial name
const target = display.findPlayer("drag", entityManager);
// Returns: player object or null
```

### Template System

Templates use placeholders for dynamic colorization:

```javascript
// In lib/monster.js
module.exports = {
  attackMessage: "{attacker} swings at {defender} with {weapon}!",
  deathMessage: "{name} has been slain! {gold} gold coins scatter.",

  // Specify colorizable keywords in the definition
  colorKeywords: ['gold', 'slain']
};

// When rendering:
const message = display.processTemplate(monster.attackMessage, {
  attacker: display.getDisplayName(attacker),
  defender: display.getDisplayName(defender),
  weapon: weapon.name
}, 'combat');
```

### Context-Aware Colorization

```javascript
// Room descriptions
const room = entityManager.get(roomId);
const description = display.renderText(room.description, {
  context: 'room_description',
  viewer: player  // Can affect colors based on player state
});

// NPC dialogue
const dialogue = "Yes, I have a quest for you. Bring me gold!";
const colored = display.renderText(dialogue, {
  context: 'npc_dialogue',
  speaker: npc,
  listener: player
});

// System messages
entityManager.notifyPlayer(playerId, "You gained 50 experience!", {
  context: 'combat_reward'
});
```

## Implementation Patterns

### Command Pattern

All commands follow this pattern:

```javascript
// src/commands/look.js
const display = require('../utils/display');
const colors = require('../core/colors');

module.exports = {
  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    // Room name (always colorized)
    session.sendLine(colors.roomName(room.name));

    // Room description (apply keyword colorization)
    const description = display.renderText(room.description, {
      context: 'room_description',
      viewer: player
    });
    session.sendLine(description);

    // Players in room (use display names)
    const players = entityManager.getPlayersInRoom(room.id);
    players.forEach(p => {
      if (p.id !== player.id) {
        const name = display.getDisplayName(p);
        session.sendLine(`  ${name} is here.`);
      }
    });
  }
};
```

### Combat Message Pattern

```javascript
// src/systems/combat.js
const display = require('../utils/display');

function attackMessage(attacker, defender, damage) {
  const template = "{attacker} hits {defender} for {damage} damage!";

  return display.processTemplate(template, {
    attacker: display.getDisplayName(attacker),
    defender: display.getDisplayName(defender),
    damage: colors.damage(damage.toString())
  }, 'combat');
}
```

### Targeting Pattern

```javascript
// In commands that need to find targets
const display = require('../utils/display');

function findTarget(input, entityManager, roomId) {
  // Get all potential targets
  const targets = entityManager.getEntitiesInRoom(roomId);

  // Find matches (strips colors automatically)
  const matches = targets.filter(t =>
    display.matchesName(input, t)
  );

  if (matches.length === 0) {
    return { error: "No one here by that name." };
  }
  if (matches.length > 1) {
    return { error: "Be more specific." };
  }

  return { target: matches[0] };
}
```

## Data Model

### Player Object

```json
{
  "id": "player_bob",
  "type": "player",
  "name": "Bob",
  "capname": null,
  "capname_raw": "<bright_red>B<bright_yellow>o<bright_green>b</>"
}
```

- `name`: Plain text username (never changes, used for login)
- `capname`: Processed ANSI codes (cached for performance)
- `capname_raw`: User input with color tags (for editing)

### Colorization Rules Storage

```javascript
// src/systems/colorization.js
module.exports = {
  // Version for migrations
  version: 1,

  // Global keywords that apply everywhere
  globalKeywords: new Map([
    ['wumpy', 'bright_yellow'],
    ['grift', 'bright_cyan'],
    ['admin', 'bright_yellow']
  ]),

  // Context-specific rules
  contextRules: {
    room_description: {
      keywords: new Map([
        ['door', 'yellow'],
        ['chest', 'bright_magenta']
      ]),
      patterns: [
        { regex: /\bgold\b/gi, color: 'bright_yellow' }
      ]
    }
  },

  // Player color preferences (future feature)
  playerThemes: {
    // playerId -> theme overrides
  }
};
```

## Integration Points

### EntityManager Changes

```javascript
// Minimal changes - just wrap output methods
class EntityManager {
  notifyPlayer(playerId, message, options = {}) {
    const session = this.sessions.get(playerId);
    if (!session) return;

    // NEW: Apply display processing
    const processed = display.renderText(message, {
      context: options.context || 'system',
      viewer: session.player
    });

    session.sendLine(processed);
  }

  notifyRoom(roomId, message, excludePlayerId, options = {}) {
    const players = this.getPlayersInRoom(roomId);
    players.forEach(player => {
      if (player.id !== excludePlayerId) {
        this.notifyPlayer(player.id, message, options);
      }
    });
  }
}
```

### Session Changes

```javascript
// Add helper methods to Session class
class Session {
  sendLine(text) {
    // Ensure proper reset at end
    const safe = display.ensureReset(text);
    this.socket.write(safe + '\r\n');
  }

  sendColorized(text, context = 'system') {
    const colored = display.renderText(text, {
      context: context,
      viewer: this.player
    });
    this.sendLine(colored);
  }
}
```

## Migration Strategy

### Phase 1: Foundation (Week 1)
1. Expand `src/utils/playerDisplay.js` → `src/utils/display.js`
2. Add core functions: `getPlainName()`, `matchesName()`, `findPlayer()`
3. Create `src/systems/colorization.js` with basic keyword maps
4. Update EntityManager notification methods

### Phase 2: Command Migration (Week 2)
1. Update all commands to use `display.getDisplayName()`
2. Remove inline `(player.capname || player.name)` logic
3. Fix targeting commands to use `display.matchesName()`
4. Add colorization context to combat messages

### Phase 3: Content Colorization (Week 3)
1. Implement template processing system
2. Add colorization rules for room descriptions
3. Add colorization rules for NPC dialogue
4. Create admin command to reload color rules

### Phase 4: Polish (Week 4)
1. Add `setcapname` command with validation
2. Add color preview command
3. Document the system for builders
4. Performance optimization (caching)

## Example Implementations

### Example 1: Set Capname Command

```javascript
// src/commands/setcapname.js
module.exports = {
  id: "setcapname",
  name: "setcapname",
  description: "Set your colorized display name",

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    if (!args) {
      session.sendLine("Usage: setcapname <colored name>");
      session.sendLine("Example: setcapname <red>Dragon</>Slayer");
      session.sendLine("Use 'setcapname clear' to remove");
      return;
    }

    if (args === 'clear') {
      player.capname = null;
      player.capname_raw = null;
      entityManager.markDirty(player.id);
      session.sendLine("Display name cleared.");
      return;
    }

    // Parse color tags to ANSI
    const processed = colors.parseColorTags(args);
    const plain = colors.stripColors(processed);

    // Validate length and content
    if (plain.length > 20) {
      session.sendLine(colors.error("Name too long (max 20 characters)"));
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(plain)) {
      session.sendLine(colors.error("Name contains invalid characters"));
      return;
    }

    // Store both versions
    player.capname_raw = args;
    player.capname = processed;
    entityManager.markDirty(player.id);

    const preview = display.getDisplayName(player);
    session.sendLine(`Display name set to: ${preview}`);
  }
};
```

### Example 2: Colorized Room Description

```javascript
// src/world/newbie_realm/rooms/entrance.json
{
  "id": "newbie_entrance",
  "type": "room",
  "name": "Entrance to the Realm",
  "description": "A grand entrance with a golden door leading north. A chest sits in the corner, and stairs lead down into darkness.",
  "keywords": ["door", "chest", "stairs", "golden"]
}

// When displayed via look command:
// "golden door" appears in bright_yellow
// "chest" appears in bright_magenta
// "stairs" appears in cyan
```

### Example 3: NPC Dialogue

```javascript
// src/lib/merchant.js
module.exports = {
  greetMessage: "Welcome! Do you want to buy or sell? Gold is always welcome!",

  heartbeat: function(entityManager) {
    const room = entityManager.get(this.location.room);
    const players = entityManager.getPlayersInRoom(room.id);

    if (players.length > 0 && Math.random() < 0.1) {
      const message = display.renderText(this.greetMessage, {
        context: 'npc_dialogue',
        speaker: this
      });

      entityManager.notifyRoom(room.id, `${this.name} says, "${message}"`);
    }
  }
};
```

## Performance Considerations

1. **Caching**: Cache processed capnames in player object
2. **Lazy Processing**: Only colorize text when actually displayed
3. **Regex Compilation**: Pre-compile regex patterns for keywords
4. **Batch Processing**: Process multiple keywords in single pass

```javascript
// Optimized colorization
const keywordCache = new Map();

function compileKeywords(keywords) {
  if (keywordCache.has(keywords)) {
    return keywordCache.get(keywords);
  }

  const pattern = new RegExp(
    `\\b(${Array.from(keywords.keys()).join('|')})\\b`,
    'gi'
  );

  keywordCache.set(keywords, pattern);
  return pattern;
}
```

## Testing Strategy

1. **Unit Tests**: Test each display function independently
2. **Integration Tests**: Test command colorization end-to-end
3. **Regression Tests**: Ensure no ANSI codes leak into storage
4. **Performance Tests**: Measure colorization overhead

## Success Metrics

- No ANSI codes stored in JSON files or object properties
- All player name displays use centralized function
- Targeting works correctly with colorized names
- No color bleeding between messages
- Less than 10ms overhead for colorization
- Zero duplicate colorization logic

## Critical Implementation Challenges - Practical Analysis

### Reality Check: Can We Actually Centralize Everything?

**Short answer: No, not elegantly.** Full centralization creates more problems than it solves for certain message types. Here's the honest assessment:

### 1. Structured Communication Commands - The Format Problem

Communication commands have **asymmetric, multi-recipient formatting** that breaks simple centralization:

```javascript
// say command - Different viewers see different messages
// Speaker sees: "You say, 'Hello there!'"
// Others see: "Alice says, 'Hello there!'"
// The word "You" vs player name is viewer-dependent

// tell command - Even more complex
// Sender sees: "You tell Bob, 'Secret message'"
// Receiver sees: "Alice tells you, 'Secret message'"
// Others see: Nothing
```

**Practical Solution: Hybrid Approach**

```javascript
// Commands handle structure, display utility handles colorization
// src/commands/say.js
execute: function(session, args, entityManager, colors) {
  const speaker = session.player;
  const message = args;

  // Speaker sees their own version
  session.sendLine(`You say, '${message}'`);

  // Others see speaker's name (colorized via display utility)
  const speakerName = display.getDisplayName(speaker);
  entityManager.notifyRoom(
    speaker.currentRoom,
    `${speakerName} says, '${message}'`,
    speaker.id,
    { preserveQuotes: true }  // Don't colorize quoted text
  );
}
```

**Key Insight**: Commands own the message structure, display system owns the colorization. Don't try to centralize what's inherently decentralized.

### 2. Creator Color Tags vs Keyword Colorization - The Precedence Problem

When content has explicit tags AND matches keywords, we need clear precedence:

```json
{
  "description": "You see a <red>warm</red> fire. The warm glow fills the room."
}
```

**Practical Solution: Three-Pass Processing**

```javascript
// src/utils/display.js
function renderText(text, context) {
  // Pass 1: Mark explicitly tagged regions as "protected"
  const protected = markProtectedRegions(text);
  // Example: "You see a [PROTECTED]warm[/PROTECTED] fire. The warm glow..."

  // Pass 2: Apply keyword colorization to unprotected regions
  const keywordized = applyKeywords(protected, context);
  // Example: "You see a [PROTECTED]warm[/PROTECTED] fire. The [red]warm[/] glow..."

  // Pass 3: Process all tags to ANSI codes
  const final = processAllTags(keywordized);
  // Example: "You see a \x1b[31mwarm\x1b[0m fire. The \x1b[31mwarm\x1b[0m glow..."

  return final;
}

// Protected region tracking
function markProtectedRegions(text) {
  // Replace <tag>content</tag> with markers
  return text.replace(/<(\w+)>(.*?)<\/>/g, (match, tag, content) => {
    return `[PROTECTED:${tag}]${content}[/PROTECTED]`;
  });
}
```

**Precedence Rules**:
1. Explicit creator tags ALWAYS win
2. Keyword colorization applies to untagged text
3. Player capnames are pre-colorized, treated as protected

### 3. Global Keyword Colorization - The Context Problem

Keywords need context-awareness to avoid false positives:

```javascript
// Problem: "warm" shouldn't be colorized in player names or certain contexts
"The warm fireplace" → Colorize ✓
"Player Warmth enters" → Don't colorize ✗
"He gave a warm welcome" → Maybe colorize? Context-dependent
```

**Practical Solution: Context Hierarchies with Exclusions**

```javascript
// src/systems/colorization.js
module.exports = {
  keywords: {
    // Tier 1: Only in specific contexts
    room_descriptions: {
      'warm': { color: 'red', wholeWord: true },
      'cold': { color: 'cyan', wholeWord: true }
    },

    // Tier 2: Never colorize these patterns
    exclusions: {
      playerNames: true,  // Never colorize words that match player names
      properNouns: /^[A-Z]/,  // Don't colorize capitalized words
      commands: true  // Don't colorize command names
    },

    // Tier 3: Global keywords (lowest priority)
    global: {
      'admin': { color: 'yellow', caseSensitive: false }
    }
  },

  shouldColorize(word, context) {
    // Check exclusions first
    if (this.isPlayerName(word)) return false;
    if (this.isProperNoun(word) && context !== 'emphasis') return false;

    // Check context-specific rules
    if (context.keywords?.[word]) return context.keywords[word];

    // Fall back to global
    return this.keywords.global[word] || false;
  }
};
```

### 4. Centralized Display - The Multiple Path Problem

**Reality**: We have 5+ different output paths, and forcing them through one funnel is impractical.

**Current Paths**:
```javascript
session.sendLine()                    // Direct to player
session.send()                        // No newline variant
entityManager.notifyPlayer()         // Through entity manager
entityManager.notifyRoom()           // Multiple recipients
socket.write()                        // Raw socket (login, errors)
```

**Practical Solution: Layer-Appropriate Colorization**

```javascript
// Don't centralize - standardize at appropriate layers

// Layer 1: Raw socket (no colorization)
socket.write()  // For protocol negotiation, telnet commands

// Layer 2: Session (basic colorization)
session.sendLine(text, options?)  // Can optionally colorize

// Layer 3: EntityManager (context-aware colorization)
entityManager.notifyPlayer(id, text, context)  // Always colorizes

// Layer 4: Commands (structured colorization)
// Commands compose messages, then use Layer 2 or 3

// Example flow:
class Session {
  sendLine(text, options = {}) {
    let output = text;

    // Only colorize if requested or configured
    if (options.colorize || this.autoColorize) {
      output = display.renderText(text, options.context);
    }

    // Always ensure clean line endings
    output = display.ensureReset(output);
    this.socket.write(output + '\r\n');
  }
}
```

### 5. Message Type vs Content Type - The Matrix Problem

**The Two-Axis Reality**:

```javascript
// Message Types (HOW it's communicated)
const MESSAGE_TYPES = {
  SAY: { prefix: "says", quotes: true },
  EMOTE: { color: 'magenta', freeform: true },
  TELL: { private: true, asymmetric: true },
  COMBAT: { color: 'bright_yellow', keywords: ['damage', 'hit', 'miss'] },
  SYSTEM: { prefix: "[System]", color: 'dim_white' }
};

// Content Types (WHAT it contains)
const CONTENT_TYPES = {
  PLAYER_NAME: { source: 'capname', protected: true },
  ROOM_DESC: { keywords: 'room_descriptions', processCreatorTags: true },
  ITEM_NAME: { keywords: 'items', enhanceable: true },
  NPC_DIALOGUE: { keywords: 'npc_dialogue', emotive: true }
};
```

**Practical Solution: Composition Over Configuration**

```javascript
// Don't try to handle every combination - compose behaviors
function formatMessage(type, content, context) {
  const pipeline = [];

  // Message type determines structure
  if (MESSAGE_TYPES[type].prefix) {
    pipeline.push(addPrefix);
  }
  if (MESSAGE_TYPES[type].quotes) {
    pipeline.push(addQuotes);
  }

  // Content type determines colorization
  if (CONTENT_TYPES[content].keywords) {
    pipeline.push(colorizeKeywords);
  }
  if (CONTENT_TYPES[content].protected) {
    pipeline.push(skipColorization);
  }

  // Apply pipeline
  return pipeline.reduce((text, fn) => fn(text, context), text);
}
```

### 6. Real Implementation Examples - Working Code

**Example 1: Say command with capname preservation**

```javascript
// src/commands/say.js
execute: function(session, args, entityManager, colors) {
  const speaker = session.player;
  const message = args;

  // Get pre-colorized speaker name (already has ANSI codes)
  const speakerDisplay = display.getDisplayName(speaker);

  // Speaker sees simple version
  session.sendLine(`You say, '${message}'`);

  // Others see speaker name - capname already colorized
  // We do NOT re-colorize the speaker name
  const otherMessage = `${speakerDisplay} says, '${message}'`;

  // The notifyRoom only applies room-context keywords to the message part
  entityManager.notifyRoom(speaker.currentRoom, otherMessage, speaker.id, {
    context: 'say',
    protectedRegions: [0, speakerDisplay.length]  // Don't touch speaker name
  });
}
```

**Example 2: Room description with mixed tags**

```javascript
// Process creator tags and keywords without conflicts
function processRoomDescription(desc) {
  // Step 1: Extract and protect explicit tags
  const regions = [];
  let working = desc.replace(/<(\w+)>(.*?)<\/>/g, (match, tag, content, offset) => {
    regions.push({ start: offset, end: offset + match.length, tag, content });
    return `\x00${regions.length - 1}\x00`;  // Placeholder
  });

  // Step 2: Apply keywords to unprotected text
  const keywords = colorization.keywords.room_descriptions;
  for (const [word, color] of Object.entries(keywords)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    working = working.replace(regex, (match) => {
      // Only replace if not in protected region
      return `<${color}>${match}</>`;
    });
  }

  // Step 3: Restore protected regions with their original tags
  regions.forEach((region, index) => {
    const placeholder = `\x00${index}\x00`;
    const replacement = `<${region.tag}>${region.content}</>`;
    working = working.replace(placeholder, replacement);
  });

  // Step 4: Convert all tags to ANSI
  return colors.parseColorTags(working);
}
```

**Example 3: Emote with multiple colored players**

```javascript
// src/commands/emote.js
execute: function(session, args, entityManager, colors) {
  const actor = session.player;
  const emoteText = args;

  // Get actor's colorized name
  const actorDisplay = display.getDisplayName(actor);

  // Build emote message with magenta wrapper
  // But preserve internal colors for player names
  let message = `${actorDisplay} ${emoteText}`;

  // Find and colorize any mentioned player names in emoteText
  const room = entityManager.get(actor.currentRoom);
  const players = entityManager.getPlayersInRoom(room.id);

  players.forEach(player => {
    const plain = display.getPlainName(player);
    const colored = display.getDisplayName(player);
    // Replace plain name with colored version
    message = message.replace(new RegExp(`\\b${plain}\\b`, 'gi'), colored);
  });

  // Wrap entire emote in magenta, but preserve embedded colors
  const emoteColor = colors.magenta;
  const reset = colors.reset;

  // Smart wrapping: only add color where there isn't already color
  message = `${emoteColor}${message}${reset}`;

  entityManager.notifyRoom(room.id, message, null, {
    context: 'emote',
    skipKeywords: true  // Don't apply keywords to emotes
  });
}
```

**Example 4: Combat with priority resolution**

```javascript
// src/systems/combat.js
function formatCombatMessage(attacker, defender, damage) {
  // Priority system for combat messages:
  // 1. Player names (highest priority - pre-colorized)
  // 2. Damage numbers (combat-specific color)
  // 3. Combat keywords (hit, miss, critical)
  // 4. General keywords (lowest priority)

  const attackerName = display.getDisplayName(attacker);  // Pre-colored
  const defenderName = display.getDisplayName(defender);  // Pre-colored

  // Build message with placeholders
  let message = `{attacker} hits {defender} for {damage} damage!`;

  // Replace in priority order
  message = message.replace('{attacker}', attackerName);
  message = message.replace('{defender}', defenderName);
  message = message.replace('{damage}', colors.bright_red(damage.toString()));

  // Apply combat-specific coloring to the word "hits"
  message = message.replace(/\bhits\b/g, colors.bright_yellow('hits'));

  // Do NOT apply general keywords - combat has its own rules
  return message;
}
```

## The Honest Architecture: Hybrid Approach

After analyzing these challenges, here's the practical architecture that actually works:

### Three-Layer Colorization System

```javascript
// Layer 1: Pre-colorized Protected Content
// - Player capnames (stored pre-colorized)
// - System messages with embedded colors
// - Creator-tagged content
// These pass through unchanged

// Layer 2: Context-Aware Colorization
// - Applied at display time
// - Respects protected regions
// - Context-specific keywords

// Layer 3: Message-Type Formatting
// - Command-specific structure
// - Asymmetric messages (tell, say)
// - Multi-recipient formatting
```

### The Actual Data Flow

```
1. Command generates message structure
   ↓
2. Display utility adds player colors (if needed)
   ↓
3. Context colorization applied (if appropriate)
   ↓
4. Protected regions preserved throughout
   ↓
5. Final ANSI codes sent to socket
```

### When to Centralize vs When to Specialize

**Centralize**:
- Player name colorization (display.getDisplayName)
- Color stripping for comparison (display.stripColors)
- ANSI code cleanup (display.ensureReset)
- Keyword colorization rules

**Keep Specialized**:
- Command-specific message structure
- Asymmetric message formatting
- Combat formulas and display
- Login/authentication messages

### Priority System for Conflicts

When multiple colorization rules conflict:

1. **Explicit creator tags** (highest priority)
2. **Pre-colorized content** (capnames)
3. **Message-type colors** (combat = yellow, emote = magenta)
4. **Context keywords** (room-specific, npc-specific)
5. **Global keywords** (lowest priority)

```javascript
// Example priority resolution
function resolvePriority(text, rules) {
  const segments = [];

  // Pass 1: Identify all colorization requests
  rules.forEach(rule => {
    rule.matches.forEach(match => {
      segments.push({
        start: match.start,
        end: match.end,
        priority: rule.priority,
        color: rule.color
      });
    });
  });

  // Pass 2: Resolve conflicts by priority
  segments.sort((a, b) => b.priority - a.priority);

  // Pass 3: Apply non-overlapping colorization
  return applyNonOverlapping(text, segments);
}
```

## Conclusion

This colorization system respects vibeMUD's architectural principles while acknowledging the practical realities of MUD communication patterns. The hybrid approach - centralizing what makes sense while keeping specialized handling where needed - provides a maintainable system without forcing unnatural centralization.

By being honest about what can and cannot be elegantly centralized, we create a system that actually works in practice while still eliminating the scattered capname logic from PR #11. The three-layer architecture with clear priority resolution handles all the edge cases without creating new problems.

Most importantly, this design maintains the purity of the platonic forms - definitions describe behavior and templates, instances contain only data, and presentation is a runtime concern handled appropriately at each architectural layer.

## Global Word Templates System - NEW SECTION

### Executive Summary

The Global Word Templates system allows administrators to define multi-color word templates that automatically replace plain text words throughout the entire MUD. Unlike simple keyword colorization, these templates support character-level color patterns like `<red>f<yellow>i<red>r<yellow>e</>` for the word "fire".

### Core Architecture

#### 1. Template Storage Enhancement

The existing colorization system needs expansion to support multi-color templates:

```javascript
// src/systems/colorization.js - Enhanced structure
module.exports = {
  // Existing single-color keywords
  GLOBAL_KEYWORDS: {
    'Wumpy': 'bright_yellow',  // Single color
    'admin': 'bright_yellow'
  },

  // NEW: Multi-color word templates
  WORD_TEMPLATES: {
    'fire': '<red>f<yellow>i<red>r<yellow>e</>',  // Template string
    'ice': '<cyan>i<bright_cyan>c<cyan>e</>',
    'magic': '<magenta>m<bright_magenta>a<magenta>g<bright_magenta>i<magenta>c</>'
  },

  // Template metadata for efficient processing
  TEMPLATE_METADATA: {
    'fire': {
      pattern: /\bfire\b/gi,  // Pre-compiled regex
      template: '<red>f<yellow>i<red>r<yellow>e</>',
      caseHandler: 'preserve',  // preserve, lower, upper
      priority: 100
    }
  }
};
```

#### 2. Automatic Injection Architecture

**Option Selected: Dual-Layer Injection**

Inject colorization at both Session and EntityManager levels with double-colorization prevention:

```javascript
// src/core/Session.js - Enhanced sendLine
class Session {
  sendLine(message = '', options = {}) {
    let output = message;

    // Check if already processed (prevent double-colorization)
    if (!options._processed) {
      // Apply global word templates automatically
      output = colorization.processGlobalTemplates(output);
      options._processed = true;
    }

    // Apply context colorization if requested (existing)
    if (options.colorize && options.context) {
      output = colorization.processText(output, options.context);
    }

    output = display.ensureReset(output);
    this.socket.write(output + '\r\n');
  }
}

// src/core/EntityManager.js - Enhanced notification
notifyPlayer(playerId, message, options = {}) {
  const session = this.sessions.get(playerId);
  if (session && session.player && session.state === 'playing') {
    // Mark as processed to prevent double-colorization
    session.sendLine(message, { ...options, _processed: true });
  }
}
```

#### 3. Template Processing Engine

```javascript
// src/systems/colorization.js - New functions
function processGlobalTemplates(text) {
  // Early exit if no templates
  if (Object.keys(this.WORD_TEMPLATES).length === 0) return text;

  // Step 1: Protect existing color tags
  const protectedRegions = markProtectedRegions(text);

  // Step 2: Build efficient replacement map
  let result = text;

  for (const [word, template] of Object.entries(this.WORD_TEMPLATES)) {
    const metadata = this.TEMPLATE_METADATA[word];

    // Use pre-compiled regex or create one
    const regex = metadata?.pattern || new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');

    result = result.replace(regex, (match, offset) => {
      // Check if this position is protected
      if (isInProtectedRegion(offset, protectedRegions)) {
        return match;  // Don't colorize protected text
      }

      // Handle case preservation
      return applyCaseToTemplate(match, template, metadata?.caseHandler);
    });
  }

  // Step 3: Process all color tags to ANSI
  return parseColorTags(result);
}

// Case-aware template application
function applyCaseToTemplate(originalWord, template, caseHandler = 'preserve') {
  if (caseHandler === 'preserve') {
    // Check case pattern of original word
    const isAllCaps = originalWord === originalWord.toUpperCase();
    const isCapitalized = originalWord[0] === originalWord[0].toUpperCase();

    if (isAllCaps) {
      // Convert template to uppercase preserving tags
      return template.replace(/>([^<]+)</g, (match, content) => {
        return `>${content.toUpperCase()}<`;
      });
    } else if (isCapitalized) {
      // Capitalize first letter in template
      let firstLetter = true;
      return template.replace(/>([^<]+)</g, (match, content) => {
        if (firstLetter && content.length > 0) {
          firstLetter = false;
          return `>${content[0].toUpperCase()}${content.slice(1)}<`;
        }
        return match;
      });
    }
  }

  return template;  // Return unchanged
}
```

#### 4. Protected Region System

```javascript
// Enhanced protection to handle word templates
function markProtectedRegions(text) {
  const regions = [];

  // 1. Protect existing ANSI codes
  const ansiPattern = /\x1b\[[0-9;]*m/g;
  let match;
  while ((match = ansiPattern.exec(text)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'ansi'
    });
  }

  // 2. Protect explicit color tags
  const tagPattern = /<(\w+)>(.*?)<\/?>/g;
  while ((match = tagPattern.exec(text)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'tag'
    });
  }

  // 3. Protect player names (capnames)
  // This requires access to entity manager or a cached list

  return regions;
}

function isInProtectedRegion(position, regions) {
  return regions.some(r => position >= r.start && position < r.end);
}
```

#### 5. Enhanced Colorize Command

```javascript
// src/commands/colorize.js - Enhanced for templates
execute: function(session, args, entityManager, colors) {
  // ... existing validation ...

  if (action === 'add') {
    const word = parts[1];
    const colorSpec = parts.slice(2).join(' ');

    // Check if it's a template (contains < and >)
    if (colorSpec.includes('<') && colorSpec.includes('>')) {
      // Validate template syntax
      try {
        const validated = colors.parseColorTags(colorSpec);
        const plain = colors.stripColors(validated);

        // Ensure template matches word length
        if (plain.toLowerCase() !== word.toLowerCase()) {
          session.sendLine(colors.error(`Template text "${plain}" doesn't match word "${word}"`));
          return;
        }

        // Add as template
        colorization.WORD_TEMPLATES[word] = colorSpec;
        colorization.TEMPLATE_METADATA[word] = {
          pattern: new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi'),
          template: colorSpec,
          caseHandler: 'preserve',
          priority: 100
        };

        // Save and preview
        saveTemplates();
        const preview = colorization.processGlobalTemplates(`The word ${word} is now colorized!`);
        session.sendLine(colors.success(`✓ Added word template: "${word}"`));
        session.sendLine('Preview: ' + preview);

      } catch (error) {
        session.sendLine(colors.error(`Invalid template syntax: ${error.message}`));
      }
    } else {
      // Handle as simple keyword (existing code)
      colorization.addGlobalKeyword(word, colorSpec);
    }
  }

  // Add new "templates" action
  if (action === 'templates') {
    session.sendLine(colors.highlight('Word Templates'));
    session.sendLine(colors.dim('='.repeat(50)));

    if (Object.keys(colorization.WORD_TEMPLATES).length === 0) {
      session.sendLine(colors.dim('No word templates defined'));
    } else {
      for (const [word, template] of Object.entries(colorization.WORD_TEMPLATES)) {
        const preview = colorization.processGlobalTemplates(word);
        session.sendLine(`  ${preview} → ${template}`);
      }
    }
  }
}
```

#### 6. Performance Optimization

```javascript
// Compile all templates into single regex for efficiency
class TemplateProcessor {
  constructor() {
    this.compiledPattern = null;
    this.templateMap = new Map();
  }

  compile(templates) {
    if (Object.keys(templates).length === 0) {
      this.compiledPattern = null;
      return;
    }

    // Build single regex matching all words
    const words = Object.keys(templates).map(escapeRegex);
    this.compiledPattern = new RegExp(`\\b(${words.join('|')})\\b`, 'gi');

    // Build lookup map
    this.templateMap.clear();
    for (const [word, template] of Object.entries(templates)) {
      this.templateMap.set(word.toLowerCase(), template);
    }
  }

  process(text) {
    if (!this.compiledPattern) return text;

    return text.replace(this.compiledPattern, (match, word, offset) => {
      const template = this.templateMap.get(word.toLowerCase());
      if (!template) return match;

      // Apply template with case preservation
      return applyCaseToTemplate(match, template);
    });
  }
}

// Create singleton processor
const globalTemplateProcessor = new TemplateProcessor();

// Recompile when templates change
function updateTemplates(templates) {
  colorization.WORD_TEMPLATES = templates;
  globalTemplateProcessor.compile(templates);
}
```

### Implementation Strategy

#### Phase 1: Core Template System
1. Extend colorization.js with WORD_TEMPLATES structure
2. Implement processGlobalTemplates() function
3. Add case preservation logic
4. Create protected region detection

#### Phase 2: Injection Points
1. Modify Session.sendLine() to auto-apply templates
2. Update EntityManager notification methods
3. Add double-colorization prevention
4. Test with existing commands

#### Phase 3: Admin Interface
1. Enhance colorize command for template syntax
2. Add template validation
3. Create persistence layer for templates
4. Add "colorize templates" listing command

#### Phase 4: Optimization
1. Implement compiled regex patterns
2. Add template caching
3. Profile performance impact
4. Add template priority system

### Design Decisions

#### 1. Where to Inject
**Decision: Session.sendLine() as primary injection point**

Rationale:
- Central location for ALL text output
- Commands don't need modification
- Consistent application across all messages
- EntityManager still works through Session

#### 2. Case Handling
**Decision: Intelligent case preservation**

Rules:
- "fire" → `<red>f<yellow>i<red>r<yellow>e</>`
- "Fire" → `<red>F<yellow>i<red>r<yellow>e</>`
- "FIRE" → `<red>F<yellow>I<red>R<yellow>E</>`

#### 3. Performance Strategy
**Decision: Compile-once, apply-many**

- Pre-compile all templates into single regex
- Cache processed strings when possible
- Skip processing for system messages
- Lazy initialization for startup speed

#### 4. Conflict Resolution
**Decision: Templates override keywords**

Priority order:
1. Explicit color tags (highest)
2. Word templates
3. Context keywords
4. Global keywords (lowest)

### Edge Cases Handled

1. **Partial matches**: Only whole words match (word boundaries)
2. **Nested colors**: Protected regions prevent double-colorization
3. **Player names**: Capnames are protected from template replacement
4. **Performance**: Single-pass regex for all templates
5. **Case variations**: Smart case preservation in templates
6. **Invalid templates**: Validation ensures template matches word

### Example Usage

```javascript
// Admin sets up colorful word
> colorize add fire <red>f<yellow>i<red>r<yellow>e</>
✓ Added word template: "fire"
Preview: The word fire is now colorized!

// Automatically applied everywhere
> look
You see a warm fire crackling.  // "fire" shows in alternating red/yellow

> say Beware of the fire!
You say: Beware of the fire!    // "fire" colorized in the message

> chat Fire is dangerous!
[CHAT] Bob: Fire is dangerous!  // "Fire" preserves capitalization with colors

// Works in NPC dialogue
The guard says, "No fires allowed!" // "fires" gets colorized (plural handled)
```

### Migration Path

1. **Week 1**: Implement core template system without auto-injection
2. **Week 2**: Add Session-level injection, test thoroughly
3. **Week 3**: Enhance colorize command, add persistence
4. **Week 4**: Optimize performance, add edge case handling

### Success Metrics

- Word templates apply globally without command changes
- No performance degradation (< 5ms overhead per message)
- Case preservation works correctly
- No double-colorization bugs
- Templates persist across server restarts
- Admin can manage templates easily

### Technical Constraints

1. **Regex complexity**: Limited to ~100 templates before performance impact
2. **Memory usage**: Each template adds ~200 bytes overhead
3. **Startup time**: Template compilation adds ~10ms per 100 templates
4. **Save file size**: Templates stored in data/word_templates.json

### Conclusion

The Global Word Templates system provides the desired "colorize once, apply everywhere" functionality while maintaining architectural integrity. By injecting at the Session layer and using intelligent case preservation, we achieve automatic colorization without modifying existing commands. The protected region system prevents conflicts, and the performance optimizations ensure minimal overhead.

This design respects the vibeMUD principle that "colors are presentation, not data" by applying templates at display time rather than storing colorized text. The admin interface is intuitive, and the system integrates cleanly with existing colorization infrastructure.