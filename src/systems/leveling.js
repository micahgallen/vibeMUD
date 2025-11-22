/**
 * Leveling System
 * Manages experience points, level-ups, and character progression
 */

const MAX_LEVEL = 20;

/**
 * Calculate XP required to reach a specific level
 * Formula: 100 * level^2 (cumulative)
 * @param {number} level - Target level
 * @returns {number} - Total XP needed to reach that level
 */
function getXPForLevel(level) {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) return getXPForLevel(MAX_LEVEL);

  return 100 * (level * level);
}

/**
 * Calculate XP needed for next level
 * @param {number} currentLevel - Current character level
 * @returns {number} - XP needed to reach next level
 */
function getXPToNextLevel(currentLevel) {
  if (currentLevel >= MAX_LEVEL) return 0;
  return getXPForLevel(currentLevel + 1);
}

/**
 * Calculate XP reward for killing an NPC
 * Formula: NPC level * 50
 * @param {object} npc - The defeated NPC
 * @returns {number} - XP reward
 */
function calculateXPReward(npc) {
  const npcLevel = npc.level || 1;
  return npcLevel * 50;
}

/**
 * Award XP to a player and handle level-ups
 * @param {string} playerId - ID of the player
 * @param {number} amount - XP amount to award
 * @param {object} entityManager - The entity manager
 * @returns {boolean} - Whether the player leveled up
 */
function awardXP(playerId, amount, entityManager) {
  const player = entityManager.get(playerId);

  if (!player || player.type !== 'player') {
    return false;
  }

  // Initialize XP if not present
  if (typeof player.xp !== 'number') {
    player.xp = 0;
  }

  // Add XP
  const oldXP = player.xp;
  player.xp += amount;

  // Notify player
  entityManager.notifyPlayer(playerId,
    `\x1b[36mYou gain ${amount} experience points.\x1b[0m`);

  // Check for level-up
  let leveledUp = false;
  const currentLevel = player.level || 1;
  const nextLevelXP = getXPToNextLevel(currentLevel);

  if (player.xp >= nextLevelXP && currentLevel < MAX_LEVEL) {
    levelUp(playerId, entityManager);
    leveledUp = true;
  }

  entityManager.markDirty(playerId);

  console.log(`  ⭐ ${player.name} gained ${amount} XP (${oldXP} → ${player.xp})`);

  return leveledUp;
}

/**
 * Level up a player
 * @param {string} playerId - ID of the player
 * @param {object} entityManager - The entity manager
 */
function levelUp(playerId, entityManager) {
  const player = entityManager.get(playerId);

  if (!player || player.type !== 'player') {
    return;
  }

  const oldLevel = player.level || 1;
  const newLevel = oldLevel + 1;

  if (newLevel > MAX_LEVEL) {
    return; // Already at max level
  }

  // Increase level
  player.level = newLevel;

  // Increase max HP
  const hpIncrease = 10;
  player.maxHp += hpIncrease;
  player.hp += hpIncrease; // Also restore the new HP

  // Initialize stats if not present (backwards compatibility)
  if (!player.strength) player.strength = 10;
  if (!player.dexterity) player.dexterity = 10;
  if (!player.constitution) player.constitution = 10;
  if (!player.intelligence) player.intelligence = 10;
  if (!player.wisdom) player.wisdom = 10;
  if (!player.charisma) player.charisma = 10;

  // Grant stat increases every 4 levels (levels 4, 8, 12, 16, 20)
  const statBonuses = [];
  if (newLevel % 4 === 0) {
    // Player gets +2 to distribute (simplified - automatic distribution)
    // For now, alternate between primary combat stats
    if (newLevel % 8 === 0) {
      player.strength += 1;
      player.constitution += 1;
      statBonuses.push('Strength +1', 'Constitution +1');
    } else {
      player.dexterity += 1;
      player.wisdom += 1;
      statBonuses.push('Dexterity +1', 'Wisdom +1');
    }
  }

  entityManager.markDirty(playerId);

  // Celebratory notification
  const statText = statBonuses.length > 0
    ? `\n  ${statBonuses.join(', ')}`
    : '';

  entityManager.notifyPlayer(playerId,
    `\x1b[33m\n${'='.repeat(60)}\n` +
    `🎉 LEVEL UP! You are now level ${newLevel}! 🎉\n` +
    `  Max HP increased by ${hpIncrease} (now ${player.maxHp})${statText}\n` +
    `${'='.repeat(60)}\x1b[0m\n`);

  // Notify room
  if (player.currentRoom) {
    entityManager.notifyRoom(player.currentRoom,
      `\x1b[33m${(player.capname || player.name)} shimmers with newfound power!\x1b[0m`,
      playerId);
  }

  console.log(`  🎉 ${player.name} leveled up! ${oldLevel} → ${newLevel}`);
}

/**
 * Get XP progress information for a player
 * @param {object} player - The player object
 * @returns {object} - XP progress info
 */
function getXPProgress(player) {
  const currentLevel = player.level || 1;
  const currentXP = player.xp || 0;
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpForNextLevel = getXPToNextLevel(currentLevel);

  const xpIntoLevel = currentXP - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const percentToNext = currentLevel >= MAX_LEVEL
    ? 100
    : Math.floor((xpIntoLevel / xpNeededForLevel) * 100);

  return {
    currentLevel,
    currentXP,
    xpForNextLevel: currentLevel >= MAX_LEVEL ? currentXP : xpForNextLevel,
    xpIntoLevel,
    xpNeededForLevel,
    percentToNext,
    atMaxLevel: currentLevel >= MAX_LEVEL
  };
}

/**
 * Initialize a new player with starting XP and stats
 * @param {object} player - The player object
 */
function initializePlayer(player) {
  // XP
  if (typeof player.xp !== 'number') {
    player.xp = 0;
  }

  // Level
  if (typeof player.level !== 'number') {
    player.level = 1;
  }

  // Stats (D&D 5E standard array approximation)
  if (typeof player.strength !== 'number') player.strength = 10;
  if (typeof player.dexterity !== 'number') player.dexterity = 10;
  if (typeof player.constitution !== 'number') player.constitution = 10;
  if (typeof player.intelligence !== 'number') player.intelligence = 10;
  if (typeof player.wisdom !== 'number') player.wisdom = 10;
  if (typeof player.charisma !== 'number') player.charisma = 10;

  // HP (if not already set)
  if (typeof player.maxHp !== 'number') {
    player.maxHp = 100;
    player.hp = 100;
  }
}

module.exports = {
  MAX_LEVEL,
  getXPForLevel,
  getXPToNextLevel,
  calculateXPReward,
  awardXP,
  levelUp,
  getXPProgress,
  initializePlayer
};
