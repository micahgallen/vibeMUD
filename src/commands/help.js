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
    // Access the global commandDispatcher
    const dispatcher = global.commandDispatcher;
    if (!dispatcher) {
      session.sendLine('Command system not initialized.');
      return;
    }

    if (args) {
      // Show help for specific command
      const cmd = dispatcher.getCommand(args);
      if (!cmd) {
        session.sendLine(`No help found for '${args}'.`);
        return;
      }

      session.sendLine('');
      session.sendLine(colors.highlight(cmd.name.toUpperCase()));
      session.sendLine('');
      session.sendLine(colors.info('Usage:') + ` ${cmd.usage || cmd.name}`);
      if (cmd.description) {
        session.sendLine('');
        session.sendLine(cmd.description);
      }
      if (cmd.help) {
        session.sendLine('');
        session.sendLine(cmd.help);
      }

      if (cmd.aliases && cmd.aliases.length > 0) {
        session.sendLine('');
        session.sendLine(colors.warning('Aliases:') + ` ${cmd.aliases.join(', ')}`);
      }
      session.sendLine('');
      return;
    }

    // Get all unique commands (de-duplicate aliases)
    const commandMap = new Map();
    for (const [name, cmd] of dispatcher.commands.entries()) {
      if (cmd.name === name) {
        // Only add if this is the primary name, not an alias
        commandMap.set(cmd.name, cmd);
      }
    }

    const commands = Array.from(commandMap.values());

    // Show all commands organized by category
    const categories = {
      basic: 'Basic Commands',
      movement: 'Movement',
      combat: 'Combat',
      item: 'Item Management',
      items: 'Item Management',  // Handle inconsistent casing
      container: 'Containers',
      player: 'Player Info',
      Player: 'Player Info',  // Handle inconsistent casing
      info: 'Information',
      commerce: 'Commerce',
      banking: 'Banking',
      Communication: 'Communication',
      social: 'Social/Emotes',
      system: 'System',
      admin: 'Admin Commands'
    };

    session.sendLine('');
    session.sendLine(colors.highlight('='.repeat(60)));
    session.sendLine(colors.highlight('                    AVAILABLE COMMANDS'));
    session.sendLine(colors.highlight('='.repeat(60)));
    session.sendLine('');

    // Group by category
    const grouped = {};
    for (const cmd of commands) {
      const cat = cmd.category || 'other';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(cmd);
    }

    // Display in category order
    const categoryOrder = ['basic', 'movement', 'combat', 'item', 'items', 'container',
                          'player', 'Player', 'info', 'commerce', 'banking',
                          'Communication', 'social', 'system', 'admin', 'other'];

    for (const category of categoryOrder) {
      const cmdsInCategory = grouped[category];
      if (cmdsInCategory && cmdsInCategory.length > 0) {
        const title = categories[category] || category.charAt(0).toUpperCase() + category.slice(1);
        session.sendLine(colors.success(`${title}:`));

        // Sort commands alphabetically within category
        cmdsInCategory.sort((a, b) => a.name.localeCompare(b.name));

        cmdsInCategory.forEach(cmd => {
          const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
          const padding = ' '.repeat(Math.max(0, 18 - cmd.name.length - aliases.length));
          const desc = cmd.description || 'No description';
          session.sendLine(`  ${colors.cyan(cmd.name)}${aliases}${padding}- ${desc}`);
        });
        session.sendLine('');
      }
    }

    session.sendLine(colors.dim('Type "help <command>" for detailed information about a specific command.'));
    session.sendLine('');
  }
};
