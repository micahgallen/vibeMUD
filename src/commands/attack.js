/**
 * attack command
 * Initiate combat with a target
 */

const combat = require('../systems/combat');
const display = require('../utils/display');

module.exports = {
  id: "attack",
  name: "attack",
  aliases: ["att"],
  category: "combat",
  description: "Attack a target to initiate combat",
  usage: "attack <target>",
  help: "Initiates combat with the specified target. Combat occurs in rounds every 2 seconds until one participant dies or flees.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Check if player is a ghost
    if (player.isGhost) {
      session.sendLine(colors.error('You are a ghost and cannot fight until you respawn!'));
      return;
    }

    // Check if already in combat
    if (player.combat) {
      session.sendLine(colors.error('You are already in combat!'));
      return;
    }

    // Parse target
    const targetName = args.trim().toLowerCase();

    if (!targetName) {
      session.sendLine(colors.error('Attack whom?'));
      session.sendLine(colors.hint('Usage: attack <target>'));
      return;
    }

    // Get current room
    const room = entityManager.get(player.currentRoom);
    if (!room) {
      session.sendLine(colors.error('You are in a void. This should not happen.'));
      return;
    }

    // Find target in room
    let target = null;

    // Check NPCs in room
    const npcsInRoom = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'npc' &&
      obj.currentRoom === room.id
    );

    for (const npc of npcsInRoom) {
      // Match by name or keywords
      const npcNameLower = npc.name.toLowerCase();
      const keywords = npc.keywords || [];

      if (npcNameLower.includes(targetName) ||
          keywords.some(kw => kw.toLowerCase().includes(targetName))) {
        target = npc;
        break;
      }
    }

    // Check other players in room (if PvP is enabled - for now allow it)
    if (!target) {
      const playersInRoom = Array.from(entityManager.objects.values()).filter(obj =>
        obj.type === 'player' &&
        obj.currentRoom === room.id &&
        obj.id !== player.id &&
        entityManager.sessions.has(obj.id)
      );

      // Use display.matchesName for color-aware player matching
      for (const otherPlayer of playersInRoom) {
        if (display.matchesName(targetName, otherPlayer)) {
          target = otherPlayer;
          break;
        }
      }
    }

    // Target not found
    if (!target) {
      session.sendLine(colors.error(`You don't see '${targetName}' here.`));
      return;
    }

    // Check if target is already in combat
    if (target.combat) {
      const targetName = target.type === 'player' ? display.getDisplayName(target) : target.name;
      session.sendLine(colors.error(`${targetName} is already in combat!`));
      return;
    }

    // Check if target is dead
    if (target.isDead) {
      const targetName = target.type === 'player' ? display.getDisplayName(target) : target.name;
      session.sendLine(colors.error(`${targetName} is already dead!`));
      return;
    }

    // Initiate combat
    combat.engage(player.id, target.id, entityManager);
  }
};
