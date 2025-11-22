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
const fs = require('fs');
const path = require('path');

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
  'Admin': 'bright_yellow',

  // Example global keywords
  'warm': 'red',
  'cold': 'cyan'
};

/**
 * Word templates - global word-to-template mappings
 * These are per-letter colorized templates that apply everywhere
 * Example: 'fire' -> '<red>f<yellow>i<red>r<yellow>e</>'
 */
const WORD_TEMPLATES = {};

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

/**
 * Apply case pattern from originalWord to a colorized template
 * Preserves uppercase/lowercase/capitalized patterns
 *
 * @param {string} template - The template with color tags (e.g., '<red>f<yellow>i<red>r<yellow>e</>')
 * @param {string} originalWord - The original word that determines case (e.g., 'Fire', 'FIRE', 'fire')
 * @returns {string} Template with case applied
 */
function applyCaseToTemplate(template, originalWord) {
  if (!template || !originalWord) return template;

  // Strip color tags to get the plain letters from template
  // Need to parse tags to ANSI first, then strip ANSI
  const plainTemplate = stripColors(parseColorTags(template));

  // If lengths don't match, something is wrong - return template as-is
  if (plainTemplate.length !== originalWord.length) {
    return template;
  }

  // Detect case pattern
  const isAllUpper = originalWord === originalWord.toUpperCase() && originalWord !== originalWord.toLowerCase();
  const isCapitalized = originalWord[0] === originalWord[0].toUpperCase()
                        && originalWord.slice(1) === originalWord.slice(1).toLowerCase()
                        && originalWord.length > 1;

  // If all lowercase (or mixed case we don't handle), return as-is
  if (!isAllUpper && !isCapitalized) {
    return template;
  }

  // Build the result by processing template character by character
  let result = '';
  let templateIndex = 0;
  let letterIndex = 0;

  while (templateIndex < template.length) {
    // Check if we're at the start of a color tag
    if (template[templateIndex] === '<') {
      // Find the end of the tag
      const tagEnd = template.indexOf('>', templateIndex);
      if (tagEnd !== -1) {
        // Copy the entire tag unchanged
        result += template.substring(templateIndex, tagEnd + 1);
        templateIndex = tagEnd + 1;
        continue;
      }
    }

    // Check if this is a letter character
    const char = template[templateIndex];
    if (/[a-zA-Z]/.test(char)) {
      // Apply case based on pattern
      if (isAllUpper) {
        result += char.toUpperCase();
      } else if (isCapitalized && letterIndex === 0) {
        result += char.toUpperCase();
      } else {
        result += char.toLowerCase();
      }
      letterIndex++;
    } else {
      // Non-letter character, copy as-is
      result += char;
    }

    templateIndex++;
  }

  return result;
}

/**
 * Compiled regex cache for word template matching
 * Rebuilt when templates change
 */
let templateRegex = null;
let templateWords = [];

/**
 * Build the compiled regex for all word templates
 * Creates a pattern like /\b(fire|ice|magic)\b/gi
 */
function buildTemplateRegex() {
  const words = Object.keys(WORD_TEMPLATES);

  if (words.length === 0) {
    templateRegex = null;
    templateWords = [];
    return;
  }

  // Sort by length (longest first) to match longer words before shorter ones
  words.sort((a, b) => b.length - a.length);

  // Escape special regex characters in words
  const escapedWords = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  // Build pattern with word boundaries
  const pattern = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');

  templateRegex = pattern;
  templateWords = words;
}

/**
 * Process text to apply global word templates
 * Finds all words with templates and replaces them with case-aware colorized versions
 *
 * @param {string} text - Text to process
 * @returns {string} Text with templates applied
 */
