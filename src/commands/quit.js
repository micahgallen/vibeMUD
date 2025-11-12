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
    session.sendLine('');
    session.sendLine('Saving and disconnecting...');
    entityManager.saveDirty();
    session.socket.end();
  }
};
