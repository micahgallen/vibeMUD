/**
 * kill command
 * Alias for attack command
 */

const attackCommand = require('./attack');

module.exports = {
  id: "kill",
  name: "kill",
  aliases: ["k"],
  category: "combat",
  description: "Attack a target (alias for 'attack')",
  usage: "kill <target>",
  help: "Alias for the 'attack' command. Initiates combat with the specified target.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    // Delegate to attack command
    attackCommand.execute(session, args, entityManager, colors);
  }
};
