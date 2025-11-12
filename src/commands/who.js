/**
 * who command
 * List all players currently online
 * Ported from legacy Wumpy implementation with table-based display
 */

module.exports = {
  id: "who",
  name: "who",
  aliases: [],
  category: "basic",
  description: "See all players in the world",
  usage: "who",
  help: "Shows a list of all players currently logged into the game and their locations.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    // Get all active sessions (online players only)
    const activeSessions = Array.from(entityManager.sessions.values()).filter(s =>
      s.state === 'playing' && s.player
    );

    if (activeSessions.length === 0) {
      session.sendLine('');
      session.sendLine(colors.info('No players are currently online.'));
      session.sendLine('');
      return;
    }

    // Build formatted table
    let output = [];
    const totalWidth = 80;

    output.push(colors.info('Online Players:'));
    output.push(colors.line(totalWidth, '-'));
    output.push(
      colors.highlight(
        'Username'.padEnd(25) +
        'Realm'.padEnd(30) +
        'Level'.padEnd(10) +
        'Status'.padEnd(15)
      )
    );
    output.push(colors.line(totalWidth, '-'));

    // Process each active session
    for (const s of activeSessions) {
      const player = s.player;
      const room = entityManager.get(player.currentRoom);

      // Extract realm from room ID (e.g., "sesame_street_room_001" -> "Sesame Street")
      let realm = 'Unknown';
      if (room && room.id) {
        // Try to extract realm from room ID pattern
        const realmMatch = room.id.match(/^([a-z_]+)_/);
        if (realmMatch) {
          realm = realmMatch[1].split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        }
      }

      // Display name with indicator if it's you
      const displayName = player.name + (player.id === session.player.id ? ' (you)' : '');
      const paddedName = colors.pad(colors.playerName(displayName), 25);

      // Format level
      const level = player.level || 1;
      const paddedLevel = colors.pad(colors.colorize(level.toString(), colors.MUD_COLORS.INFO), 10);

      // Format realm
      const paddedRealm = colors.pad(colors.colorize(realm, colors.MUD_COLORS.ROOM_NAME), 30);

      // Status (for future expansion: ghost mode, afk, etc.)
      const status = 'Active';
      const paddedStatus = colors.pad(colors.colorize(status, colors.MUD_COLORS.SUCCESS), 15);

      output.push(
        paddedName +
        paddedRealm +
        paddedLevel +
        paddedStatus
      );
    }

    output.push(colors.line(totalWidth, '-'));
    output.push(colors.hint(`Total: ${activeSessions.length} player(s)`));

    session.sendLine('');
    session.sendLine(output.join('\n'));
    session.sendLine('');
  }
};
