/**
 * Movement System
 * Handles player movement with combat and other state cleanup
 */

const { getDisplayName } = require('../utils/playerDisplay');

/**
 * Move a player in a direction
 * Handles combat disengagement and room notifications
 * @param {object} session - The player session
 * @param {string} direction - The direction to move
 * @param {object} entityManager - The entity manager
 * @param {object} colors - Color helpers
 * @returns {boolean} - Whether the movement succeeded
 */
function movePlayer(session, direction, entityManager, colors) {
  const player = session.player;

  // Check if player is a ghost
  if (player.isGhost) {
    session.sendLine(colors.error('You are a ghost and cannot move until you respawn!'));
    return false;
  }

  const currentRoom = entityManager.get(player.currentRoom);

  if (!currentRoom) {
    session.sendLine(colors.error('Error: You are in an invalid location!'));
    return false;
  }

  if (!currentRoom.exits || !currentRoom.exits[direction]) {
    session.sendLine('You cannot go that way.');
    return false;
  }

  const targetRoomId = currentRoom.exits[direction];
  const targetRoom = entityManager.get(targetRoomId);

  if (!targetRoom) {
    session.sendLine(colors.error('Error: That exit leads nowhere!'));
    return false;
  }

  // Check if player is in combat - if so, disengage (flee)
  if (player.combat) {
    const combat = require('./combat');
    combat.disengage(player.id, entityManager);
    session.sendLine(colors.warning('You flee from combat!'));
  }

  // Notify others in current room
  entityManager.notifyRoom(player.currentRoom,
    colors.info(`${getDisplayName(player)} leaves ${direction}.`),
    player.id);

  // Move player
  player.currentRoom = targetRoomId;
  entityManager.markDirty(player.id);

  // Notify others in new room
  entityManager.notifyRoom(targetRoomId,
    colors.info(`${getDisplayName(player)} arrives.`),
    player.id);

  // Show new room
  const lookCommand = require('../commands/look.js');
  lookCommand.execute(session, '', entityManager, colors);

  return true;
}

module.exports = {
  movePlayer
};
