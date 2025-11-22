/**
 * Display Utilities - Comprehensive text display system for vibeMUD
 *
 * This module provides the core display layer for the colorization system.
 * It separates presentation (colors) from data (plain text storage).
 *
 * Core Philosophy: "Colors are presentation, not data"
 * - Storage Layer: Plain text only (no ANSI in JSON)
 * - Display Layer: Colors injected at render time
 * - Matching Layer: Plain text comparison for targeting
 */

const { ANSI, stripColors: stripColorsFromCore, parseColorTags } = require('../core/colors');

/**
 * Get the display name for a player
 * Returns the player's capname if set, otherwise their username
 * Automatically appends ANSI reset code to prevent color bleeding
 * Adds "(disconnected)" suffix if player is disconnected
 *
 * @param {object} player - The player object
 * @returns {string} The colorized display name with ANSI reset
 */
function getDisplayName(player) {
  if (!player) return 'Unknown';

  let displayName;

  // If player has a capname, ensure it ends with a reset code to prevent color bleeding
  if (player.capname) {
    displayName = ensureReset(player.capname);
  } else {
    displayName = player.name;
  }

  // Add disconnected indicator
  if (player.isDisconnected) {
    displayName += ANSI.DIM + ' (disconnected)' + ANSI.RESET;
  }

  return displayName;
}

/**
 * Get the plain text name for a player (strips all ANSI codes)
 * Use this for storage, logging, and internal comparisons
 *
 * @param {object} player - The player object
 * @returns {string} Plain text name without any color codes
 */
function getPlainName(player) {
  if (!player) return 'Unknown';

  // Always use the base name for plain text
  // Capname is just a display wrapper, not the actual name
  return player.name;
}

/**
 * Get the search name for a player (lowercase plain name)
 * Use this for case-insensitive matching
 *
 * @param {object} player - The player object
 * @returns {string} Lowercase plain name for searching
 */
function getSearchName(player) {
  return getPlainName(player).toLowerCase();
}

/**
 * Check if a search term matches a player's name (case-insensitive, color-aware)
 * Strips colors from both the player name and search term before comparing
 *
 * @param {string} searchTerm - The term to search for (may contain colors)
 * @param {object} player - The player object to check
 * @returns {boolean} True if the search term matches the player's name
 */
function matchesName(searchTerm, player) {
  if (!searchTerm || !player) return false;

  // Strip colors from search term (in case it was copied from colored output)
  const cleanSearch = stripColorsFromCore(searchTerm).toLowerCase().trim();
  const cleanName = getSearchName(player);

  // Support partial matching from the start of the name
  return cleanName.startsWith(cleanSearch);
}

/**
 * Ensure text ends with ANSI reset code
 * Prevents color bleeding to subsequent text
 *
 * @param {string} text - Text to ensure has reset
 * @returns {string} Text with ANSI reset at the end
 */
function ensureReset(text) {
  if (!text) return '';

  // Only add reset if not already present at the end
  if (text.endsWith(ANSI.RESET)) {
    return text;
  }

  return text + ANSI.RESET;
}

/**
 * Find a player in the entity manager by partial name match
 * Uses color-aware matching
 *
 * @param {string} searchTerm - Partial name to search for
 * @param {object} entityManager - The entity manager
 * @param {string} roomId - Optional: restrict search to a specific room
 * @returns {object|null} The matching player object or null
 */
function findPlayer(searchTerm, entityManager, roomId = null) {
  if (!searchTerm || !entityManager) return null;

  let players;
  if (roomId) {
    // Get players in specific room
    players = entityManager.getPlayersInRoom(roomId);
  } else {
    // Get all players
    players = entityManager.getByType('player');
  }

  // Find matches
  const matches = players.filter(p => matchesName(searchTerm, p));

  // Return single match or null (if multiple matches, caller should handle)
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Find multiple players matching a search term
 * Returns all matches for disambiguation
 *
 * @param {string} searchTerm - Partial name to search for
 * @param {object} entityManager - The entity manager
 * @param {string} roomId - Optional: restrict search to a specific room
 * @returns {array} Array of matching player objects
 */
function findPlayers(searchTerm, entityManager, roomId = null) {
  if (!searchTerm || !entityManager) return [];

  let players;
  if (roomId) {
    players = entityManager.getPlayersInRoom(roomId);
  } else {
    players = entityManager.getByType('player');
  }

  return players.filter(p => matchesName(searchTerm, p));
}

/**
 * Strip colors from text (wrapper for core stripColors)
 * Exposed for convenience
 *
 * @param {string} text - Text with ANSI codes
 * @returns {string} Plain text without color codes
 */
function stripColors(text) {
  return stripColorsFromCore(text);
}

/**
 * Get the visible length of text (ignoring ANSI codes)
 * Useful for formatting and alignment
 *
 * @param {string} text - Text with ANSI codes
 * @returns {number} Visible character count
 */
function visibleLength(text) {
  return stripColors(text).length;
}

/**
 * Render text with context-aware colorization
 * This is a placeholder for future colorization system integration
 *
 * @param {string} text - Text to render
 * @param {object} options - Rendering options
 * @param {string} options.context - Context for colorization (e.g., 'room_description', 'combat')
 * @param {object} options.viewer - The player viewing the text
 * @returns {string} Rendered text with colorization
 */
function renderText(text, options = {}) {
  // TODO: Future integration with colorization.js system
  // For now, just ensure clean output
  return ensureReset(text);
}

/**
 * Process a template with variable substitution
 * This is a placeholder for future template system integration
 *
 * @param {string} template - Template string with {placeholders}
 * @param {object} variables - Variables to substitute
 * @param {string} context - Context for colorization
 * @returns {string} Processed template
 */
function processTemplate(template, variables = {}, context = 'system') {
  // TODO: Future template processing system
  // For now, simple variable substitution
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return ensureReset(result);
}

module.exports = {
  // Core player display functions
  getDisplayName,
  getPlainName,
  getSearchName,
  matchesName,

  // Player finding utilities
  findPlayer,
  findPlayers,

  // Text utilities
  ensureReset,
  stripColors,
  visibleLength,

  // Template and rendering (future expansion)
  renderText,
  processTemplate
};
