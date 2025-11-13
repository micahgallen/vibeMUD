/**
 * south command
 * Move south
 */

const { movePlayer } = require('../systems/movement');

module.exports = {
  id: "south",
  name: "south",
  aliases: ["s"],
  category: "movement",
  description: "Move south",
  usage: "south",
  help: "Move to the room to the south.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    movePlayer(session, 'south', entityManager, colors);
  }
};
