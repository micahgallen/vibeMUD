/**
 * capname.js
 *
 * Displays the player's current capname.
 */

const Command = {
  id: 'capname',
  name: 'capname',
  aliases: ['displayname'],
  category: 'Player',
  description: 'Displays your current capname.',
  usage: 'capname',
  requiresLogin: true,
  
  execute: function(session, args, entityManager, colors) {
    if (!session.player) {
      session.sendLine('You are not logged in.');
      return;
    }

    const capname = session.player.capname;

    if (capname) {
      session.sendLine(`Your current capname is: ${capname}`);
    } else {
      session.sendLine('You have not set a capname. Use `set capname <name>` to set one.');
    }
  }
};

module.exports = Command;
