/**
 * Colorization System - Context-aware keyword colorization for vibeMUD
 *
 * This module provides game-wide color rules and keyword-based text colorization.
 * It operates at the SYSTEMS layer, defining how text is colorized based on context.
 *
 * Core Concepts:
 * - Global keywords: Words that are colored everywhere (e.g., "Wumpy", "Grift")
 * - Context keywords: Words colored only in specific contexts (e.g., "door" in room descriptions)
 * - Protected regions: Areas that should not be re-colorized (player names, explicit tags)
 * - Priority resolution: Explicit creator tags > pre-colorized content > keywords
 */

const { parseColorTags, stripColors, ANSI } = require('../core/colors');

/**
 * Version number for migrations
 */
const VERSION = 1;

/**
 * Global keywords that apply everywhere in the game
 * These are high-priority words that should always be colored
 */
const GLOBAL_KEYWORDS = {
  // Game world names
  'Wumpy': 'bright_yellow',
  'wumpy': 'bright_yellow',
  'Grift': 'bright_cyan',
  'grift': 'bright_cyan',

  // Admin/system keywords
  'admin': 'bright_yellow',
  'Admin': 'bright_yellow'
};

/**
 * Context-specific keyword colorization rules
 * These apply only when rendering text in specific contexts
 */
const CONTEXT_KEYWORDS = {
  // Room description keywords
  room_description: {
    'door': 'yellow',
    'chest': 'bright_magenta',
    'stairs': 'cyan',
    'portal': 'bright_blue',
    'exit': 'yellow'
  },

  // NPC dialogue keywords
  npc_dialogue: {
    'yes': 'bright_green',
    'no': 'bright_red',
    'gold': 'bright_yellow',
    'quest': 'bright_magenta',
    'reward': 'bright_cyan'
  },

  // Combat keywords (in addition to combat.js formatting)
  combat: {
    'critical': 'bright_magenta',
    'miss': 'bright_black',
    'dodge': 'cyan'
  }
};

/**
 * Words/patterns that should NEVER be colorized
 * Used to prevent false positives in keyword matching
 */
const EXCLUSIONS = {
  // Exclude proper nouns that start with capital letters
  // (handled in shouldColorize function)
  properNouns: true,

  // Exclude words that match player names
  // (handled dynamically in processText)
  playerNames: true
};

/**
 * Check if a word should be excluded from colorization
 *
 * @param {string} word - The word to check
 * @param {object} context - Context information
 * @returns {boolean} True if word should be excluded
 */
function shouldExclude(word, context = {}) {
  // Don't colorize empty strings
  if (!word) return true;

  // Don't colorize if already contains ANSI codes (pre-colorized)
  if (word.includes('\x1b[')) return true;

  // Don't colorize proper nouns in most contexts
  // (unless context explicitly allows it)
  if (EXCLUSIONS.properNouns && !context.allowProperNouns) {
    if (/^[A-Z][a-z]+$/.test(word)) {
      // Check if it's a global keyword that should be colored anyway
      if (!GLOBAL_KEYWORDS[word]) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get the color for a keyword based on context
 *
 * @param {string} word - The word to colorize
 * @param {string} context - The context (e.g., 'room_description', 'combat')
 * @returns {string|null} The color name or null if no match
 */
function getKeywordColor(word, context = 'global') {
  // Check context-specific keywords first
  if (context !== 'global' && CONTEXT_KEYWORDS[context]) {
    const lowerWord = word.toLowerCase();
    if (CONTEXT_KEYWORDS[context][lowerWord]) {
      return CONTEXT_KEYWORDS[context][lowerWord];
    }
  }

  // Fall back to global keywords
  if (GLOBAL_KEYWORDS[word]) {
    return GLOBAL_KEYWORDS[word];
  }

  return null;
}

/**
 * Mark protected regions in text (explicit color tags, player names)
 * Returns an array of {start, end} positions that should not be modified
 *
 * @param {string} text - The text to analyze
 * @returns {array} Array of {start, end} protected regions
 */
function markProtectedRegions(text) {
  const regions = [];

  // Find all explicit color tags: <color>content</color> or <color>content</>
  const tagPattern = /<(\w+)>(.*?)<\/?>/g;
  let match;
  while ((match = tagPattern.exec(text)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'explicit_tag'
    });
  }

  return regions;
}

/**
 * Check if a position in text is within a protected region
 *
 * @param {number} position - Position to check
 * @param {array} regions - Array of protected regions
 * @returns {boolean} True if position is protected
 */
function isProtected(position, regions) {
  return regions.some(region => position >= region.start && position < region.end);
}

/**
 * Apply keyword colorization to text
 * Respects protected regions and uses context-specific rules
 *
 * @param {string} text - Text to colorize
 * @param {string} context - Context for colorization (default: 'global')
 * @param {object} options - Additional options
 * @returns {string} Colorized text
 */
function processText(text, context = 'global', options = {}) {
  if (!text) return '';

  // Step 1: Mark protected regions (explicit tags)
  const protectedRegions = markProtectedRegions(text);

  // Step 2: Build a list of words to colorize
  // We'll do whole-word replacement to avoid partial matches
  const wordsToColorize = new Map();

  // Split text into words while preserving positions
  const wordPattern = /\b(\w+)\b/g;
  let match;
  while ((match = wordPattern.exec(text)) !== null) {
    const word = match[1];
    const position = match.index;

    // Skip if in protected region
    if (isProtected(position, protectedRegions)) continue;

    // Skip if should be excluded
    if (shouldExclude(word, options)) continue;

    // Check if word has a color in this context
    const color = getKeywordColor(word, context);
    if (color) {
      wordsToColorize.set(word, color);
    }
  }

  // Step 3: Apply colorization (whole-word replacement)
  let result = text;
  for (const [word, colorName] of wordsToColorize.entries()) {
    // Create regex for whole-word matching (case-sensitive for now)
    const regex = new RegExp(`\\b${word}\\b`, 'g');

    // Replace with tagged version
    result = result.replace(regex, (match) => {
      return `<${colorName}>${match}</>`;
    });
  }

  // Step 4: Process all color tags to ANSI codes
  result = parseColorTags(result);

  return result;
}

/**
 * Add a global keyword
 * Allows dynamic addition of keywords at runtime
 *
 * @param {string} word - The word to colorize
 * @param {string} color - The color name
 */
function addGlobalKeyword(word, color) {
  GLOBAL_KEYWORDS[word] = color;
}

/**
 * Add a context-specific keyword
 *
 * @param {string} context - The context name
 * @param {string} word - The word to colorize
 * @param {string} color - The color name
 */
function addContextKeyword(context, word, color) {
  if (!CONTEXT_KEYWORDS[context]) {
    CONTEXT_KEYWORDS[context] = {};
  }
  CONTEXT_KEYWORDS[context][word] = color;
}

/**
 * Get all keywords for a context (for debugging/inspection)
 *
 * @param {string} context - The context name
 * @returns {object} Keywords for that context
 */
function getContextKeywords(context) {
  return CONTEXT_KEYWORDS[context] || {};
}

module.exports = {
  VERSION,
  GLOBAL_KEYWORDS,
  CONTEXT_KEYWORDS,
  EXCLUSIONS,

  // Core functions
  processText,
  getKeywordColor,
  markProtectedRegions,
  isProtected,
  shouldExclude,

  // Management functions
  addGlobalKeyword,
  addContextKeyword,
  getContextKeywords
};
