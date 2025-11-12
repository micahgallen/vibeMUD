/**
 * Colors - ANSI color code utilities for MUD text formatting
 * Provides color constants and helper functions for terminal output
 */

/**
 * ANSI Color Codes
 * These escape sequences work in most terminal emulators
 */
const ANSI = {
  // Reset
  RESET: '\x1b[0m',

  // Regular colors
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',

  // Bright/Bold colors
  BRIGHT_BLACK: '\x1b[90m',
  BRIGHT_RED: '\x1b[91m',
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_YELLOW: '\x1b[93m',
  BRIGHT_BLUE: '\x1b[94m',
  BRIGHT_MAGENTA: '\x1b[95m',
  BRIGHT_CYAN: '\x1b[96m',
  BRIGHT_WHITE: '\x1b[97m',

  // Text styles
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  ITALIC: '\x1b[3m',
  UNDERLINE: '\x1b[4m',
  BLINK: '\x1b[5m',
  REVERSE: '\x1b[7m',
  HIDDEN: '\x1b[8m'
};

/**
 * Semantic color mapping for MUD elements
 * Makes it easy to change the color scheme globally
 */
const MUD_COLORS = {
  ROOM_NAME: ANSI.BRIGHT_CYAN,
  ROOM_DESCRIPTION: ANSI.WHITE,
  EXITS: ANSI.YELLOW,
  EXITS_LABEL: ANSI.BRIGHT_YELLOW,
  NPC: ANSI.GREEN,
  NPC_NAME: ANSI.BRIGHT_GREEN,
  OBJECT: ANSI.MAGENTA,
  OBJECT_NAME: ANSI.BRIGHT_MAGENTA,
  PLAYER: ANSI.CYAN,
  PLAYER_NAME: ANSI.BRIGHT_CYAN,
  ERROR: ANSI.RED,
  SUCCESS: ANSI.BRIGHT_GREEN,
  INFO: ANSI.BRIGHT_BLUE,
  WARNING: ANSI.YELLOW,
  SYSTEM: ANSI.BRIGHT_BLUE,
  DIALOGUE: ANSI.BRIGHT_YELLOW,
  EMOTE: ANSI.BRIGHT_MAGENTA,
  SAY: ANSI.WHITE,
  TELL: ANSI.CYAN,
  COMMAND: ANSI.BRIGHT_WHITE,
  HINT: ANSI.DIM + ANSI.CYAN,
  HIGHLIGHT: ANSI.BOLD + ANSI.BRIGHT_WHITE,
  WUMPCOM: ANSI.BRIGHT_YELLOW,
  ADMIN_ROLE: ANSI.BRIGHT_YELLOW // New color for admin roles
};

/**
 * Colorize text with a specific ANSI color code
 * Automatically resets color at the end
 * @param {string} text - Text to colorize
 * @param {string} colorCode - ANSI color code (from ANSI or MUD_COLORS)
 * @returns {string} Colorized text with reset at the end
 */
function colorize(text, colorCode) {
  if (!text) return '';
  if (!colorCode) return text;
  return `${colorCode}${text}${ANSI.RESET}`;
}

/**
 * Remove all ANSI color codes from text
 * Useful for logging or length calculations
 * @param {string} text - Text with ANSI codes
 * @returns {string} Plain text without color codes
 */
