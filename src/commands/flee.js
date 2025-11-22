/**
 * flee command
 * Escape from combat
 */

const combat = require('../systems/combat');

module.exports = {
  id: "flee",
  name: "flee",
  aliases: ["run", "escape"],
  category: "combat",
  description: "Flee from combat",
  usage: "flee",
  help: "Escapes from combat. In Phase 1, fleeing always succeeds. Future phases may add success chance based on dexterity.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Check if in combat
    if (!player.combat) {
      session.sendLine(colors.error('You are not in combat!'));
      return;
    }

    // Get opponent for notification
    const opponentId = player.combat.opponent;
    const opponent = entityManager.get(opponentId);

    // Disengage from combat
    combat.disengage(player.id, entityManager);

    // Notify player
    session.sendLine('');
    session.sendLine(colors.success('You flee from combat!'));
    session.sendLine('');

    // Notify room
    const room = entityManager.get(player.currentRoom);
    if (room) {
      entityManager.notifyRoom(room.id,
        `\x1b[33m${(player.capname || player.name)} flees from combat!\x1b[0m`,
        [player.id]);
    }
  }
};
