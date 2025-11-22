/**
 * Session - Represents a player connection
 */

const display = require('../utils/display');
const colorization = require('../systems/colorization');
const { parseColorTags } = require('./colors');

class Session {
  constructor(socket) {
    this.socket = socket;
    this.player = null;
    this.state = 'login_name';  // login_name, login_password, new_password, confirm_password, playing
    this.buffer = '';
    this.loginName = null;
    this.autoColorize = false; // Future: enable keyword colorization by default
  }

  send(message) {
    this.socket.write(message);
  }

  /**
   * Send a line of text to the player
   * Automatically appends ANSI reset and newline
   *
   * @param {string} message - Message to send
   * @param {object} options - Options for colorization
   * @param {string} options.context - Context for keyword colorization
   * @param {boolean} options.colorize - Whether to apply keyword colorization (default: false)
   * @param {boolean} options._templateProcessed - Internal flag to prevent double-processing
   */
  sendLine(message = '', options = {}) {
    let output = message;

    // Apply global word templates first (unless already processed)
    if (!options._templateProcessed && typeof output === 'string') {
      output = colorization.processGlobalTemplates(output);
      // Mark as processed to prevent double-application
      options._templateProcessed = true;
    }

    // Apply keyword colorization if requested
    if (options.colorize && options.context) {
      output = colorization.processText(output, options.context);
    }

    // Parse color tags to ANSI codes
    output = parseColorTags(output);

    // Ensure clean line ending (prevent color bleeding)
    output = display.ensureReset(output);
    this.socket.write(output + '\r\n');
  }

  /**
   * Send a message using template substitution
   * Useful for structured messages with variable replacements
   *
   * @param {string} template - Template string with {placeholders}
   * @param {object} variables - Variables to substitute
   * @param {string} context - Context for colorization (default: 'system')
   */
  sendTemplate(template, variables = {}, context = 'system') {
    const processed = display.processTemplate(template, variables, context);
    this.sendLine(processed);
  }

  /**
   * Send a colorized message using a specific context
   * Convenience wrapper for sendLine with colorization enabled
   *
   * @param {string} message - Message to send
   * @param {string} context - Context for keyword colorization
   */
  sendColorized(message, context = 'system') {
    this.sendLine(message, { colorize: true, context });
  }

  prompt() {
    if (this.player) {
      this.socket.write('> ');
    }
  }
}

module.exports = Session;
