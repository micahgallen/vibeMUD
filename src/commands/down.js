/**
 * down command
 * Move down
 */

const { movePlayer } = require('../systems/movement');

module.exports = {
  id: "down",
  name: "down",
  aliases: ["d"],
  category: "movement",
  description: "Move down",
  usage: "down",
  help: "Move to the room below (stairs, ladders, etc).",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    movePlayer(session, 'down', entityManager, colors);
  }
};
