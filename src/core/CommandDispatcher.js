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
   * Reload all commands (clears require cache first)
   */
  reloadCommands() {
    const commandsDir = path.join(__dirname, '../commands');
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

    // Clear require cache for all command files
    for (const file of files) {
      const filePath = path.join(commandsDir, file);
      delete require.cache[require.resolve(filePath)];
    }

    // Clear existing commands (but keep emotes)
    const emotesToKeep = new Map();
    for (const [name, cmd] of this.commands.entries()) {
      if (cmd.definition === 'emote') {
        emotesToKeep.set(name, cmd);
      }
    }
    this.commands.clear();
    for (const [name, emote] of emotesToKeep.entries()) {
      this.commands.set(name, emote);
    }

    // Reload commands
    this.loadCommands();

    return files.length;
  }

  /**
   * Load all emotes from src/emotes/
   * Emotes use prototypal inheritance from lib/emote.js
   */
  loadEmotes() {
    const emotesDir = path.join(__dirname, '../emotes');

    // Check if emotes directory exists
    if (!fs.existsSync(emotesDir)) {
      console.log('No emotes directory found, skipping emote loading\n');
      return;
    }

    const files = fs.readdirSync(emotesDir).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
      console.log('No emotes found\n');
      return;
    }

    console.log(`Loading ${files.length} emotes...`);
    let loadedCount = 0;

    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(emotesDir, file), 'utf8'));

        if (data.definition === 'emote') {
          // Load the emote definition (behavior template)
          const emoteDef = require('../lib/emote.js');

          // Create instance with prototypal inheritance
          const emote = Object.create(emoteDef);
          Object.assign(emote, data);

          // Register as a command
          this.commands.set(emote.name, emote);

          // Register aliases
          if (emote.aliases && emote.aliases.length > 0) {
            for (const alias of emote.aliases) {
              this.commands.set(alias, emote);
            }
          }

          loadedCount++;
        }
      } catch (error) {
        console.error(`  ⚠️  Failed to load emote ${file}:`, error.message);
      }
    }

    console.log(`✅ Loaded ${loadedCount} emotes\n`);
  }

  /**
   * Reload all emotes (clears require cache first)
   */
  reloadEmotes() {
    const emotesDir = path.join(__dirname, '../emotes');

    if (!fs.existsSync(emotesDir)) {
      return 0;
    }

    // Clear require cache for emote definition
    const emotePath = path.join(__dirname, '../lib/emote.js');
    delete require.cache[require.resolve(emotePath)];

    // Clear existing emotes (but keep regular commands)
    const commandsToKeep = new Map();
    for (const [name, cmd] of this.commands.entries()) {
      if (cmd.definition !== 'emote') {
        commandsToKeep.set(name, cmd);
      }
    }
    this.commands.clear();
    for (const [name, command] of commandsToKeep.entries()) {
      this.commands.set(name, command);
    }

    // Reload emotes
    this.loadEmotes();

    // Count loaded emotes
    const files = fs.readdirSync(emotesDir).filter(f => f.endsWith('.json'));
    return files.length;
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
    const args = argParts.join(' '); // Keep as string for backwards compatibility

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
      session.sendLine(colors.error(`Error executing command: ${error.message}`));
      console.error(`Command error (${cmd.name}):`, error);
    }

    session.prompt();
  }
}

module.exports = CommandDispatcher;
