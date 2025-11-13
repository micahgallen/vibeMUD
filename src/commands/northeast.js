/**
 * northeast command
 * Move northeast
 */

const { movePlayer } = require('../systems/movement');

module.exports = {
  id: "northeast",
  name: "northeast",
  aliases: ["ne"],
  category: "movement",
  description: "Move northeast",
  usage: "northeast",
  help: "Move to the room to the northeast.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    movePlayer(session, 'northeast', entityManager, colors);
  }
};
