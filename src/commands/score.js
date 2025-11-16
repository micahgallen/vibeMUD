/**
 * Score command - Display player stats, level, and XP
 */

const leveling = require('../systems/leveling');

module.exports = {
  id: 'score',
  name: 'score',
  aliases: ['stats', 'level'],
  category: 'info',
  description: 'View your character statistics',
  usage: 'score',
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    if (!player) {
      session.send('You must be logged in to view your score.\n');
      return;
    }

    // Deprecation notice - redirect to status command
    session.sendLine('');
    session.sendLine(colors.warning('⚠️  The "score" command is deprecated.'));
    session.sendLine(colors.dim('Use "status" instead for a comprehensive character overview.'));
    session.sendLine('');

    // Execute status command instead
    const statusCommand = require('./status.js');
    statusCommand.execute(session, args, entityManager, colors);
    return;

    // Get XP progress
    const xpInfo = leveling.getXPProgress(player);

    // Calculate stat modifiers (D&D 5E style)
    const calcMod = (stat) => {
      const value = stat || 10;
      const mod = Math.floor((value - 10) / 2);
      return mod >= 0 ? `+${mod}` : `${mod}`;
    };

    // Build XP bar (visual representation)
    const barWidth = 30;
    const filledBars = Math.floor((xpInfo.percentToNext / 100) * barWidth);
    const emptyBars = barWidth - filledBars;
    const xpBar = `[${'='.repeat(filledBars)}${' '.repeat(emptyBars)}]`;

    // Build stat display
    const stats = [
      `${colors.cyan('Strength:')}     ${player.strength || 10} (${calcMod(player.strength)})`,
      `${colors.cyan('Dexterity:')}    ${player.dexterity || 10} (${calcMod(player.dexterity)})`,
      `${colors.cyan('Constitution:')} ${player.constitution || 10} (${calcMod(player.constitution)})`,
      `${colors.cyan('Intelligence:')} ${player.intelligence || 10} (${calcMod(player.intelligence)})`,
      `${colors.cyan('Wisdom:')}       ${player.wisdom || 10} (${calcMod(player.wisdom)})`,
      `${colors.cyan('Charisma:')}     ${player.charisma || 10} (${calcMod(player.charisma)})`
    ];

    // Calculate AC (simplified - could use equipment system later)
    const dexMod = Math.floor(((player.dexterity || 10) - 10) / 2);
    const baseAC = 10 + dexMod;

    // Build output
    const output = [
      '',
      colors.levelUp('='.repeat(60)),
      colors.levelUp(player.name),
      colors.levelUp('='.repeat(60)),
      '',
      `${colors.success('Level:')} ${xpInfo.currentLevel}${xpInfo.atMaxLevel ? ' (MAX)' : ''}`,
      '',
      xpInfo.atMaxLevel
        ? `${colors.xpGain('Experience:')} ${xpInfo.currentXP.toLocaleString()} XP ${colors.warning('(Maximum Level Reached!')}`
        : `${colors.xpGain('Experience:')} ${xpInfo.currentXP.toLocaleString()} / ${xpInfo.xpForNextLevel.toLocaleString()} XP`,
      '',
      xpInfo.atMaxLevel
        ? ''
        : `${xpBar} ${colors.warning(xpInfo.percentToNext + '%')}`,
      xpInfo.atMaxLevel ? '' : colors.dim(`${xpInfo.xpIntoLevel.toLocaleString()} / ${xpInfo.xpNeededForLevel.toLocaleString()} to next level`),
      '',
      `${colors.hit('HP:')} ${player.hp} / ${player.maxHp}`,
      `${colors.info('AC:')} ${baseAC}`,
      '',
      colors.warning('Abilities:'),
      ...stats,
      '',
      colors.levelUp('='.repeat(60)),
      ''
    ].filter(line => line !== ''); // Remove empty strings

    session.send(output.join('\n'));
  }
};
