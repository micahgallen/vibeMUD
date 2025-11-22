/**
 * quit command
 * Exit the game
 */

module.exports = {
  id: "quit",
  name: "quit",
  aliases: [],
  category: "system",
  description: "Exit the game",
  usage: "quit",
  help: "Saves your character and disconnects you from the game.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Block quit if in combat
    if (player.combat) {
      session.sendLine('');
      session.sendLine(colors.error('You cannot quit while in combat!'));
      session.sendLine(colors.hint('Use the "flee" command to escape combat first.'));
      session.sendLine('');
      return;
    }

    session.sendLine('');
    session.sendLine('Saving and disconnecting...');

      // Notify room
      if (player.currentRoom) {
        entityManager.notifyRoom(player.currentRoom,
          `\x1b[90m${(player.capname || player.name)} has left the game.\x1b[0m`,
          player.id);
      }

    // Unregister session before closing socket
    entityManager.unregisterSession(player.id);
    entityManager.saveDirty();

    session.socket.end();
  }
};
