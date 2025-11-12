/**
 * Banner - ASCII art and welcome screen for The Wumpy and Grift
 * Powered by VibeMUD Engine
 */

const colors = require('./colors');

/**
 * Hilarious rotating taglines - LooneyMUD style!
 * Pratchett wit meets 90s nostalgia meets pure absurdity
 */
const TAGLINES = [
  'A satirical MUD of 90s nostalgia',
  'Now with 47% more ASCII!',
  'Your move creep. But like, textually.',
  'Because graphics are overrated anyway',
  'Powered by your imagination (and Node.js)',
  'Where lag is a feature, not a bug',
  'No blockchain, no NFTs, just good old fashioned text',
  'MUDding like it\'s 1994',
  'Free-range, artisanal text adventures',
  'Now less fatal than previously!',
  'Where RTFM is considered a friendly greeting',
  'Your sword is very impressive. No, really.',
  'Killing time since [TIMESTAMP ERROR]',
  'Technically a game. Legally a game. Possibly a game.',
  'More addictive than dial-up modem sounds',
  'Where \'looking\' is a valid combat strategy',
  'ASCII: It\'s not a bug, it\'s art',
  'Carpal tunnel sold separately',
  'Warning: May contain traces of fun',
  'Like Zork, but with more sarcasm',
  'Your princess is in another MUD',
  'You have died of dysentery. Wait, wrong game.',
  'Optimistically multiplayer',
  'Where "go north" is still a radical concept',
  'WYSIWYG (What You See Is What You Grep)',
  'Suspiciously stable for alpha software',
  'Digital archaeology with extra stabbing',
  'The only winning move is to play',
  'Achievement Unlocked: Read the banner',
  'I\'m putting that on main',
  '- a hacked together piece of shit!'
];

/**
 * Generate the colorful ASCII art banner for the welcome screen
 * Rainbow "wumpy" - each letter gets a different color!
 */
function getBanner() {
  const lines = [];

  // Top border
  lines.push(colors.line(78, '=', colors.MUD_COLORS.BRIGHT_CYAN));
  lines.push('');

  // ASCII Art Title - Rainbow WUMPY!
  lines.push(
    colors.colorize('  _____ _            ', colors.MUD_COLORS.BRIGHT_MAGENTA) +
    colors.colorize('__        __', colors.ANSI.BRIGHT_RED) +
    colors.colorize('                             ', colors.MUD_COLORS.BRIGHT_MAGENTA)
  );

  lines.push(
    colors.colorize(' |_   _| |__   ___  ', colors.MUD_COLORS.BRIGHT_MAGENTA) +
    colors.colorize('\\ \\      ', colors.ANSI.BRIGHT_RED) +
    colors.colorize('/ /   _ _ __ ___  _ __  _   _  ', colors.MUD_COLORS.BRIGHT_MAGENTA)
  );

  lines.push(
    colors.colorize('   | | | \'_ \\ / _ \\  ', colors.MUD_COLORS.BRIGHT_MAGENTA) +
    colors.colorize('\\ \\ ', colors.ANSI.BRIGHT_RED) +
    colors.colorize('/\\ ', colors.ANSI.BRIGHT_YELLOW) +
    colors.colorize('/ / ', colors.ANSI.BRIGHT_GREEN) +
    colors.colorize('| | ', colors.ANSI.BRIGHT_BLUE) +
    colors.colorize('| \'_ ` _ \\', colors.ANSI.BRIGHT_MAGENTA) +
    colors.colorize('| \'_ \\| | | | ', colors.MUD_COLORS.BRIGHT_MAGENTA)
  );

  lines.push(
    colors.colorize('   | | | | | |  __/   ', colors.MUD_COLORS.BRIGHT_MAGENTA) +
    colors.colorize('\\ V  ', colors.ANSI.BRIGHT_RED) +
    colors.colorize('V /', colors.ANSI.BRIGHT_YELLOW) +
    colors.colorize('| |_', colors.ANSI.BRIGHT_GREEN) +
    colors.colorize('| ', colors.ANSI.BRIGHT_BLUE) +
    colors.colorize('| | | | | | |_) ', colors.ANSI.BRIGHT_MAGENTA) +
    colors.colorize('| |_| | ', colors.MUD_COLORS.BRIGHT_MAGENTA)
  );

  lines.push(
    colors.colorize('   |_| |_| |_|\\___|    ', colors.MUD_COLORS.BRIGHT_MAGENTA) +
    colors.colorize('\\_/', colors.ANSI.BRIGHT_RED) +
    colors.colorize('\\_/  ', colors.ANSI.BRIGHT_YELLOW) +
    colors.colorize('\\__,_', colors.ANSI.BRIGHT_GREEN) +
    colors.colorize('|_| |_| |_', colors.ANSI.BRIGHT_BLUE) +
    colors.colorize('| .__/ ', colors.ANSI.BRIGHT_MAGENTA) +
    colors.colorize('\\__, | ', colors.MUD_COLORS.BRIGHT_MAGENTA)
  );

  lines.push(
    colors.colorize('                                               ', colors.MUD_COLORS.BRIGHT_MAGENTA) +
    colors.colorize('|_|    ', colors.ANSI.BRIGHT_BLUE) +
    colors.colorize('|___/  ', colors.ANSI.BRIGHT_MAGENTA)
  );

  lines.push('');
  lines.push(colors.colorize('                      &   Grift                                ', colors.MUD_COLORS.BRIGHT_YELLOW));
  lines.push('');

  // Tagline - randomly selected!
  const randomTagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
  const centeredTagline = colors.pad(randomTagline, 78, 'center');
  lines.push(colors.colorize(centeredTagline, colors.MUD_COLORS.BRIGHT_CYAN));
  lines.push('');

  // Powered by VibeMUD Engine
  lines.push(colors.hint('                 Powered by VibeMUD Engine'));
  lines.push(colors.hint('                    Version 0.1.0 - Alpha'));
  lines.push('');

  // Bottom border
  lines.push(colors.line(78, '=', colors.MUD_COLORS.BRIGHT_CYAN));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a simple one-line welcome message (for reconnections, etc)
 */
function getShortWelcome() {
  return colors.highlight('Welcome to The Wumpy and Grift!') + ' ' +
         colors.hint('(Type "help" for commands)');
}

module.exports = {
  getBanner,
  getShortWelcome
};
