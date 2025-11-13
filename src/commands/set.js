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

      case 'tpenter':
        if (!rawValue) {
          session.sendLine(colors.highlight('Usage: set tpenter <message>'));
          session.sendLine(colors.hint('Use {name} as a placeholder for your name.'));
          session.sendLine(colors.hint('Example: set tpenter {name} materializes from the void!'));
          return;
        }

        const convertedTpEnter = colors.parseColorTags(rawValue);
        const visibleTpEnterLength = colors.visibleLength(convertedTpEnter);

        if (visibleTpEnterLength > 200) {
          session.sendLine(colors.error('Teleport enter message must be 200 visible characters or less.'));
          return;
        }

        if (!convertedTpEnter.includes('{name}')) {
          session.sendLine(colors.error('Teleport enter message must include {name} placeholder.'));
          return;
        }

        session.player.tpEnterMessage = convertedTpEnter;
        entityManager.markDirty(session.player.id);

        const previewEnter = convertedTpEnter.replace('{name}', session.player.name);
        session.sendLine(colors.success('Your teleport enter message has been set to:'));
        session.sendLine(colors.info(previewEnter));
        break;

      case 'tpexit':
        if (!rawValue) {
          session.sendLine(colors.highlight('Usage: set tpexit <message>'));
          session.sendLine(colors.hint('Use {name} as a placeholder for your name.'));
          session.sendLine(colors.hint('Example: set tpexit {name} vanishes in a puff of smoke!'));
          return;
        }

        const convertedTpExit = colors.parseColorTags(rawValue);
        const visibleTpExitLength = colors.visibleLength(convertedTpExit);

        if (visibleTpExitLength > 200) {
          session.sendLine(colors.error('Teleport exit message must be 200 visible characters or less.'));
          return;
        }

        if (!convertedTpExit.includes('{name}')) {
          session.sendLine(colors.error('Teleport exit message must include {name} placeholder.'));
          return;
        }

        session.player.tpExitMessage = convertedTpExit;
        entityManager.markDirty(session.player.id);

        const previewExit = convertedTpExit.replace('{name}', session.player.name);
        session.sendLine(colors.success('Your teleport exit message has been set to:'));
        session.sendLine(colors.info(previewExit));
        break;

      default:
        session.sendLine(colors.warning('Unknown property to set. Currently supported: capname, tpenter, tpexit.'));
        session.sendLine(colors.highlight('Usage: set <property> <value>'));
        break;
    }
  }
};

module.exports = Command;
