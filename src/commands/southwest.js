/**
 * southwest command
 * Move southwest
 */

const { movePlayer } = require('../systems/movement');

module.exports = {
  id: "southwest",
  name: "southwest",
  aliases: ["sw"],
  category: "movement",
  description: "Move southwest",
  usage: "southwest",
  help: "Move to the room to the southwest.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    movePlayer(session, 'southwest', entityManager, colors);
  }
};
