/**
 * status command
 * Display player health, stats, and conditions
 */

module.exports = {
  id: "status",
  name: "status",
  aliases: ["st", "stats"],
  category: "player",
  description: "View your character's status and statistics",
  usage: "status",
  help: "Shows your current health, combat statistics, level, and any active conditions affecting your character.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    let output = [];

    // Header
    output.push('');
    output.push(colors.highlight('='.repeat(60)));
    output.push(colors.highlight(`  ${player.name}'s Status`));
    output.push(colors.highlight('='.repeat(60)));
    output.push('');

    // Health
    const hpPercent = Math.round((player.hp / player.maxHp) * 100);
    let hpColor = colors.success;
    if (hpPercent < 30) hpColor = colors.error;
    else if (hpPercent < 60) hpColor = colors.warning;

    const hpBar = this.createBar(player.hp, player.maxHp, 30);
    output.push(colors.info('Health: ') + hpColor(`${player.hp}/${player.maxHp}`) + ` ${hpBar} ${hpPercent}%`);
    output.push('');

    // Combat Statistics
    output.push(colors.highlight('Combat Statistics:'));
    output.push(colors.line(60, '-'));
    output.push(colors.info('  Strength:     ') + colors.colorize(player.strength || 10, colors.MUD_COLORS.SUCCESS));
    output.push(colors.info('  Dexterity:    ') + colors.colorize(player.dexterity || 10, colors.MUD_COLORS.SUCCESS));
    output.push(colors.info('  Constitution: ') + colors.colorize(player.constitution || 10, colors.MUD_COLORS.SUCCESS));
    output.push(colors.info('  Armor Class:  ') + colors.colorize(player.ac || 0, colors.MUD_COLORS.INFO));
    output.push(colors.info('  Level:        ') + colors.colorize(player.level || 1, colors.MUD_COLORS.WARNING));
    output.push('');

    // Conditions
    const conditions = [];

    if (player.isGhost) {
      conditions.push(colors.dim('👻 Ghost'));
    }

    if (player.combat) {
      const target = entityManager.get(player.combat.targetId);
      const targetName = target ? target.name : 'Unknown';
      conditions.push(colors.error('⚔️  In Combat') + colors.dim(` (fighting ${targetName})`));
    }

    if (conditions.length > 0) {
      output.push(colors.highlight('Active Conditions:'));
      output.push(colors.line(60, '-'));
      conditions.forEach(condition => {
        output.push('  ' + condition);
      });
      output.push('');
    }

    // Location
    output.push(colors.highlight('Location:'));
    output.push(colors.line(60, '-'));
    if (room) {
      output.push('  ' + colors.roomName(room.name));
    } else {
      output.push('  ' + colors.dim('Unknown'));
    }
    output.push('');

    // Footer
    output.push(colors.highlight('='.repeat(60)));
    output.push('');

    session.sendLine(output.join('\n'));
  },

  /**
   * Create a visual bar representation
   */
  createBar: function(current, max, width) {
    const percent = current / max;
    const filled = Math.round(percent * width);
    const empty = width - filled;

    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }
};
