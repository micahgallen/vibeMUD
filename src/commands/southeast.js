/**
 * southeast command
 * Move southeast
 */

const { movePlayer } = require('../systems/movement');

module.exports = {
  id: "southeast",
  name: "southeast",
  aliases: ["se"],
  category: "movement",
  description: "Move southeast",
  usage: "southeast",
  help: "Move to the room to the southeast.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    movePlayer(session, 'southeast', entityManager, colors);
  }
};
