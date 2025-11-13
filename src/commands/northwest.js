/**
 * northwest command
 * Move northwest
 */

const { movePlayer } = require('../systems/movement');

module.exports = {
  id: "northwest",
  name: "northwest",
  aliases: ["nw"],
  category: "movement",
  description: "Move northwest",
  usage: "northwest",
  help: "Move to the room to the northwest.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    movePlayer(session, 'northwest', entityManager, colors);
  }
};