function stripColors(text) {
  if (!text) return '';
  // eslint-disable-next-line no-control-regex
  // Updated regex to handle compound ANSI codes like \x1b[1;31m (bold red) and \x1b[38;5;196m (256-color)
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get the visible length of text (ignoring ANSI codes)
 * Useful for formatting/alignment
 * @param {string} text - Text with ANSI codes
 * @returns {number} Visible character count
 */
function visibleLength(text) {
  return stripColors(text).length;
}

/**
 * Create a horizontal line/separator with color
 * @param {number} length - Length of the line
 * @param {string} char - Character to repeat (default '=')
 * @param {string} colorCode - ANSI color code
 * @returns {string} Colored line
 */
function line(length, char = '=', colorCode = null) {
  const lineText = char.repeat(length);
  return colorCode ? colorize(lineText, colorCode) : lineText;
}

/**
 * Wrap text to a specific width (respecting ANSI codes and preserving paragraphs)
 * @param {string} text - Text to wrap
 * @param {number} width - Maximum line width (default 80)
 * @param {boolean} preserveIndent - Whether to preserve leading whitespace (default false)
 * @returns {string} Wrapped text with newlines
 */
function wrap(text, width = 80, preserveIndent = false) {
  if (!text) return '';

  // Split into paragraphs (preserve intentional line breaks)
  const paragraphs = text.split('\n');
  const wrappedParagraphs = [];

  for (const paragraph of paragraphs) {
    // Detect and preserve indentation if requested
    let indent = '';
    let trimmedParagraph = paragraph;

    if (preserveIndent) {
      const match = paragraph.match(/^(\s+)/);
      if (match) {
        indent = match[1];
        trimmedParagraph = paragraph.substring(indent.length);
      }
    } else {
      trimmedParagraph = paragraph.trim();
    }

    // If paragraph is empty or just whitespace, preserve it
    if (!trimmedParagraph) {
      wrappedParagraphs.push('');
      continue;
    }

    // Wrap the paragraph
    const words = trimmedParagraph.split(' ');
    const lines = [];
    let currentLine = indent; // Start with indentation
    let currentVisibleLength = indent.length;

    for (const word of words) {
      if (!word) continue; // Skip empty strings from multiple spaces

      const wordVisibleLength = visibleLength(word);

      // Check if adding this word would exceed the width
      if (currentVisibleLength > 0 && currentVisibleLength + wordVisibleLength + 1 > width) {
        // Save current line and start new one
        lines.push(currentLine);
        currentLine = indent + word; // Start new line with indent
        currentVisibleLength = indent.length + wordVisibleLength;
      } else {
        // Add word to current line
        if (currentVisibleLength > indent.length) {
          currentLine += ' ' + word;
          currentVisibleLength += wordVisibleLength + 1;
        } else {
          currentLine += word;
          currentVisibleLength += wordVisibleLength;
        }
      }
    }

    // Add the last line
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    wrappedParagraphs.push(lines.join('\n'));
  }

  return wrappedParagraphs.join('\n');
}

/**
 * Pad text to a specific width (accounting for ANSI codes)
 * @param {string} text - Text to pad
 * @param {number} width - Target width
 * @param {string} align - Alignment: 'left', 'right', 'center'
 * @returns {string} Padded text
 */
function pad(text, width, align = 'left') {
  const visible = visibleLength(text);
  const padding = Math.max(0, width - visible);

  if (align === 'right') {
    return ' '.repeat(padding) + text;
  } else if (align === 'center') {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  } else {
    return text + ' '.repeat(padding);
  }
}

/**
 * Colorize room name
 * @param {string} name - Room name
 * @returns {string} Colorized room name
 */
function roomName(name) {
  return colorize(name, MUD_COLORS.ROOM_NAME);
}

/**
 * Colorize exit list
 * @param {string} exits - Exit text
 * @returns {string} Colorized exits
 */
function exits(exits) {
  return colorize(exits, MUD_COLORS.EXITS);
}

/**
 * Colorize exit label
 * @param {string} label - Label text (e.g., "Exits:")
 * @returns {string} Colorized label
 */
function exitsLabel(label) {
  return colorize(label, MUD_COLORS.EXITS_LABEL);
}

/**
 * Colorize NPC description
 * @param {string} description - NPC description
 * @returns {string} Colorized description
 */
function npc(description) {
  return colorize(description, MUD_COLORS.NPC);
}

/**
 * Colorize NPC name
 * @param {string} name - NPC name
 * @returns {string} Colorized name
 */
function npcName(name) {
  return colorize(name, MUD_COLORS.NPC_NAME);
}

/**
 * Colorize object description
 * @param {string} description - Object description
 * @returns {string} Colorized description
 */
function object(description) {
  return colorize(description, MUD_COLORS.OBJECT);
}

/**
 * Colorize object name
 * @param {string} name - Object name
 * @returns {string} Colorized name
 */
function objectName(name) {
  return colorize(name, MUD_COLORS.OBJECT_NAME);
}

/**
 * Colorize error message
 * @param {string} message - Error message
 * @returns {string} Colorized error
 */
function error(message) {
  return colorize(message, MUD_COLORS.ERROR);
}

/**
 * Colorize success message
 * @param {string} message - Success message
 * @returns {string} Colorized success
 */
function success(message) {
  return colorize(message, MUD_COLORS.SUCCESS);
}

/**
 * Colorize info message
 * @param {string} message - Info message
 * @returns {string} Colorized info
 */
function info(message) {
  return colorize(message, MUD_COLORS.INFO);
}

/**
 * Colorize warning message
 * @param {string} message - Warning message
 * @returns {string} Colorized warning
 */
function warning(message) {
  return colorize(message, MUD_COLORS.WARNING);
}

/**
 * Colorize system message
 * @param {string} message - System message
 * @returns {string} Colorized system message
 */
function system(message) {
  return colorize(message, MUD_COLORS.SYSTEM);
}

/**
 * Colorize dialogue
 * @param {string} dialogue - NPC dialogue
 * @returns {string} Colorized dialogue
 */
function dialogue(dialogue) {
  return colorize(dialogue, MUD_COLORS.DIALOGUE);
}

/**
 * Colorize emote
 * @param {string} emote - Emote text
 * @returns {string} Colorized emote with color restoration after resets
 */
function emote(emoteText) {
  // Apply emote color (bright magenta) to the entire text first
  const colored = colorize(emoteText, MUD_COLORS.EMOTE);

  // Replace any ANSI reset codes with reset + restore emote color
  // Order of operations:
  // 1. Emote color applied to whole text
  // 2. Capnames contain embedded resets (from getDisplayName())
  // 3. We replace those resets with reset + emote color restoration
  // Result: Text stays magenta even after capname resets
  const emoteColorCode = MUD_COLORS.EMOTE;
  const resetPattern = /\x1b\[0m/g;
  const resetWithRestore = ANSI.RESET + emoteColorCode;

  return colored.replace(resetPattern, resetWithRestore);
}

/**
 * Colorize say text
 * @param {string} say - Say text
 * @returns {string} Colorized say
 */
function say(say) {
  return colorize(say, MUD_COLORS.SAY);
}

/**
 * Colorize tell/whisper
 * @param {string} tell - Tell text
 * @returns {string} Colorized tell
 */
function tell(tell) {
  return colorize(tell, MUD_COLORS.TELL);
}

/**
 * Colorize player name
 * @param {string} name - Player name
 * @returns {string} Colorized player name
 */
function playerName(name) {
  return colorize(name, MUD_COLORS.PLAYER_NAME);
}

/**
 * Colorize hint text
 * @param {string} hint - Hint text
 * @returns {string} Colorized hint
 */
function hint(hint) {
  return colorize(hint, MUD_COLORS.HINT);
}

/**
 * Colorize highlighted text
 * @param {string} text - Text to highlight
 * @returns {string} Highlighted text
 */
function highlight(text) {
  return colorize(text, MUD_COLORS.HIGHLIGHT);
}

/**
 * Colorize action text
 * @param {string} action - Action text
 * @returns {string} Colorized action
 */
function action(action) {
  return colorize(action, MUD_COLORS.EMOTE);
}

/**
 * Colorize NPC speech
 * @param {string} text - NPC speech text
 * @returns {string} Colorized NPC speech
 */
function npcSay(text) {
  return colorize(text, MUD_COLORS.DIALOGUE);
}

/**
 * Colorize wumpcom messages
 * @param {string} text - Wumpcom message text
 * @returns {string} Colorized wumpcom message
 */
function wumpcom(text) {
  return colorize(text, MUD_COLORS.WUMPCOM);
}

/**
 * Colorize admin role text
 * @param {string} text - Admin role text
 * @returns {string} Colorized admin role
 */
function adminRole(text) {
  return colorize(text, MUD_COLORS.ADMIN_ROLE);
}

/**
 * Mapping of common color/style tag names to ANSI codes.
 * This allows users to type <red>text</red> instead of raw ANSI.
 */
const TAG_TO_ANSI_MAP = {
  // Regular colors
  'black': ANSI.BLACK,
  'red': ANSI.RED,
  'green': ANSI.GREEN,
  'yellow': ANSI.YELLOW,
  'blue': ANSI.BLUE,
  'magenta': ANSI.MAGENTA,
  'cyan': ANSI.CYAN,
  'white': ANSI.WHITE,

  // Bright colors
  'bright_black': ANSI.BRIGHT_BLACK,
  'bright_red': ANSI.BRIGHT_RED,
  'bright_green': ANSI.BRIGHT_GREEN,
  'bright_yellow': ANSI.BRIGHT_YELLOW,
  'bright_blue': ANSI.BRIGHT_BLUE,
  'bright_magenta': ANSI.BRIGHT_MAGENTA,
  'bright_cyan': ANSI.BRIGHT_CYAN,
  'bright_white': ANSI.BRIGHT_WHITE,

  // Aliases for common colors
  'grey': ANSI.BRIGHT_BLACK,
  'gray': ANSI.BRIGHT_BLACK,

  // Text styles
  'bold': ANSI.BOLD,
  'dim': ANSI.DIM,
  'italic': ANSI.ITALIC,
  'underline': ANSI.UNDERLINE,
  'blink': ANSI.BLINK,
  'reverse': ANSI.REVERSE,
  'hidden': ANSI.HIDDEN,

  // Reset
  'reset': ANSI.RESET,
  'end': ANSI.RESET, // Common alias for reset
};

/**
 * Converts markup-style color tags (e.g., <red>, <bold>, </>) into ANSI escape codes.
 * Unknown tags are left as is.
 * @param {string} text - Text containing markup tags.
 * @returns {string} Text with markup tags replaced by ANSI codes.
 */
function parseColorTags(text) {
  if (!text) return '';

  // Regex to find tags: <tagname> or </tagname> or </>
  return text.replace(/<(\/?)([\w_]+)?>/g, (match, isClosing, tagName) => {
    // Handle generic closing tag </>
    if (match === '</>') {
      return ANSI.RESET;
    }

    const lowerTagName = tagName ? tagName.toLowerCase() : '';

    // If it's a closing tag with a specific name, treat it as a reset for now
    // A more advanced parser might manage a stack of active styles.
    if (isClosing === '/') {
      return ANSI.RESET;
    }

    // Look up the tag in our map
    const ansiCode = TAG_TO_ANSI_MAP[lowerTagName];

    // If a corresponding ANSI code is found, return it. Otherwise, return the original match.
    return ansiCode || match;
  });
}

/**
 * Reverse mapping of ANSI codes to common color/style tag names.
 * Used to convert ANSI back to markup for display.
 */
const ANSI_TO_TAG_MAP = {};
for (const tagName in TAG_TO_ANSI_MAP) {
  const ansiCode = TAG_TO_ANSI_MAP[tagName];
  // Avoid overwriting for aliases like 'grey' and 'gray', prioritize the primary name
  if (!ANSI_TO_TAG_MAP[ansiCode]) {
    ANSI_TO_TAG_MAP[ansiCode] = tagName;
  }
}
// Explicitly map ANSI.RESET to the generic closing tag
ANSI_TO_TAG_MAP[ANSI.RESET] = '/';

/**
 * Converts ANSI escape codes back into markup-style color tags (e.g., <red>, <bold>, </>)
 * for display purposes. Unknown ANSI codes are left as is.
 * @param {string} text - Text containing ANSI escape codes.
 * @returns {string} Text with ANSI codes replaced by markup tags.
 */
function unparseColorTags(text) {
  if (!text) return '';

  // Regex to find ANSI codes: \x1b[...m
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, (ansiCode) => {
    const tagName = ANSI_TO_TAG_MAP[ansiCode];
    if (tagName) {
      // Special case for generic reset tag
      if (tagName === '/') {
        return '</>';
      }
      return `<${tagName}>`;
    }
    return ansiCode; // Return original ANSI code if no mapping found
  });
}

module.exports = {
  // Raw ANSI codes
  ANSI,

  // Semantic color mappings
  MUD_COLORS,

  // Core utilities
  colorize,
  stripColors,
  visibleLength,
  line,
  wrap,
  pad,
  parseColorTags,
  unparseColorTags,

  // Semantic colorizers
  roomName,
  exits,
  exitsLabel,
  npc,
  npcName,
  object,
  objectName,
  error,
  success,
  info,
  warning,
  system,
  dialogue,
  emote,
  say,
  tell,
  playerName,
  hint,
  highlight,
  action,
  npcSay,
  wumpcom,
  adminRole, // Export the new adminRole function

  // Combat colors
  combat: (text) => colorize(text, ANSI.BRIGHT_YELLOW),
  hit: (text) => colorize(text, ANSI.BRIGHT_RED),
  miss: (text) => colorize(text, ANSI.BRIGHT_BLACK),
  critical: (text) => colorize(text, ANSI.BRIGHT_MAGENTA),
  damage: (text) => colorize(text, ANSI.RED),
  healing: (text) => colorize(text, ANSI.GREEN),
  xpGain: (text) => colorize(text, ANSI.BRIGHT_CYAN),
  levelUp: (text) => colorize(text, ANSI.BRIGHT_YELLOW),
  statGain: (text) => colorize(text, ANSI.GREEN),

  // Text styles
  dim: (text) => colorize(text, ANSI.DIM),
  subtle: (text) => colorize(text, ANSI.DIM),  // Alias for dim
  gray: (text) => colorize(text, ANSI.BRIGHT_BLACK),  // Alias for gray text
  grey: (text) => colorize(text, ANSI.BRIGHT_BLACK),  // British spelling
  cyan: (text) => colorize(text, ANSI.CYAN),
  magenta: (text) => colorize(text, ANSI.MAGENTA),
  green: (text) => colorize(text, ANSI.GREEN)
};
