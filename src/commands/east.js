/**
 * east command
 * Move east
 */

module.exports = {
  id: "east",
  name: "east",
  aliases: ["e"],
  category: "movement",
  description: "Move east",
  usage: "east",
  help: "Move to the room to the east.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const direction = 'east';
    const player = session.player;
    const currentRoom = entityManager.get(player.currentRoom);

    if (!currentRoom) {
      session.sendLine(colors.error('Error: You are in an invalid location!'));
      return;
    }

    if (!currentRoom.exits || !currentRoom.exits[direction]) {
      session.sendLine('You cannot go that way.');
      return;
    }

    const targetRoomId = currentRoom.exits[direction];
    const targetRoom = entityManager.get(targetRoomId);

    if (!targetRoom) {
      session.sendLine(colors.error('Error: That exit leads nowhere!'));
      return;
    }

    // Notify others in current room
    entityManager.notifyRoom(player.currentRoom,
      colors.info(`${player.name} leaves ${direction}.`),
      player.id);

    // Move player
    player.currentRoom = targetRoomId;
    entityManager.markDirty(player.id);

    // Notify others in new room
    entityManager.notifyRoom(targetRoomId,
      colors.info(`${player.name} arrives.`),
      player.id);

    // Show new room - use look command
    const lookCommand = require('./look.js');
    lookCommand.execute(session, '', entityManager, colors);
  }
};
