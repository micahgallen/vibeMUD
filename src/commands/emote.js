const { getDisplayName } = require('../utils/display');
const { matchesName } = require('../utils/display');

/**
 * Custom Emote Command
 *
 * Allows players to create free-form emotes that describe their actions.
 * Unlike the predefined emote JSON files, this allows dynamic custom messages.
 *
 * Syntax:
 *   emote <action>              - Emote to the room
 *   emote <action> at <target>  - Emote at a specific target
 *
 * Examples:
 *   emote scratches his head
 *   emote grins mischievously
 *   emote scratches his head at Bob
 *   emote waves enthusiastically at the shopkeeper
 */

module.exports = {
  id: 'emote',
  name: 'emote',
  aliases: [':'],  // Allow ':' as shortcut like in many MUDs
  category: 'social',
  description: 'Perform a custom emote action.',
  usage: 'emote <action> [at <target>]',
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    if (!room) {
      session.sendLine(colors.error('You are nowhere. The void swallows your emotions.'));
      return;
    }

    if (!args || args.trim().length === 0) {
      session.sendLine(colors.error('Usage: emote <action> [at <target>]'));
      session.sendLine('Examples:');
      session.sendLine('  emote scratches his head');
      session.sendLine('  emote grins mischievously at Bob');
      return;
    }

    const playerName = getDisplayName(player);
    let emoteText = args.trim();
    let target = null;

    // Check if emote is targeted using "at <target>"
    const atMatch = emoteText.match(/\s+at\s+(.+)$/i);

    if (atMatch) {
      const targetName = atMatch[1].toLowerCase().trim();
      emoteText = emoteText.substring(0, atMatch.index).trim();

      // Find target player in the room
      const playersInRoom = Array.from(entityManager.sessions.values()).filter(s =>
        s.state === 'playing' &&
        s.player &&
        s.player.currentRoom === room.id &&
        s.player.id !== player.id
      );

      const playerTarget = playersInRoom.find(s =>
        matchesName(targetName, s.player)
      );

      if (playerTarget) {
        target = playerTarget;
      } else {
        // Check for NPCs in the room
        const npcsInRoom = Array.from(entityManager.objects.values()).filter(obj =>
          obj.type === 'npc' &&
          obj.currentRoom === room.id
        );

        const npcTarget = npcsInRoom.find(npc => {
          const nameLower = npc.name.toLowerCase();
          // Check if name starts with target
          if (nameLower.startsWith(targetName)) return true;
          // Check if any keyword matches
          if (npc.keywords && Array.isArray(npc.keywords)) {
            return npc.keywords.some(keyword =>
              keyword.toLowerCase() === targetName ||
              keyword.toLowerCase().startsWith(targetName)
            );
          }
          return false;
        });

        if (npcTarget) {
          target = { player: npcTarget, isNPC: true };
        } else {
          session.sendLine(colors.error(`You don't see '${targetName}' here.`));
          return;
        }
      }
    }

    // Build and send the emote message
    if (target) {
      // Targeted emote
      const targetPlayer = target.player;
      const targetName = colors.playerName(getDisplayName(targetPlayer));
      const fullMessage = `${playerName} ${emoteText} at ${getDisplayName(targetPlayer)}.`;

      // Show to actor
      session.sendLine('');
      session.sendLine(colors.emote(`${playerName} ${emoteText} at ${targetName}.`));
      session.sendLine('');

      // Show to target (if it's a player with a session)
      if (!target.isNPC && target.sendLine) {
        target.sendLine('');
        target.sendLine(colors.emote(`${playerName} ${emoteText} at you.`));
        target.sendLine('');
      }

      // Show to others in the room
      const othersInRoom = Array.from(entityManager.sessions.values()).filter(s =>
        s.state === 'playing' &&
        s.player &&
        s.player.currentRoom === room.id &&
        s.player.id !== player.id &&
        s.player.id !== targetPlayer.id
      );

      othersInRoom.forEach(s => {
        s.sendLine('');
        s.sendLine(colors.emote(fullMessage));
        s.sendLine('');
      });

      // Notify target NPC if it has emote trigger handling
      if (target.isNPC && targetPlayer.type === 'npc' && typeof targetPlayer.onEmoteReceived === 'function') {
        targetPlayer.onEmoteReceived('custom_emote', player, entityManager, emoteText);
      }

    } else {
      // Untargeted emote
      const fullMessage = `${playerName} ${emoteText}.`;

      // Show to actor
      session.sendLine('');
      session.sendLine(colors.emote(fullMessage));
      session.sendLine('');

      // Show to others in the room
      entityManager.notifyRoom(room.id, colors.emote(fullMessage), player.id);
    }
  }
};
