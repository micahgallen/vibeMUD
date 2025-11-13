/**
 * west command
 * Move west
 */

const { movePlayer } = require('../systems/movement');

module.exports = {
  id: "west",
  name: "west",
  aliases: ["w"],
  category: "movement",
  description: "Move west",
  usage: "west",
  help: "Move to the room to the west.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    movePlayer(session, 'west', entityManager, colors);
  }
};