function processGlobalTemplates(text) {
  if (!text || typeof text !== 'string') return text;

  // Early exit if no templates
  if (Object.keys(WORD_TEMPLATES).length === 0) {
    return text;
  }

  // Build regex if needed
  if (!templateRegex) {
    buildTemplateRegex();
  }

  // If still no regex, return unchanged
  if (!templateRegex) {
    return text;
  }

  // Mark protected regions (existing ANSI codes and color tags with their content)
  const protectedRegions = [];

  // Protect existing ANSI codes
  // eslint-disable-next-line no-control-regex
  const ansiPattern = /\x1b\[[0-9;]*m/g;
  let match;
  while ((match = ansiPattern.exec(text)) !== null) {
    protectedRegions.push({
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Protect existing color tags AND their content: <tag>content</tag> or <tag>content</>
  // This regex matches: <tagname>...content...</tagname> or <tagname>...content</>
  const tagWithContentPattern = /<(\w+)>(.*?)(<\/\1>|<\/>)/g;
  while ((match = tagWithContentPattern.exec(text)) !== null) {
    protectedRegions.push({
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Apply templates with case preservation
  let result = text;
  const replacements = [];

  // Find all matches
  templateRegex.lastIndex = 0; // Reset regex
  while ((match = templateRegex.exec(text)) !== null) {
    const matchedWord = match[0];
    const position = match.index;

    // Skip if in protected region
    if (isProtected(position, protectedRegions)) {
      continue;
    }

    // Find the template (case-insensitive lookup)
    const lowerWord = matchedWord.toLowerCase();
    let template = WORD_TEMPLATES[lowerWord];

    // Try exact match if lowercase didn't work
    if (!template) {
      template = WORD_TEMPLATES[matchedWord];
    }

    if (template) {
      // Apply case from matched word to template
      const colorizedWord = applyCaseToTemplate(template, matchedWord);

      // Store replacement (we'll apply them in reverse order to preserve positions)
      replacements.push({
        start: position,
        end: position + matchedWord.length,
        original: matchedWord,
        replacement: colorizedWord
      });
    }
  }

  // Apply replacements in reverse order (end to start) to preserve positions
  replacements.sort((a, b) => b.start - a.start);

  for (const { start, end, replacement } of replacements) {
    result = result.substring(0, start) + replacement + result.substring(end);
  }

  return result;
}

/**
 * Add a word template
 *
 * @param {string} word - The word to template (stored as lowercase)
 * @param {string} template - The color template (e.g., '<red>f<yellow>i<red>r<yellow>e</>')
 */
function addWordTemplate(word, template) {
  const lowerWord = word.toLowerCase();
  WORD_TEMPLATES[lowerWord] = template;

  // Invalidate regex cache
  templateRegex = null;
}

/**
 * Remove a word template
 *
 * @param {string} word - The word to remove
 * @returns {boolean} True if template was removed
 */
function removeWordTemplate(word) {
  const lowerWord = word.toLowerCase();

  if (WORD_TEMPLATES[lowerWord]) {
    delete WORD_TEMPLATES[lowerWord];

    // Invalidate regex cache
    templateRegex = null;

    return true;
  }

  return false;
}

/**
 * Get the path to the word templates data file
 *
 * @returns {string} Absolute path to word_templates.json
 */
function getTemplatesFilePath() {
  // src/systems/colorization.js -> src/data/word_templates.json
  return path.join(__dirname, '..', 'data', 'word_templates.json');
}

/**
 * Load word templates from disk
 * Called on server startup
 */
function loadWordTemplates() {
  const filePath = getTemplatesFilePath();

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const templates = JSON.parse(data);

      // Load templates into memory
      for (const [word, template] of Object.entries(templates)) {
        WORD_TEMPLATES[word.toLowerCase()] = template;
      }

      // Invalidate regex cache to rebuild with new templates
      templateRegex = null;

      console.log(`Loaded ${Object.keys(templates).length} word templates`);
    }
  } catch (error) {
    console.error('Error loading word templates:', error.message);
  }
}

/**
 * Save word templates to disk
 * Called when templates are added/removed
 */
function saveWordTemplates() {
  const filePath = getTemplatesFilePath();

  try {
    // Ensure data directory exists
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write templates to file
    const data = JSON.stringify(WORD_TEMPLATES, null, 2);
    fs.writeFileSync(filePath, data, 'utf8');
  } catch (error) {
    console.error('Error saving word templates:', error.message);
    throw error;
  }
}

/**
 * Get all word templates (for listing)
 *
 * @returns {object} Copy of WORD_TEMPLATES
 */
function getAllWordTemplates() {
  return { ...WORD_TEMPLATES };
}

module.exports = {
  VERSION,
  GLOBAL_KEYWORDS,
  CONTEXT_KEYWORDS,
  EXCLUSIONS,
  WORD_TEMPLATES,

  // Core functions
  processText,
  getKeywordColor,
  markProtectedRegions,
  isProtected,
  shouldExclude,

  // Word template functions
  processGlobalTemplates,
  applyCaseToTemplate,
  addWordTemplate,
  removeWordTemplate,
  loadWordTemplates,
  saveWordTemplates,
  getAllWordTemplates,

  // Management functions
  addGlobalKeyword,
  addContextKeyword,
  getContextKeywords
};
