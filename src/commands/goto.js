/**
 * goto command
 * Admin-only command to teleport to a player's location
 */

const display = require('../utils/display');

module.exports = {
  id: "goto",
  name: "goto",
  aliases: ["gtp"],
  category: "admin",
  description: "Teleport to a player's location (admin only)",
  usage: "goto <player_name>",
  help: "Instantly teleport to the specified player's current location. This command is only available to administrators.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Check if player is an admin
    if (!player.isAdmin) {
      session.sendLine(colors.error('You do not have permission to use this command.'));
      return;
    }

    // Check if player name was provided
    if (!args || args.trim() === '') {
      session.sendLine(colors.error('Usage: goto <player_name>'));
      session.sendLine(colors.hint('Example: goto Cyberslayer'));
      return;
    }

    const targetName = args.trim();

    // Find the target player using color-aware matching
    const onlinePlayers = Array.from(entityManager.sessions.values())
      .filter(s => s.state === 'playing' && s.player)
      .map(s => s.player);

    const targetPlayer = onlinePlayers.find(p =>
      display.matchesName(targetName, p) || p.id.toLowerCase() === targetName.toLowerCase()
    );

    // Validate target player exists
    if (!targetPlayer) {
      session.sendLine(colors.error(`Player '${targetName}' does not exist.`));
      return;
    }

    // Check if target player is online
    if (!entityManager.sessions.has(targetPlayer.id)) {
      const targetDisplayName = display.getDisplayName(targetPlayer);
      session.sendLine(colors.error(`${targetDisplayName} is not currently online.`));
      return;
    }

    // Check if trying to goto self
    if (targetPlayer.id === player.id) {
      session.sendLine(colors.error('You are already at your own location!'));
      return;
    }

    const targetRoomId = targetPlayer.currentRoom;
    const targetRoom = entityManager.get(targetRoomId);

    if (!targetRoom) {
      const targetDisplayName = display.getDisplayName(targetPlayer);
      session.sendLine(colors.error(`${targetDisplayName}'s current room does not exist.`));
      return;
    }

    const oldRoomId = player.currentRoom;
    const oldRoom = entityManager.get(oldRoomId);

    // Notify old room (use custom exit message if set)
    if (oldRoom) {
      const playerDisplayName = display.getDisplayName(player);
      const exitMessage = player.tpExitMessage
        ? player.tpExitMessage.replace('{name}', playerDisplayName)
        : `${playerDisplayName} disappears in a flash of light!`;

      entityManager.notifyRoom(oldRoomId,
        colors.info(exitMessage),
        player.id);
    }

    // Move player to new room
    player.currentRoom = targetRoomId;
    entityManager.markDirty(player.id);

    // Notify new room (use custom enter message if set)
    const playerDisplayName = display.getDisplayName(player);
    const enterMessage = player.tpEnterMessage
      ? player.tpEnterMessage.replace('{name}', playerDisplayName)
      : `${playerDisplayName} appears in a flash of light!`;

    entityManager.notifyRoom(targetRoomId,
      colors.info(enterMessage),
      player.id);

    // Show the player their new location
    const targetDisplayName = display.getDisplayName(targetPlayer);
    session.sendLine(colors.success(`You teleport to ${targetDisplayName}'s location!`));
    session.sendLine('');

    // Auto-look at new room
    const lookCommand = require('./look.js');
    lookCommand.execute(session, '', entityManager, colors);
  }
};
