/**
 * Player Display Utilities
 * Helper functions for displaying player names consistently across the MUD
 */

/**
 * Get the display name for a player
 * Returns the player's capname if set, otherwise their username
 *
 * @param {object} player - The player object
 * @returns {string} The display name to show for this player
 */
function getDisplayName(player) {
  if (!player) return 'Unknown';
  return player.capname || player.name;
}

module.exports = {
  getDisplayName
};
