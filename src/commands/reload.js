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
  usage: "reload <commands|emotes|all>",
  help: "Hot-loads modified or new content from disk without server restart. Options:\n" +
        "  commands - Reload all command files from src/commands/\n" +
        "  emotes   - Reload all emote files from src/emotes/\n" +
        "  all      - Reload both commands and emotes\n\n" +
        "Useful for development when adding or modifying commands/emotes.",
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
      session.sendLine(colors.error('Usage: reload <commands|emotes|all>'));
      session.sendLine('');
      session.sendLine('Options:');
      session.sendLine(colors.info('  commands') + ' - Reload command files');
      session.sendLine(colors.info('  emotes') + '   - Reload emote files');
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
          break;

        case 'emotes':
        case 'emote':
          session.sendLine(colors.info('Reloading emotes from disk...'));
          const emoteCount = global.commandDispatcher.reloadEmotes();
          session.sendLine(colors.success(`✅ Reloaded ${emoteCount} emote file(s)`));
          session.sendLine(colors.hint('All emotes are now updated.'));
          break;

        case 'all':
        case 'everything':
          session.sendLine(colors.info('Reloading all content from disk...'));
          const cmdCountAll = global.commandDispatcher.reloadCommands();
          const emoteCountAll = global.commandDispatcher.reloadEmotes();
          session.sendLine(colors.success('✅ Reload complete!'));
          session.sendLine(colors.info(`   ${cmdCountAll} command file(s)`));
          session.sendLine(colors.info(`   ${emoteCountAll} emote file(s)`));
          session.sendLine(colors.hint('All content is now updated.'));
          break;

        default:
          session.sendLine(colors.error(`Unknown reload target: '${target}'`));
          session.sendLine('');
          session.sendLine('Valid options: ' + colors.info('commands') + ', ' + colors.info('emotes') + ', ' + colors.info('all'));
          break;
      }
    } catch (error) {
      session.sendLine(colors.error(`Failed to reload: ${error.message}`));
      console.error('Reload error:', error);
    }

    session.sendLine('');
  }
};
