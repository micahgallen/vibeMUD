/**
 * CommandDispatcher - Loads and executes player commands
 * Part of the vibeMUD core infrastructure
 */
const fs = require('fs');
const path = require('path');

class CommandDispatcher {
  constructor() {
    this.commands = new Map();
  }

  /**
   * Load all commands from src/commands/
   */
  loadCommands() {
    const commandsDir = path.join(__dirname, '../commands');
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

    console.log(`Loading ${files.length} commands...`);
    for (const file of files) {
      const cmd = require(path.join(commandsDir, file));
      this.commands.set(cmd.name, cmd);

      // Also register aliases
      if (cmd.aliases) {
        for (const alias of cmd.aliases) {
          this.commands.set(alias, cmd);
        }
      }
    }
    console.log(`✅ Loaded ${files.length} commands\n`);
  }

  /**
   * Get a command by name or alias
   */
  getCommand(name) {
    return this.commands.get(name.toLowerCase());
  }

  /**
   * Dispatch a command from player input
   */
  dispatch(input, session, entityManager, colors) {
    input = input.trim();

    if (!input) {
      session.prompt();
      return;
    }

    const [commandName, ...argParts] = input.split(' ');
    const args = argParts.join(' ');

    const cmd = this.getCommand(commandName);

    if (!cmd) {
      session.sendLine('Unknown command. Type "help" for a list of commands.');
      session.prompt();
      return;
    }

    // Execute command
    try {
      cmd.execute(session, args, entityManager, colors);
    } catch (error) {
      session.sendLine(colors.red + `Error executing command: ${error.message}` + colors.reset);
      console.error(`Command error (${cmd.name}):`, error);
    }

    session.prompt();
  }
}

module.exports = CommandDispatcher;
