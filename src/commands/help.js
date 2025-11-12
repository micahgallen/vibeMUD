/**
 * help command
 * Show command list
 */

module.exports = {
  id: "help",
  name: "help",
  aliases: [],
  category: "system",
  description: "Show command list",
  usage: "help [command]",
  help: "Displays a list of available commands or detailed help for a specific command.",
  requiresLogin: false,

  execute: function(session, args, entityManager, colors) {
    const commands = entityManager.getCommands();

    if (args) {
      // Show help for specific command
      const cmd = entityManager.findCommand(args);
      if (!cmd) {
        session.sendLine(`No help found for '${args}'.`);
        return;
      }

      session.sendLine('');
      session.sendLine(colors.highlight(cmd.name.toUpperCase()));
      session.sendLine('');
      session.sendLine(colors.info('Usage:') + ` ${cmd.usage}`);
      session.sendLine('');
      session.sendLine(cmd.help);

      if (cmd.aliases && cmd.aliases.length > 0) {
        session.sendLine('');
        session.sendLine(colors.warning('Aliases:') + ` ${cmd.aliases.join(', ')}`);
      }
      session.sendLine('');
      return;
    }

    // Show all commands organized by category
    const categories = {
      basic: 'Basic Commands',
      item: 'Item Commands',
      container: 'Container Commands',
      system: 'System Commands'
    };

    session.sendLine('');

    for (const [category, title] of Object.entries(categories)) {
      const cmdsInCategory = commands.filter(cmd => cmd.category === category);
      if (cmdsInCategory.length > 0) {
        session.sendLine(colors.highlight(`=== ${title} ===`));
        cmdsInCategory.forEach(cmd => {
          const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
          const padding = ' '.repeat(Math.max(0, 20 - cmd.name.length - aliases.length));
          session.sendLine(`  ${cmd.name}${aliases}${padding}- ${cmd.description}`);
        });
        session.sendLine('');
      }
    }

    session.sendLine('Type "help <command>" for detailed information about a specific command.');
    session.sendLine('');
  }
};
