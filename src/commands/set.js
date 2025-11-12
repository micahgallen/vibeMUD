/**
 * set.js
 *
 * Allows players to set various personal preferences and properties.
 */

const Command = {
  id: 'set',
  name: 'set',
  aliases: [],
  category: 'Player',
  description: 'Sets various player preferences and properties.',
  usage: 'set <property> <value>',
  requiresLogin: true,
  
  execute: function(session, args, entityManager, colors) {
    if (!session.player) {
      session.sendLine('You are not logged in.');
      return;
    }

    const parts = args.split(' ');
    const property = parts[0] ? parts[0].toLowerCase() : '';
    const rawValue = parts.slice(1).join(' ').trim();

    switch (property) {
      case 'capname':
        if (!rawValue) {
          session.sendLine(colors.highlight('Usage: set capname <new_capname>'));
          return;
        }

        const convertedCapname = colors.parseColorTags(rawValue);
        const visibleCapnameLength = colors.visibleLength(convertedCapname);

        // Basic validation for capname
        if (visibleCapnameLength < 3 || visibleCapnameLength > 30) { // Adjusted visible length limit
          session.sendLine(colors.error('Capname must be between 3 and 30 visible characters long (color tags like <red> are ignored for length).'));
          return;
        }
        // Further validation (e.g., disallowed characters, profanity) can be added here

        session.player.capname = convertedCapname;
        entityManager.markDirty(session.player.id);
        session.sendLine(colors.success(`Your capname has been set to: ${convertedCapname}`));
        break;

      default:
        session.sendLine(colors.warning('Unknown property to set. Currently supported: capname.'));
        session.sendLine(colors.highlight('Usage: set <property> <value>'));
        break;
    }
  }
};

module.exports = Command;
