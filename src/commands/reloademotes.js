/**
 * reloademotes command
 * Hot-reload emotes from disk without restarting the server
 * Useful for development and adding new emotes on-the-fly
 */

module.exports = {
  id: "reloademotes",
  name: "reloademotes",
  aliases: ["reload-emotes"],
  category: "admin",
  description: "Reload emotes from disk without restarting server",
  usage: "reloademotes",
  help: "Hot-loads new or modified emote files from src/emotes/ directory. Useful for adding new emotes or updating existing ones without server restart.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    // Access commandDispatcher from global scope (set by server.js)
    if (!global.commandDispatcher) {
      session.sendLine('');
      session.sendLine(colors.error('CommandDispatcher not available. Server restart required.'));
      session.sendLine('');
      return;
    }

    session.sendLine('');
    session.sendLine(colors.info('Reloading emotes from disk...'));

    try {
      // Clear require cache for lib/emote.js to get fresh definition
      const path = require('path');
      const emotePath = path.join(__dirname, '../lib/emote.js');
      delete require.cache[require.resolve(emotePath)];

      // Reload emotes
      const beforeCount = global.commandDispatcher.commands.size;
      global.commandDispatcher.loadEmotes();
      const afterCount = global.commandDispatcher.commands.size;

      const added = afterCount - beforeCount;

      session.sendLine(colors.success('✅ Emotes reloaded successfully!'));
      if (added > 0) {
        session.sendLine(colors.info(`   Added ${added} new emote(s)`));
      } else {
        session.sendLine(colors.hint('   All emote files refreshed'));
      }
      session.sendLine(colors.hint('All emotes are now available for use.'));
    } catch (error) {
      session.sendLine(colors.error(`Failed to reload emotes: ${error.message}`));
      console.error('Emote reload error:', error);
    }

    session.sendLine('');
  }
};
