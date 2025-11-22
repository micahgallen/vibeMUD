/**
 * colorize.js
 *
 * Admin command to manage global keyword colorization
 * Allows adding, removing, and listing keywords that will be automatically colored throughout the MUD
 */

const colorization = require('../systems/colorization');
const colors = require('../core/colors');
const fs = require('fs');
const path = require('path');

// File to persist custom keywords
const KEYWORDS_FILE = path.join(__dirname, '../data/custom_keywords.json');

/**
 * Load custom keywords from file
 */
function loadCustomKeywords() {
  try {
    if (fs.existsSync(KEYWORDS_FILE)) {
      const data = fs.readFileSync(KEYWORDS_FILE, 'utf8');
      const keywords = JSON.parse(data);

      // Apply them to the colorization system
      for (const [word, color] of Object.entries(keywords)) {
        colorization.addGlobalKeyword(word, color);
      }

      return keywords;
    }
  } catch (error) {
    console.error('Error loading custom keywords:', error);
  }
  return {};
}

/**
 * Save custom keywords to file
 */
function saveCustomKeywords(keywords) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(KEYWORDS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(keywords, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving custom keywords:', error);
    return false;
  }
}

// Load keywords on module load
const customKeywords = loadCustomKeywords();

const Command = {
  id: 'colorize',
  name: 'colorize',
  aliases: ['setcolor', 'keyword'],
  category: 'Admin',
  description: 'Manage global keyword colorization (admin only)',
  usage: 'colorize <add|remove|list> [word] [color]',
  requiresLogin: true,
  adminOnly: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Check if player is admin
    if (!player.isAdmin) {
      session.sendLine(colors.error('This command is only available to administrators.'));
      return;
    }

    if (!args) {
      session.sendLine('');
      session.sendLine(colors.highlight('Keyword Colorization Management'));
      session.sendLine(colors.dim('='.repeat(50)));
      session.sendLine('');
      session.sendLine('Usage:');
      session.sendLine('  colorize add <word> <color|template>  - Add a keyword or template');
      session.sendLine('  colorize remove <word>                - Remove a keyword/template');
      session.sendLine('  colorize list                         - List all keywords');
      session.sendLine('  colorize templates                    - List all word templates');
      session.sendLine('  colorize test <text>                  - Test colorization');
      session.sendLine('');
      session.sendLine('Examples:');
      session.sendLine('  colorize add magic bright_magenta     - Single color');
      session.sendLine('  colorize add fire <red>f<yellow>i<red>r<yellow>e</>  - Per-letter template');
      session.sendLine('');
      session.sendLine('Available colors:');
      session.sendLine('  ' + colors.red('red') + ', ' + colors.green('green') + ', ' + colors.yellow('yellow') + ', ' + colors.cyan('cyan'));
      session.sendLine('  ' + colors.magenta('magenta') + ', ' + colors.dim('dim') + ', ' + colors.grey('grey'));
      session.sendLine('  bright_red, bright_green, bright_yellow, bright_cyan');
      session.sendLine('  bright_magenta, bright_blue, bright_white');
      session.sendLine('');
      return;
    }

    const parts = args.split(' ');
    const action = parts[0].toLowerCase();

    if (action === 'add') {
      if (parts.length < 3) {
        session.sendLine(colors.error('Usage: colorize add <word> <color|template>'));
        return;
      }

      const word = parts[1];
      const colorOrTemplate = parts.slice(2).join(' '); // Join to handle templates with spaces

      // Check if it's a template (contains < and >)
      const isTemplate = colorOrTemplate.includes('<') && colorOrTemplate.includes('>');

      if (isTemplate) {
        // Safety: Ensure template ends with </> to prevent color bleeding
        let template = colorOrTemplate;
        if (!template.endsWith('</>')) {
          template = template + '</>';
          session.sendLine(colors.warning(`Auto-added </> to prevent color bleeding`));
        }

        // Validate template by extracting plain text
        const plainText = colors.stripColors(colors.parseColorTags(template));

        // Check if plain text matches the word
        if (plainText.toLowerCase() !== word.toLowerCase()) {
          session.sendLine(colors.error(`Template plain text "${plainText}" doesn't match word "${word}"`));
          session.sendLine('Example: colorize add fire <red>f<yellow>i<red>r<yellow>e</>');
          return;
        }

        // Add as word template
        colorization.addWordTemplate(word, template);

        // Save templates
        try {
          colorization.saveWordTemplates();
          // Show preview with case variations
          const preview1 = colorization.processGlobalTemplates(word);
          const preview2 = colorization.processGlobalTemplates(word.charAt(0).toUpperCase() + word.slice(1));
          const preview3 = colorization.processGlobalTemplates(word.toUpperCase());

          session.sendLine(colors.success(`✓ Added word template: "${word}"`));
          session.sendLine('Preview: ' + colors.parseColorTags(preview1) + ' / ' +
                                       colors.parseColorTags(preview2) + ' / ' +
                                       colors.parseColorTags(preview3));
        } catch (error) {
          session.sendLine(colors.error('Failed to save word template: ' + error.message));
        }
      } else {
        // Handle as single-color keyword (existing logic)
        const colorName = colorOrTemplate;

        // Validate color name
        const validColors = [
          'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'black',
          'bright_red', 'bright_green', 'bright_yellow', 'bright_blue',
          'bright_magenta', 'bright_cyan', 'bright_white', 'bright_black',
          'dim', 'grey', 'gray'
        ];

        if (!validColors.includes(colorName)) {
          session.sendLine(colors.error(`Invalid color: ${colorName}`));
          session.sendLine('Valid colors: ' + validColors.join(', '));
          return;
        }

        // Add to colorization system
        colorization.addGlobalKeyword(word, colorName);

        // Save to custom keywords
        customKeywords[word] = colorName;
        if (saveCustomKeywords(customKeywords)) {
          // Show preview
          const preview = colorization.processText(`The word ${word} is now colorized!`, 'global');
          session.sendLine(colors.success(`✓ Added keyword: "${word}" → ${colorName}`));
          session.sendLine('Preview: ' + preview);
        } else {
          session.sendLine(colors.error('Failed to save keywords to file.'));
        }
      }
    }
    else if (action === 'remove') {
      if (parts.length < 2) {
        session.sendLine(colors.error('Usage: colorize remove <word>'));
        return;
      }

      const word = parts[1];
      let removed = false;

      // Try removing from word templates first
      if (colorization.removeWordTemplate(word)) {
        try {
          colorization.saveWordTemplates();
          session.sendLine(colors.success(`✓ Removed word template: "${word}"`));
          removed = true;
        } catch (error) {
          session.sendLine(colors.error('Failed to save word templates: ' + error.message));
          return;
        }
      }

      // Try removing from keywords
      if (customKeywords[word]) {
        delete customKeywords[word];

        // Note: We can't easily remove from GLOBAL_KEYWORDS at runtime,
        // but we can remove from our custom list. A server restart will
        // reload only the custom keywords.
        if (saveCustomKeywords(customKeywords)) {
          session.sendLine(colors.success(`✓ Removed keyword: "${word}"`));
          session.sendLine(colors.warning('Note: Restart server for full effect on keywords.'));
          removed = true;
        } else {
          session.sendLine(colors.error('Failed to save keywords to file.'));
        }
      }

      if (!removed) {
        session.sendLine(colors.error(`Word "${word}" not found in templates or keywords.`));
      }
    }
    else if (action === 'list') {
      session.sendLine('');
      session.sendLine(colors.highlight('Global Keywords'));
      session.sendLine(colors.dim('='.repeat(50)));
      session.sendLine('');

      // Show built-in keywords
      session.sendLine(colors.cyan('Built-in Keywords:'));
      const builtIn = colorization.GLOBAL_KEYWORDS;
      let count = 0;
      for (const [word, colorName] of Object.entries(builtIn)) {
        const preview = colorization.processText(word, 'global');
        session.sendLine(`  ${preview} (${colorName})`);
        count++;
      }
      session.sendLine(colors.dim(`  ${count} built-in keywords`));
      session.sendLine('');

      // Show custom keywords
      session.sendLine(colors.cyan('Custom Keywords:'));
      const customCount = Object.keys(customKeywords).length;
      if (customCount > 0) {
        for (const [word, colorName] of Object.entries(customKeywords)) {
          const preview = colorization.processText(word, 'global');
          session.sendLine(`  ${preview} (${colorName})`);
        }
        session.sendLine(colors.dim(`  ${customCount} custom keywords`));
      } else {
        session.sendLine(colors.dim('  No custom keywords defined'));
      }
      session.sendLine('');
    }
    else if (action === 'templates') {
      session.sendLine('');
      session.sendLine(colors.highlight('Word Templates'));
      session.sendLine(colors.dim('='.repeat(50)));
      session.sendLine('');

      const templates = colorization.getAllWordTemplates();
      const count = Object.keys(templates).length;

      if (count > 0) {
        for (const [word, template] of Object.entries(templates)) {
          // Show three case variations
          const lower = colorization.processGlobalTemplates(word);
          const cap = colorization.processGlobalTemplates(word.charAt(0).toUpperCase() + word.slice(1));
          const upper = colorization.processGlobalTemplates(word.toUpperCase());

          session.sendLine(`  ${word}:`);
          session.sendLine(`    ${colors.parseColorTags(lower)} / ${colors.parseColorTags(cap)} / ${colors.parseColorTags(upper)}`);
          session.sendLine(colors.dim(`    Template: ${template}`));
          session.sendLine('');
        }
        session.sendLine(colors.dim(`  ${count} word templates`));
      } else {
        session.sendLine(colors.dim('  No word templates defined'));
        session.sendLine('');
        session.sendLine('Create templates with:');
        session.sendLine('  colorize add fire <red>f<yellow>i<red>r<yellow>e</>');
      }
      session.sendLine('');
    }
    else if (action === 'test') {
      if (parts.length < 2) {
        session.sendLine(colors.error('Usage: colorize test <text>'));
        return;
      }

      const testText = parts.slice(1).join(' ');
      session.sendLine('');
      session.sendLine('Original: ' + testText);

      // Apply both templates and keywords
      const withTemplates = colorization.processGlobalTemplates(testText);
      const withBoth = colorization.processText(withTemplates, 'global');

      session.sendLine('With templates: ' + colors.parseColorTags(withTemplates));
      session.sendLine('With both: ' + withBoth);
      session.sendLine('');
    }
    else {
      session.sendLine(colors.error(`Unknown action: ${action}`));
      session.sendLine('Valid actions: add, remove, list, templates, test');
    }
  }
};

module.exports = Command;
