/**
 * resetstats command
 * Admin command to reset a player's stats to baseline
 */

module.exports = {
  id: "resetstats",
  name: "resetstats",
  aliases: ["baseline"],
  category: "admin",
  description: "Reset player stats to baseline values",
  usage: "resetstats [player_name]",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Determine target player
    let targetPlayer = player;
    let targetName = args ? args.trim() : '';

    if (targetName) {
      // Admin trying to reset another player's stats
      // Find player by name
      const allPlayers = Array.from(entityManager.objects.values()).filter(obj => obj.type === 'player');
      targetPlayer = allPlayers.find(p => p.name.toLowerCase() === targetName.toLowerCase());

      if (!targetPlayer) {
        session.sendLine(colors.error(`Player '${targetName}' not found.`));
        return;
      }

      session.sendLine(colors.info(`Resetting stats for ${targetPlayer.name}...`));
    } else {
      session.sendLine(colors.info('Resetting your stats to baseline...'));
    }

    // Clear drunk state if present
    if (targetPlayer.drunkState) {
      const state = targetPlayer.drunkState;

      // Remove drunk buffs/nerfs
      if (targetPlayer.strength !== undefined) {
        targetPlayer.strength -= state.buffedStr;
      }
      if (targetPlayer.endurance !== undefined) {
        targetPlayer.endurance -= state.buffedEnd;
      }
      if (targetPlayer.intelligence !== undefined) {
        targetPlayer.intelligence += state.nerfedInt;
      }
      if (targetPlayer.wisdom !== undefined) {
        targetPlayer.wisdom += state.nerfedWis;
      }

      delete targetPlayer.drunkState;
      delete targetPlayer.drunkHeartbeat;

      session.sendLine(colors.warning('  • Cleared drunk state'));
    }

    // Reset ability scores to baseline (10)
    const baselineStat = 10;
    targetPlayer.strength = baselineStat;
    targetPlayer.dexterity = baselineStat;
    targetPlayer.constitution = baselineStat;
    targetPlayer.endurance = baselineStat;
    targetPlayer.intelligence = baselineStat;
    targetPlayer.wisdom = baselineStat;
    targetPlayer.charisma = baselineStat;

    session.sendLine(colors.success('  • Reset all ability scores to 10'));

    // Restore HP to maximum
    if (targetPlayer.maxHp) {
      targetPlayer.hp = targetPlayer.maxHp;
      session.sendLine(colors.success('  • Restored HP to maximum'));
    }

    // Mark dirty for saving
    entityManager.markDirty(targetPlayer.id);

    session.sendLine(colors.success('✓ Stats reset to baseline!'));

    // Notify target player if it's someone else
    if (targetPlayer.id !== player.id) {
      entityManager.notifyPlayer(
        targetPlayer.id,
        colors.warning('Your stats have been reset to baseline by an administrator.')
      );
    }
  }
};
