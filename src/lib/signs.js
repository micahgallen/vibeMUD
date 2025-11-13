/**
 * Sign Definition
 * Base definition for signs that display messages, ASCII art, or maps
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  type: 'item',
  name: 'A Sign',
  description: 'A sign with writing on it. You could READ it.',
  isReadable: true,
  canTake: false, // Most signs are fixed in place

  // Content configuration
  signTitle: null,        // Optional title/header
  signContent: null,      // Content: string, array of lines, or file path
  signType: 'text',       // 'text', 'art', 'map' (affects formatting)

  /**
   * Get the formatted content of the sign
   * This method can be called by the read command
   */
  getContent: function(entityManager) {
    if (!this.signContent) {
      return 'The sign appears to be blank.';
    }

    let content = '';

    // Handle title
    if (this.signTitle) {
      const titleBar = '='.repeat(Math.max(this.signTitle.length + 4, 40));
      content += titleBar + '\n';
      content += '  ' + this.signTitle + '\n';
      content += titleBar + '\n\n';
    }

    // Handle content based on type
    if (Array.isArray(this.signContent)) {
      // Array of lines
      content += this.signContent.join('\n');
    } else if (typeof this.signContent === 'string') {
      // Check if it's a file path
      if (this.signContent.endsWith('.txt') || this.signContent.endsWith('.md')) {
        content += this._loadContentFromFile(this.signContent);
      } else {
        // Plain text
        content += this.signContent;
      }
    }

    // Add formatting based on sign type
    if (this.signType === 'map' || this.signType === 'art') {
      // For maps and art, add a simple border
      const lines = content.split('\n');
      const maxLength = Math.max(...lines.map(l => l.length));
      const border = '+' + '-'.repeat(maxLength + 2) + '+';

      const framedLines = lines.map(line => {
        const padding = ' '.repeat(maxLength - line.length);
        return '| ' + line + padding + ' |';
      });

      return border + '\n' + framedLines.join('\n') + '\n' + border;
    }

    return content;
  },

  /**
   * Load content from a file (private helper)
   */
  _loadContentFromFile: function(filePath) {
    try {
      // Handle relative paths (relative to the sign's location)
      let fullPath = filePath;

      // If it's a relative path, try to resolve it relative to world directory
      if (!path.isAbsolute(filePath)) {
        // Try multiple possible base paths
        const basePaths = [
          path.join(__dirname, '..', 'world'),
          path.join(__dirname, '..')
        ];

        for (const basePath of basePaths) {
          const testPath = path.join(basePath, filePath);
          if (fs.existsSync(testPath)) {
            fullPath = testPath;
            break;
          }
        }
      }

      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf8');
      } else {
        return `[Error: Could not load content from ${filePath}]`;
      }
    } catch (error) {
      return `[Error reading sign content: ${error.message}]`;
    }
  },

  /**
   * Optional: Custom examine behavior
   * If the examine command calls target.examine(), this will be used
   */
  examine: function(session, entityManager, colors) {
    session.sendLine('');
    session.sendLine(colors.objectName(this.name));
    session.sendLine(this.description);

    if (this.signTitle) {
      session.sendLine('');
      session.sendLine(colors.highlight(`Title: "${this.signTitle}"`));
    }

    session.sendLine('');
    session.sendLine(colors.dim('Use the READ command to see the full content.'));
    session.sendLine('');
  }
};
