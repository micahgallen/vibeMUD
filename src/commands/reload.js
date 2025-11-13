/**
 * reload command
 * Hot-reload various game content without restarting the server
 * Useful for development and adding new content on-the-fly
 */

module.exports = {
  id: "reload",
  name: "reload",
  aliases: ["hotload"],
  category: "admin",
  description: "Reload game content without restarting server",
  usage: "reload <commands|emotes|npcs|rooms|all>",
  help: "Hot-loads modified or new content from disk without server restart. Options:\n" +
        "  commands - Reload all command files from src/commands/\n" +
        "  emotes   - Reload all emote files from src/emotes/\n" +
        "  npcs     - Reload all NPC definitions from src/world/*/npcs/\n" +
        "  rooms    - Reload all room definitions from src/world/*/rooms/\n" +
        "  all      - Reload everything\n\n" +
        "Useful for development when adding or modifying content.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    // Access commandDispatcher from global scope (set by server.js)
    if (!global.commandDispatcher) {
      session.sendLine('');
      session.sendLine(colors.error('CommandDispatcher not available. Server restart required.'));
      session.sendLine('');
      return;
    }

    if (!args) {
      session.sendLine('');
      session.sendLine(colors.error('Usage: reload <commands|emotes|npcs|rooms|all>'));
      session.sendLine('');
      session.sendLine('Options:');
      session.sendLine(colors.info('  commands') + ' - Reload command files');
      session.sendLine(colors.info('  emotes') + '   - Reload emote files');
      session.sendLine(colors.info('  npcs') + '     - Reload NPC definitions');
      session.sendLine(colors.info('  rooms') + '    - Reload room definitions');
      session.sendLine(colors.info('  all') + '      - Reload everything');
      session.sendLine('');
      return;
    }

    const target = args.toLowerCase().trim();

    session.sendLine('');

    try {
      switch (target) {
        case 'commands':
        case 'command':
        case 'cmd':
          session.sendLine(colors.info('Reloading commands from disk...'));
          const cmdCount = global.commandDispatcher.reloadCommands();
          session.sendLine(colors.success(`✅ Reloaded ${cmdCount} command file(s)`));
          session.sendLine(colors.hint('All commands are now updated.'));
          // Broadcast to all players
          for (const s of entityManager.sessions.values()) {
            if (s.player && s.state === 'playing' && s.player.id !== session.player.id) {
              s.sendLine(colors.system('[SYSTEM] Commands have been reloaded by an administrator.'));
            }
          }
          break;

        case 'emotes':
        case 'emote':
          session.sendLine(colors.info('Reloading emotes from disk...'));
          const emoteCount = global.commandDispatcher.reloadEmotes();
          session.sendLine(colors.success(`✅ Reloaded ${emoteCount} emote file(s)`));
          session.sendLine(colors.hint('All emotes are now updated.'));
          // Broadcast to all players
          for (const s of entityManager.sessions.values()) {
            if (s.player && s.state === 'playing' && s.player.id !== session.player.id) {
              s.sendLine(colors.system('[SYSTEM] Emotes have been reloaded by an administrator.'));
            }
          }
          break;

        case 'npcs':
        case 'npc':
          session.sendLine(colors.info('Reloading NPCs from disk...'));
          const npcResult = entityManager.reloadNPCs();
          session.sendLine(colors.success(`✅ Reloaded ${npcResult.reloaded} NPC(s), added ${npcResult.added} new NPC(s)`));
          session.sendLine(colors.hint('NPC definitions, dialogue, and behaviors updated.'));
          // Broadcast to all players
          for (const s of entityManager.sessions.values()) {
            if (s.player && s.state === 'playing' && s.player.id !== session.player.id) {
              s.sendLine(colors.system('[SYSTEM] NPCs have been reloaded by an administrator.'));
            }
          }
          break;

        case 'rooms':
        case 'room':
          session.sendLine(colors.info('Reloading rooms from disk...'));
          const roomResult = entityManager.reloadRooms();
          session.sendLine(colors.success(`✅ Reloaded ${roomResult.reloaded} room(s), added ${roomResult.added} new room(s)`));
          session.sendLine(colors.hint('Room descriptions and properties updated.'));
          // Broadcast to all players
          for (const s of entityManager.sessions.values()) {
            if (s.player && s.state === 'playing' && s.player.id !== session.player.id) {
              s.sendLine(colors.system('[SYSTEM] Rooms have been reloaded by an administrator.'));
            }
          }
          break;

        case 'all':
        case 'everything':
          session.sendLine(colors.info('Reloading all content from disk...'));
          const cmdCountAll = global.commandDispatcher.reloadCommands();
          const emoteCountAll = global.commandDispatcher.reloadEmotes();
          const npcResultAll = entityManager.reloadNPCs();
          const roomResultAll = entityManager.reloadRooms();
          session.sendLine(colors.success('✅ Reload complete!'));
          session.sendLine(colors.info(`   ${cmdCountAll} command file(s)`));
          session.sendLine(colors.info(`   ${emoteCountAll} emote file(s)`));
          session.sendLine(colors.info(`   ${npcResultAll.reloaded + npcResultAll.added} NPC(s)`));
          session.sendLine(colors.info(`   ${roomResultAll.reloaded + roomResultAll.added} room(s)`));
          session.sendLine(colors.hint('All content is now updated.'));
          // Broadcast to all players
          for (const s of entityManager.sessions.values()) {
            if (s.player && s.state === 'playing' && s.player.id !== session.player.id) {
              s.sendLine(colors.system('[SYSTEM] All game content has been reloaded by an administrator.'));
            }
          }
          break;

        default:
          session.sendLine(colors.error(`Unknown reload target: '${target}'`));
          session.sendLine('');
          session.sendLine('Valid options: ' + colors.info('commands') + ', ' + colors.info('emotes') + ', ' + colors.info('npcs') + ', ' + colors.info('rooms') + ', ' + colors.info('all'));
          break;
      }
    } catch (error) {
      session.sendLine(colors.error(`Failed to reload: ${error.message}`));
      console.error('Reload error:', error);
    }

    session.sendLine('');
  }
};
