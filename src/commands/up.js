/**
 * up command
 * Move up
 */

const { movePlayer } = require('../systems/movement');

module.exports = {
  id: "up",
  name: "up",
  aliases: ["u"],
  category: "movement",
  description: "Move up",
  usage: "up",
  help: "Move to the room above (stairs, ladders, etc).",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    movePlayer(session, 'up', entityManager, colors);
  }
};
