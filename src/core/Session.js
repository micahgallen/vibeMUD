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
    try {
      let output = message;

      // Apply global word templates first (unless already processed)
      if (!options._templateProcessed && typeof output === 'string') {
        // Detect context color from start of message to preserve base color after template resets
        let contextColor = null;

        // Check if message starts with an ANSI color code
        // eslint-disable-next-line no-control-regex
        const ansiMatch = output.match(/^\x1b\[(\d+)m/);
        if (ansiMatch) {
          const ansiCode = `\x1b[${ansiMatch[1]}m`;
          contextColor = Session._ansiToTagName(ansiCode);
        }

        output = colorization.processGlobalTemplates(output, contextColor);
        // Mark as processed to prevent double-application
        options._templateProcessed = true;
      }

      // Safety check: ensure output is still a string after template processing
      if (typeof output !== 'string') {
        console.error('WARNING: processGlobalTemplates returned non-string:', typeof output, output);
        output = String(message); // Fallback to original message
      }

      // Apply keyword colorization if requested
      if (options.colorize && options.context) {
        output = colorization.processText(output, options.context);
      }

      // Safety check after processText
      if (typeof output !== 'string') {
        console.error('WARNING: processText returned non-string:', typeof output, output);
        output = String(message);
      }

      // Parse color tags to ANSI codes
      output = parseColorTags(output);

      // Safety check after parseColorTags
      if (typeof output !== 'string') {
        console.error('WARNING: parseColorTags returned non-string:', typeof output, output);
        output = String(message);
      }

      // Ensure clean line ending (prevent color bleeding)
      output = display.ensureReset(output);

      // Final safety check
      if (typeof output !== 'string') {
        console.error('WARNING: ensureReset returned non-string:', typeof output, output);
        output = String(message);
      }

      this.socket.write(output + '\r\n');
    } catch (error) {
      console.error('ERROR in Session.sendLine:', error);
      console.error('Original message:', message);
      // Try to send the original message without processing
      try {
        this.socket.write(String(message) + '\r\n');
      } catch (fallbackError) {
        console.error('CRITICAL: Failed to send even fallback message:', fallbackError);
      }
    }
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

  /**
   * Map ANSI color codes to tag names for context color restoration
   * This is used to detect the base color of messages so templates can restore it
   *
   * @param {string} ansiCode - ANSI color code (e.g., '\x1b[95m')
   * @returns {string|null} Tag name (e.g., 'bright_magenta') or null if unmapped
   * @private
   */
  static _ansiToTagName(ansiCode) {
    // Map common ANSI codes to their tag names
    const ANSI_TO_TAG = {
      '\x1b[30m': 'black',
      '\x1b[31m': 'red',
      '\x1b[32m': 'green',
      '\x1b[33m': 'yellow',
      '\x1b[34m': 'blue',
      '\x1b[35m': 'magenta',
      '\x1b[36m': 'cyan',
      '\x1b[37m': 'white',
      '\x1b[90m': 'bright_black',
      '\x1b[91m': 'bright_red',
      '\x1b[92m': 'bright_green',
      '\x1b[93m': 'bright_yellow',
      '\x1b[94m': 'bright_blue',
      '\x1b[95m': 'bright_magenta',  // Emote color
      '\x1b[96m': 'bright_cyan',
      '\x1b[97m': 'bright_white'
    };

    return ANSI_TO_TAG[ansiCode] || null;
  }
}

module.exports = Session;
