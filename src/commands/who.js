/**
 * who command
 * List all players currently online
 * Ported from legacy Wumpy implementation with table-based display
 */

const { getDisplayName } = require('../utils/playerDisplay');
const fs = require('fs');
const path = require('path');

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
        'Username'.padEnd(20) +
        'Realm'.padEnd(25) +
        'Level'.padEnd(8) +
        'Role'.padEnd(12) +
        'Status'.padEnd(15)
      )
    );
    output.push(colors.line(totalWidth, '-'));

    // Process each active session
    for (const s of activeSessions) {
      const player = s.player;
      const room = entityManager.get(player.currentRoom);

      // Extract realm from room file path
      let realm = 'Unknown';
      if (room && room.id) {
        // Recursively search for room file in world directory
        const worldPath = path.join(__dirname, '../world');

        const findRoomRealm = (dir, depth = 0) => {
          if (depth > 3) return null; // Prevent infinite recursion

          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            // Check if there's a rooms subdirectory here
            const roomsDir = path.join(dir, 'rooms');
            if (fs.existsSync(roomsDir)) {
              const roomPath = path.join(roomsDir, `${room.id}.json`);
              if (fs.existsSync(roomPath)) {
                // Found it! Extract realm from path relative to world dir
                const relativePath = path.relative(worldPath, dir);
                return relativePath.split(path.sep)[0]; // Get top-level realm dir
              }
            }

            // Recursively check subdirectories
            for (const entry of entries) {
              if (entry.isDirectory() && entry.name !== 'rooms') {
                const result = findRoomRealm(path.join(dir, entry.name), depth + 1);
                if (result) return result;
              }
            }
          } catch (err) {
            // Ignore errors
          }

          return null;
        };

        const realmDir = findRoomRealm(worldPath);
        if (realmDir) {
          // Format realm name from directory (e.g., "sesame_street" -> "Sesame Street")
          realm = realmDir.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        }
      }

      // Display name with indicator if it's you
      const displayName = getDisplayName(player) + (player.id === session.player.id ? ' (you)' : '');
      const paddedName = colors.pad(colors.playerName(displayName), 20);

      // Format level
      const level = player.level || 1;
      const paddedLevel = colors.pad(colors.colorize(level.toString(), colors.MUD_COLORS.INFO), 8);

      // Format realm
      const paddedRealm = colors.pad(colors.colorize(realm, colors.MUD_COLORS.ROOM_NAME), 25);

      // Format role
      const role = player.isAdmin ? 'Admin' : 'Player';
      const roleColor = player.isAdmin ? colors.MUD_COLORS.ERROR : colors.MUD_COLORS.DIM;
      const paddedRole = colors.pad(colors.colorize(role, roleColor), 12);

      // Status (show ghost mode or active)
      const status = player.isGhost ? 'Ghost' : 'Active';
      const statusColor = player.isGhost ? colors.MUD_COLORS.DIM : colors.MUD_COLORS.SUCCESS;
      const paddedStatus = colors.pad(colors.colorize(status, statusColor), 15);

      output.push(
        paddedName +
        paddedRealm +
        paddedLevel +
        paddedRole +
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
