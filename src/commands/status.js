/**
 * status command
 * Display player health, stats, and conditions
 */

const leveling = require('../systems/leveling');

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
    output.push(colors.highlight(`  ${(player.capname || player.name)}'s Status`));
    output.push(colors.highlight('='.repeat(60)));
    output.push('');

    // Health
    const hpPercent = Math.round((player.hp / player.maxHp) * 100);
    const hpColor = colors.magenta; // Magenta for health bar

    const hpBar = this.createBar(player.hp, player.maxHp, 30, '█', '░');
    const hpText = hpColor(`${player.hp}/${player.maxHp}`);
    const paddedHpText = colors.pad(hpText, 10, 'left'); // Pad to 10 characters
    output.push('❤️  ' + colors.dim('Health: ') + paddedHpText + ` ${hpColor(hpBar)} ${hpPercent}%`);

    // Mana (if player has mana pool)
    if (player.maxMp && player.maxMp > 0) {
      const mpPercent = Math.round((player.mp / player.maxMp) * 100);
      const mpBar = this.createBar(player.mp, player.maxMp, 30, '█', '░');
      const mpColor = colors.info; // Blue for mana
      const mpText = mpColor(`${player.mp}/${player.maxMp}`);
      const paddedMpText = colors.pad(mpText, 10, 'left'); // Pad to 10 characters
      output.push('✨ ' + colors.dim('Mana:   ') + paddedMpText + ` ${mpColor(mpBar)} ${mpPercent}%`);
    }

    output.push('');

    // Ability Scores (D&D 5E)
    output.push(colors.highlight('Ability Scores:'));
    output.push(colors.line(60, '-'));
    const drunkState = player.drunkState;
    output.push(colors.info('  Strength:     ') + this.formatStat(player.strength || 10, colors, drunkState?.buffedStr || 0));
    output.push(colors.info('  Dexterity:    ') + this.formatStat(player.dexterity || 10, colors));
    output.push(colors.info('  Constitution: ') + this.formatStat(player.constitution || 10, colors, drunkState?.buffedEnd || 0));
    output.push(colors.info('  Intelligence: ') + this.formatStat(player.intelligence || 10, colors, drunkState?.nerfedInt ? -drunkState.nerfedInt : 0));
    output.push(colors.info('  Wisdom:       ') + this.formatStat(player.wisdom || 10, colors, drunkState?.nerfedWis ? -drunkState.nerfedWis : 0));
    output.push(colors.info('  Charisma:     ') + this.formatStat(player.charisma || 10, colors));
    output.push('');

    // Combat Statistics
    output.push(colors.highlight('Combat Statistics:'));
    output.push(colors.line(60, '-'));

    // Calculate AC from equipment and buffs
    let totalAC = this.calculateTotalAC(player, entityManager);
    if (player.buffedAC) {
      totalAC += player.buffedAC;
    }

    const acDisplay = player.buffedAC
      ? colors.colorize(totalAC, colors.MUD_COLORS.INFO) + colors.success(` (+${player.buffedAC} buff)`)
      : colors.colorize(totalAC, colors.MUD_COLORS.INFO);

    output.push(colors.info('  Armor Class:  ') + acDisplay);
    output.push(colors.info('  Level:        ') + colors.colorize(player.level || 1, colors.MUD_COLORS.WARNING));
    output.push('');

    // Experience & Leveling
    const xpInfo = leveling.getXPProgress(player);
    output.push(colors.highlight('Experience & Level Progress:'));
    output.push(colors.line(60, '-'));

    if (xpInfo.atMaxLevel) {
      output.push(colors.info('  XP:           ') + colors.xpGain(`${xpInfo.currentXP.toLocaleString()} XP `) + colors.warning('(MAX LEVEL)'));
    } else {
      const xpBar = this.createBar(xpInfo.xpIntoLevel, xpInfo.xpNeededForLevel, 30, '=', ' ');
      output.push(colors.info('  XP:           ') + colors.xpGain(`${xpInfo.currentXP.toLocaleString()}`) + colors.dim(` / ${xpInfo.xpForNextLevel.toLocaleString()}`));
      output.push(colors.info('  Progress:     ') + colors.dim(xpBar) + ` ${xpInfo.percentToNext}%`);
      output.push(colors.dim(`                ${xpInfo.xpIntoLevel.toLocaleString()} / ${xpInfo.xpNeededForLevel.toLocaleString()} to level ${xpInfo.currentLevel + 1}`));
    }
    output.push('');

    // Conditions
    const conditions = [];

    if (player.isGhost) {
      conditions.push(colors.dim('👻 Ghost'));
    }

    if (player.combat) {
      const target = entityManager.get(player.combat.targetId);
      const targetName = target ? (target.type === 'player' ? (target.capname || target.name) : target.name) : 'Unknown';
      conditions.push(colors.error('⚔️  In Combat') + colors.dim(` (fighting ${targetName})`));
    }

    if (player.drunkState) {
      const level = player.drunkState.level;
      const drunkLevel = level >= 3 ? 'Very Drunk' : level >= 2 ? 'Drunk' : 'Tipsy';
      conditions.push(colors.warning('🍺 ' + drunkLevel) + colors.dim(` (+STR/END, -INT/WIS)`));
    }

    // Active buffs
    if (player.activeBuffs && player.activeBuffs.length > 0) {
      for (const buff of player.activeBuffs) {
        const timeLeft = Math.ceil((buff.endTime - Date.now()) / 1000);
        // Only show buffs that haven't expired
        if (timeLeft > 0) {
          const statName = buff.stat.toUpperCase();
          conditions.push(colors.success(`✨ ${statName} Buff`) + colors.dim(` (+${buff.amount}, ${timeLeft}s)`));
        }
      }
    }

    // Active debuffs
    if (player.activeDebuffs && player.activeDebuffs.length > 0) {
      for (const debuff of player.activeDebuffs) {
        const timeLeft = Math.ceil((debuff.endTime - Date.now()) / 1000);
        // Only show debuffs that haven't expired
        if (timeLeft > 0) {
          const statName = debuff.stat.toUpperCase();
          conditions.push(colors.error(`💀 ${statName} Debuff`) + colors.dim(` (-${debuff.amount}, ${timeLeft}s)`));
        }
      }
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
  createBar: function(current, max, width, filledChar = '█', emptyChar = '░') {
    const percent = current / max;
    const filled = Math.round(percent * width);
    const empty = width - filled;

    return '[' + filledChar.repeat(filled) + emptyChar.repeat(empty) + ']';
  },

  /**
   * Format ability score with modifier
   * @param {number} score - Current ability score
   * @param {object} colors - Colors object
   * @param {number} tempMod - Temporary modifier from effects (optional)
   */
  formatStat: function(score, colors, tempMod = 0) {
    const modifier = Math.floor((score - 10) / 2);
    const modifierStr = modifier >= 0 ? `+${modifier}` : modifier.toString();

    let output = colors.colorize(score, colors.MUD_COLORS.SUCCESS) + colors.dim(` (${modifierStr})`);

    // Show temporary modification if present
    if (tempMod !== 0) {
      const tempStr = tempMod > 0 ? `+${tempMod}` : tempMod.toString();
      const tempColor = tempMod > 0 ? colors.success : colors.error;
      output += ' ' + tempColor(`[${tempStr} drunk]`);
    }

    return output;
  },

  /**
   * Calculate total AC from equipped armor
   */
  calculateTotalAC: function(player, entityManager) {
    if (!player.equipped) {
      const dexMod = Math.floor(((player.dexterity || 10) - 10) / 2);
      return 10 + dexMod; // Base AC with no armor
    }

    const playerDex = player.dexterity || 10;
    const dexMod = Math.floor((playerDex - 10) / 2);

    // Start with base AC (10 + dex modifier for unarmored)
    let totalAC = 10 + dexMod;

    // Check for body armor (chest slot)
    const chestArmorId = player.equipped.chest;
    if (chestArmorId) {
      const armor = entityManager.get(chestArmorId);
      if (armor && armor.itemType === 'armor' && !armor.broken) {
        totalAC = armor.getAC ? armor.getAC(playerDex) : armor.baseAC;
      }
    }

    // Add shield bonus if equipped
    const shieldId = player.equipped.shield;
    if (shieldId) {
      const shield = entityManager.get(shieldId);
      if (shield && shield.itemType === 'armor' && !shield.broken) {
        const shieldBonus = shield.getAC ? shield.getAC(playerDex) : 2;
        totalAC += shieldBonus;
      }
    }

    return totalAC;
  }
};
