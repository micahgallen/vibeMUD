/**
 * east command
 * Move east
 */

const { movePlayer } = require('../systems/movement');

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
    movePlayer(session, 'east', entityManager, colors);
  }
};
