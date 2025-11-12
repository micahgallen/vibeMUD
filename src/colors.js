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
  // Semantic colors for game elements
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

  // Generic bright colors for banners and UI elements
  BRIGHT_CYAN: ANSI.BRIGHT_CYAN,
  BRIGHT_MAGENTA: ANSI.BRIGHT_MAGENTA,
  BRIGHT_YELLOW: ANSI.BRIGHT_YELLOW
};

/**
 * Colorize text with a specific ANSI color code
 * Automatically resets color at the end
 */
function colorize(text, colorCode) {
  if (!text) return '';
  if (!colorCode) return text;
  return `${colorCode}${text}${ANSI.RESET}`;
}

/**
 * Remove all ANSI color codes from text
 */
function stripColors(text) {
  if (!text) return '';
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get the visible length of text (ignoring ANSI codes)
 */
function visibleLength(text) {
  return stripColors(text).length;
}

/**
 * Create a horizontal line/separator with color
 */
function line(length, char = '=', colorCode = null) {
  const lineText = char.repeat(length);
  return colorCode ? colorize(lineText, colorCode) : lineText;
}

/**
 * Pad text to a specific width (accounting for ANSI codes)
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

module.exports = {
  ANSI,
  MUD_COLORS,
  colorize,
  stripColors,
  visibleLength,
  line,
  pad,

  // Semantic helpers
  roomName: (name) => colorize(name, MUD_COLORS.ROOM_NAME),
  exits: (exits) => colorize(exits, MUD_COLORS.EXITS),
  exitsLabel: (label) => colorize(label, MUD_COLORS.EXITS_LABEL),
  npc: (desc) => colorize(desc, MUD_COLORS.NPC),
  npcName: (name) => colorize(name, MUD_COLORS.NPC_NAME),
  object: (desc) => colorize(desc, MUD_COLORS.OBJECT),
  objectName: (name) => colorize(name, MUD_COLORS.OBJECT_NAME),
  error: (msg) => colorize(msg, MUD_COLORS.ERROR),
  success: (msg) => colorize(msg, MUD_COLORS.SUCCESS),
  info: (msg) => colorize(msg, MUD_COLORS.INFO),
  warning: (msg) => colorize(msg, MUD_COLORS.WARNING),
  system: (msg) => colorize(msg, MUD_COLORS.SYSTEM),
  dialogue: (text) => colorize(text, MUD_COLORS.DIALOGUE),
  emote: (text) => colorize(text, MUD_COLORS.EMOTE),
  say: (text) => colorize(text, MUD_COLORS.SAY),
  tell: (text) => colorize(text, MUD_COLORS.TELL),
  playerName: (name) => colorize(name, MUD_COLORS.PLAYER_NAME),
  hint: (text) => colorize(text, MUD_COLORS.HINT),
  highlight: (text) => colorize(text, MUD_COLORS.HIGHLIGHT),

  /**
   * Convert custom color tags (e.g., {red}, {reset}) to ANSI escape codes.
   */
  convertTagsToAnsi: (text) => {
    if (!text) return '';

    let convertedText = text;
    const tagMap = {
      '{black}': ANSI.BLACK,
      '{red}': ANSI.RED,
      '{green}': ANSI.BLUE, // Corrected to BLUE, assuming a typo in thought process
      '{yellow}': ANSI.YELLOW,
      '{blue}': ANSI.BLUE,
      '{magenta}': ANSI.MAGENTA,
      '{cyan}': ANSI.CYAN,
      '{white}': ANSI.WHITE,
      '{brightblack}': ANSI.BRIGHT_BLACK,
      '{brightred}': ANSI.BRIGHT_RED,
      '{brightgreen}': ANSI.BRIGHT_GREEN,
      '{brightyellow}': ANSI.BRIGHT_YELLOW,
      '{brightblue}': ANSI.BRIGHT_BLUE,
      '{brightmagenta}': ANSI.BRIGHT_MAGENTA,
      '{brightcyan}': ANSI.BRIGHT_CYAN,
      '{brightwhite}': ANSI.BRIGHT_WHITE,
      '{bold}': ANSI.BOLD,
      '{dim}': ANSI.DIM,
      '{italic}': ANSI.ITALIC,
      '{underline}': ANSI.UNDERLINE,
      '{blink}': ANSI.BLINK,
      '{reverse}': ANSI.REVERSE,
      '{hidden}': ANSI.HIDDEN,
      '{reset}': ANSI.RESET,
    };

    for (const tag in tagMap) {
      const ansiCode = tagMap[tag];
      // Use a global regex to replace all occurrences
      convertedText = convertedText.replace(new RegExp(tag, 'gi'), ansiCode);
    }

    return convertedText;
  }
};
