/**
 * north command
 * Move north
 */

const { movePlayer } = require('../systems/movement');

module.exports = {
  id: "north",
  name: "north",
  aliases: ["n"],
  category: "movement",
  description: "Move north",
  usage: "north",
  help: "Move to the room to the north.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    movePlayer(session, 'north', entityManager, colors);
  }
};
