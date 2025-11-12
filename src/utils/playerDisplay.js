/**
 * Player Display Utilities
 * Helper functions for displaying player names consistently across the MUD
 */

const { ANSI } = require('../core/colors');

/**
 * Get the display name for a player
 * Returns the player's capname if set, otherwise their username
 * Automatically appends ANSI reset code to capnames to prevent color bleeding
 *
 * @param {object} player - The player object
 * @returns {string} The display name to show for this player
 */
function getDisplayName(player) {
  if (!player) return 'Unknown';

  // If player has a capname, ensure it ends with a reset code to prevent color bleeding
  if (player.capname) {
    // Only add reset if not already present at the end
    if (player.capname.endsWith(ANSI.RESET)) {
      return player.capname;
    }
    return player.capname + ANSI.RESET;
  }

  return player.name;
}

module.exports = {
  getDisplayName
};
