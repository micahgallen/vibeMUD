/**
 * Magic System
 * Manages spellcasting, spell effects, and spell definitions
 *
 * Spell Types:
 * - damage: Deal damage to target
 * - heal: Restore HP to target
 * - buff: Temporarily increase stats (duration-based)
 * - debuff: Temporarily decrease stats (duration-based)
 * - summon: Spawn an NPC helper
 * - teleport: Move caster or target to different room
 */

const mana = require('./mana');
const resistances = require('./resistances');
const fs = require('fs');
const path = require('path');

// Loaded spell definitions (cached in memory)
const spellDefinitions = new Map();

/**
 * Load all spell definitions from disk
 * @param {string} spellDir - Directory containing spell JSON files
 */
function loadSpells(spellDir) {
  if (!fs.existsSync(spellDir)) {
    console.warn(`Spell directory not found: ${spellDir}`);
    return;
  }

  const files = fs.readdirSync(spellDir);
  let loadedCount = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const filePath = path.join(spellDir, file);
      const spellData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (!spellData.id || !spellData.name) {
        console.warn(`Invalid spell definition in ${file}: missing id or name`);
        continue;
      }

      spellDefinitions.set(spellData.id, spellData);
      loadedCount++;
    } catch (error) {
      console.error(`Failed to load spell ${file}:`, error.message);
    }
  }

  console.log(`  ✨ Loaded ${loadedCount} spell definitions from ${spellDir}`);
}

/**
 * Get a spell definition by ID
 * @param {string} spellId - The spell ID
 * @returns {object|null} - Spell definition or null
 */
function getSpell(spellId) {
  return spellDefinitions.get(spellId) || null;
}

/**
 * Find a spell by name (case-insensitive partial match)
 * @param {string} spellName - The spell name to search for
 * @returns {object|null} - Spell definition or null
 */
function findSpellByName(spellName) {
  const searchName = spellName.toLowerCase();

  // First try exact match
  for (const spell of spellDefinitions.values()) {
    if (spell.name.toLowerCase() === searchName) {
      return spell;
    }
  }

  // Then try partial match
  for (const spell of spellDefinitions.values()) {
    if (spell.name.toLowerCase().includes(searchName)) {
      return spell;
    }
  }

  return null;
}

/**
 * Check if an entity can cast a spell
 * @param {object} caster - The caster entity
 * @param {object} spell - The spell definition
 * @returns {object} - { canCast: boolean, reason: string }
 */
function canCast(caster, spell) {
  // Check if caster has mana pool
  if (!caster.maxMp) {
    return { canCast: false, reason: 'You have no magical ability!' };
  }

  // Check if caster has enough mana
  if (!mana.hasMana(caster, spell.manaCost)) {
    return {
      canCast: false,
      reason: `Not enough mana! (Need ${spell.manaCost} MP, have ${caster.mp} MP)`
    };
  }

  // Check level requirement if specified
  if (spell.minLevel && caster.level < spell.minLevel) {
    return {
      canCast: false,
      reason: `You must be level ${spell.minLevel} to cast this spell.`
    };
  }

  // Check if in combat (some spells may be combat-only or non-combat-only)
  if (spell.combatOnly && !caster.combat) {
    return { canCast: false, reason: 'This spell can only be cast in combat!' };
  }

  if (spell.nonCombatOnly && caster.combat) {
    return { canCast: false, reason: 'You cannot cast this spell while in combat!' };
  }

  return { canCast: true };
}

/**
 * Validate spell target
 * @param {object} caster - The caster entity
 * @param {object} target - The target entity (may be null for self-targeting)
 * @param {object} spell - The spell definition
 * @returns {object} - { valid: boolean, reason: string }
 */
function validateTarget(caster, target, spell) {
  const targetType = spell.targetType || 'other';

  if (targetType === 'self') {
    // Self-targeting spells should target the caster
    if (target && target.id !== caster.id) {
      return { valid: false, reason: 'This spell can only be cast on yourself.' };
    }
    return { valid: true };
  }

  if (targetType === 'other') {
    // Must have a target
    if (!target) {
      return { valid: false, reason: 'You must specify a target for this spell.' };
    }

    // Cannot target self
    if (target.id === caster.id) {
      return { valid: false, reason: 'You cannot cast this spell on yourself.' };
    }

    // Target must be in same room
    if (target.currentRoom !== caster.currentRoom) {
      return { valid: false, reason: 'Your target is not here.' };
    }

    return { valid: true };
  }

  if (targetType === 'any') {
    // Can target self or others, but must have a target
    if (!target) {
      return { valid: false, reason: 'You must specify a target for this spell.' };
    }

    // Target must be in same room (unless it's self)
    if (target.id !== caster.id && target.currentRoom !== caster.currentRoom) {
      return { valid: false, reason: 'Your target is not here.' };
    }

    return { valid: true };
  }

  if (targetType === 'room') {
    // Room-effect spells don't need a specific target
    return { valid: true };
  }

  return { valid: false, reason: 'Invalid target type.' };
}

/**
 * Cast a spell
 * @param {string} casterId - The caster's entity ID
 * @param {string} spellId - The spell ID
 * @param {string|null} targetId - The target's entity ID (null for self/room spells)
 * @param {object} entityManager - The entity manager
 * @returns {object} - Cast result with success status and messages
 */
function cast(casterId, spellId, targetId, entityManager) {
  const caster = entityManager.get(casterId);
  const spell = getSpell(spellId);

  if (!caster) {
    return { success: false, message: 'Invalid caster.' };
  }

  if (!spell) {
    return { success: false, message: 'Unknown spell.' };
  }

  // Check if caster can cast this spell
  const castCheck = canCast(caster, spell);
  if (!castCheck.canCast) {
    return { success: false, message: castCheck.reason };
  }

  // Get target (or caster for self-targeting spells)
  let target = targetId ? entityManager.get(targetId) : null;
  if (spell.targetType === 'self') {
    target = caster;
  }

  // Validate target
  const targetCheck = validateTarget(caster, target, spell);
  if (!targetCheck.valid) {
    return { success: false, message: targetCheck.reason };
  }

  // Consume mana
  if (!mana.consumeMana(casterId, spell.manaCost, entityManager)) {
    return { success: false, message: 'Failed to consume mana.' };
  }

  // Execute spell effects
  const effectResults = executeEffects(caster, target, spell, entityManager);

  // Send messages
  sendSpellMessages(caster, target, spell, effectResults, entityManager);

  console.log(`  ✨ ${caster.name} cast ${spell.name}${target ? ` on ${target.name}` : ''}`);

  return {
    success: true,
    spell: spell.name,
    effects: effectResults
  };
}

/**
 * Execute all effects of a spell
 * @param {object} caster - The caster entity
 * @param {object} target - The target entity (may be null)
 * @param {object} spell - The spell definition
 * @param {object} entityManager - The entity manager
 * @returns {Array} - Array of effect results
 */
function executeEffects(caster, target, spell, entityManager) {
  if (!spell.effects || spell.effects.length === 0) {
    return [];
  }

  const results = [];

  for (const effect of spell.effects) {
    const result = executeEffect(caster, target, effect, spell, entityManager);
    results.push(result);
  }

  return results;
}

/**
 * Execute a single spell effect
 * @param {object} caster - The caster entity
 * @param {object} target - The target entity
 * @param {object} effect - The effect definition
 * @param {object} spell - The spell definition (for scaling)
 * @param {object} entityManager - The entity manager
 * @returns {object} - Effect result
 */
function executeEffect(caster, target, effect, spell, entityManager) {
  const effectType = effect.type;

  switch (effectType) {
    case 'damage':
      return applyDamage(caster, target, effect, entityManager);

    case 'heal':
      return applyHeal(caster, target, effect, entityManager);

    case 'buff':
      return applyBuff(caster, target, effect, entityManager);

    case 'debuff':
      return applyDebuff(caster, target, effect, entityManager);

    case 'summon':
      return applySummon(caster, target, effect, entityManager);

    case 'teleport':
      return applyTeleport(caster, target, effect, entityManager);

    case 'dot':
      return applyDot(caster, target, effect, spell, entityManager);

    default:
      console.warn(`Unknown spell effect type: ${effectType}`);
      return { type: effectType, success: false, message: 'Unknown effect' };
  }
}

/**
 * Apply damage effect
 * @param {object} caster - The caster
 * @param {object} target - The target
 * @param {object} effect - The effect definition
 * @param {object} entityManager - The entity manager
 * @returns {object} - Effect result
 */
function applyDamage(caster, target, effect, entityManager) {
  if (!target) {
    return { type: 'damage', success: false, message: 'No target' };
  }

  // Calculate base damage (base + intelligence modifier + level scaling)
  const baseDamage = effect.amount || 10;
  const intMod = Math.floor(((caster.intelligence || 10) - 10) / 2);
  const levelBonus = (caster.level || 1) * (effect.levelScale || 0);
  let totalDamage = Math.max(1, baseDamage + intMod + levelBonus);

  // Get damage type
  const damageType = effect.damageType || 'magical';

  // Calculate aggregated resistances (base + armor)
  const targetResistances = resistances.calculateResistances(target, entityManager);

  // Apply resistance modifier
  let resistanceAmount = 0;
  if (targetResistances[damageType] !== undefined) {
    resistanceAmount = targetResistances[damageType]; // 0.0 to 1.0

    if (resistanceAmount >= 1.0) {
      // Immune - no damage
      if (target.currentRoom) {
        entityManager.notifyRoom(target.currentRoom,
          `\x1b[90m${target.name} is immune to ${damageType} damage!\x1b[0m`);
      }
      return {
        type: 'damage',
        success: true,
        amount: 0,
        resisted: true,
        damageType: damageType,
        targetDied: false
      };
    }

    // Apply partial resistance
    const originalDamage = totalDamage;
    totalDamage = Math.floor(totalDamage * (1 - resistanceAmount));

    if (resistanceAmount > 0 && target.currentRoom) {
      const resistPercent = Math.floor(resistanceAmount * 100);
      entityManager.notifyRoom(target.currentRoom,
        `\x1b[90m${target.name} resists ${resistPercent}% of the ${damageType} damage!\x1b[0m`);
    }
  }

  // Apply damage
  target.hp = Math.max(0, target.hp - totalDamage);
  entityManager.markDirty(target.id);

  // Check for death
  if (target.hp <= 0) {
    target.isDead = true;
    entityManager.markDirty(target.id);
  }

  return {
    type: 'damage',
    success: true,
    amount: totalDamage,
    damageType: damageType,
    resisted: resistanceAmount > 0,
    targetDied: target.hp <= 0
  };
}

/**
 * Apply heal effect
 * @param {object} caster - The caster
 * @param {object} target - The target
 * @param {object} effect - The effect definition
 * @param {object} entityManager - The entity manager
 * @returns {object} - Effect result
 */
function applyHeal(caster, target, effect, entityManager) {
  if (!target) {
    return { type: 'heal', success: false, message: 'No target' };
  }

  // Calculate healing (base + intelligence/wisdom modifier + level scaling)
  const baseHeal = effect.amount || 10;
  const intMod = Math.floor(((caster.intelligence || 10) - 10) / 2);
  const levelBonus = (caster.level || 1) * (effect.levelScale || 0);
  const totalHeal = Math.max(1, baseHeal + intMod + levelBonus);

  // Apply healing
  const oldHp = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + totalHeal);
  const actualHeal = target.hp - oldHp;
  entityManager.markDirty(target.id);

  return {
    type: 'heal',
    success: true,
    amount: actualHeal
  };
}

/**
 * Apply buff effect (temporary stat increase)
 * @param {object} caster - The caster
 * @param {object} target - The target
 * @param {object} effect - The effect definition
 * @param {object} entityManager - The entity manager
 * @returns {object} - Effect result
 */
function applyBuff(caster, target, effect, entityManager) {
  if (!target) {
    return { type: 'buff', success: false, message: 'No target' };
  }

  // Initialize buffs array if not exists
  if (!target.activeBuffs) {
    target.activeBuffs = [];
  }

  // Create buff object
  const buff = {
    id: `buff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    spellId: effect.spellId,
    stat: effect.stat, // e.g., 'ac', 'strength', 'dexterity'
    amount: effect.amount || 1,
    duration: effect.duration || 60, // seconds
    startTime: Date.now(),
    endTime: Date.now() + ((effect.duration || 60) * 1000)
  };

  // Apply buff to stat
  if (effect.stat === 'ac') {
    target.buffedAC = (target.buffedAC || 0) + buff.amount;
  } else if (effect.stat === 'strength') {
    target.strength = (target.strength || 10) + buff.amount;
  } else if (effect.stat === 'dexterity') {
    target.dexterity = (target.dexterity || 10) + buff.amount;
  } else if (effect.stat === 'intelligence') {
    target.intelligence = (target.intelligence || 10) + buff.amount;
  }

  target.activeBuffs.push(buff);
  entityManager.markDirty(target.id);

  // Schedule buff removal
  setTimeout(() => {
    removeBuff(target.id, buff.id, entityManager);
  }, buff.duration * 1000);

  return {
    type: 'buff',
    success: true,
    stat: effect.stat,
    amount: effect.amount,
    duration: effect.duration
  };
}

/**
 * Apply debuff effect (temporary stat decrease)
 * @param {object} caster - The caster
 * @param {object} target - The target
 * @param {object} effect - The effect definition
 * @param {object} entityManager - The entity manager
 * @returns {object} - Effect result
 */
function applyDebuff(caster, target, effect, entityManager) {
  if (!target) {
    return { type: 'debuff', success: false, message: 'No target' };
  }

  // Initialize debuffs array if not exists
  if (!target.activeDebuffs) {
    target.activeDebuffs = [];
  }

  // Create debuff object
  const debuff = {
    id: `debuff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    spellId: effect.spellId,
    stat: effect.stat,
    amount: effect.amount || 1,
    duration: effect.duration || 60,
    startTime: Date.now(),
    endTime: Date.now() + ((effect.duration || 60) * 1000)
  };

  // Apply debuff to stat
  if (effect.stat === 'ac') {
    target.buffedAC = (target.buffedAC || 0) - debuff.amount;
  } else if (effect.stat === 'strength') {
    target.strength = Math.max(1, (target.strength || 10) - debuff.amount);
  } else if (effect.stat === 'dexterity') {
    target.dexterity = Math.max(1, (target.dexterity || 10) - debuff.amount);
  } else if (effect.stat === 'intelligence') {
    target.intelligence = Math.max(1, (target.intelligence || 10) - debuff.amount);
  }

  target.activeDebuffs.push(debuff);
  entityManager.markDirty(target.id);

  // Schedule debuff removal
  setTimeout(() => {
    removeDebuff(target.id, debuff.id, entityManager);
  }, debuff.duration * 1000);

  return {
    type: 'debuff',
    success: true,
    stat: effect.stat,
    amount: effect.amount,
    duration: effect.duration
  };
}

/**
 * Apply damage-over-time (DOT) effect
 * @param {object} caster - The caster
 * @param {object} target - The target
 * @param {object} effect - The effect definition
 * @param {object} spell - The spell definition (for messages)
 * @param {object} entityManager - The entity manager
 * @returns {object} - Effect result
 */
function applyDot(caster, target, effect, spell, entityManager) {
  if (!target) {
    return { type: 'dot', success: false, message: 'No target' };
  }

  // Initialize DOTs array if not exists
  if (!target.activeDots) {
    target.activeDots = [];
  }

  // Check for existing DOTs from this spell
  const existingDots = target.activeDots.filter(d => d.spellId === spell.id);
  const stackBehavior = effect.stackBehavior || 'stack'; // Default: stack
  const maxStacks = effect.maxStacks || 999; // Default: unlimited

  // Handle different stacking behaviors
  if (stackBehavior === 'none' && existingDots.length > 0) {
    // Can't apply - already active
    return {
      type: 'dot',
      success: false,
      message: `${target.name === caster.name ? 'You are' : target.name + ' is'} already affected by ${spell.name}!`
    };
  }

  if (stackBehavior === 'refresh' && existingDots.length > 0) {
    // Remove all existing DOTs from this spell and apply new one
    for (const dot of existingDots) {
      removeDot(target.id, dot.id, entityManager);
    }
    console.log(`  🔄 ${spell.name} DOT refreshed on ${target.name}`);
  }

  if (stackBehavior === 'stack' && existingDots.length >= maxStacks) {
    // At max stacks - remove the oldest one
    const oldest = existingDots.sort((a, b) => a.startTime - b.startTime)[0];
    removeDot(target.id, oldest.id, entityManager);
    console.log(`  ⚠️  ${spell.name} at max stacks (${maxStacks}), removing oldest`);
  }

  // Calculate initial damage
  const initialDamage = effect.initialDamage || 0;
  if (initialDamage > 0) {
    const intMod = Math.floor(((caster.intelligence || 10) - 10) / 2);
    const totalInitialDamage = Math.max(1, initialDamage + intMod);
    target.hp = Math.max(0, target.hp - totalInitialDamage);
    entityManager.markDirty(target.id);
  }

  // Create DOT object
  const dot = {
    id: `dot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    spellId: spell.id, // Store spell ID for stacking checks
    spellName: spell.name,
    casterName: caster.name,
    casterId: caster.id,
    damagePerTick: effect.damagePerTick || 5,
    tickInterval: effect.tickInterval || 3, // seconds between ticks
    duration: effect.duration || 15, // total duration
    tickMessage: effect.tickMessage || `🔥 {target} burns for {damage} damage from {spell}!`, // Customizable per spell
    damageType: effect.damageType || 'magical', // fire, poison, magical, etc.
    startTime: Date.now(),
    endTime: Date.now() + ((effect.duration || 15) * 1000),
    lastTick: Date.now()
  };

  target.activeDots.push(dot);
  entityManager.markDirty(target.id);

  // Schedule DOT removal
  setTimeout(() => {
    removeDot(target.id, dot.id, entityManager);
  }, dot.duration * 1000);

  const stackInfo = stackBehavior === 'stack' && maxStacks < 999 ? ` (${existingDots.length + 1}/${maxStacks} stacks)` : '';
  console.log(`  🔥 ${spell.name} DOT applied to ${target.name} (${dot.damagePerTick} dmg every ${dot.tickInterval}s for ${dot.duration}s)${stackInfo}`);

  return {
    type: 'dot',
    success: true,
    initialDamage: initialDamage,
    damagePerTick: dot.damagePerTick,
    duration: dot.duration,
    stacks: existingDots.length + 1
  };
}

/**
 * Apply summon effect (spawn NPC helper)
 * @param {object} caster - The caster
 * @param {object} target - The target (unused for summons)
 * @param {object} effect - The effect definition
 * @param {object} entityManager - The entity manager
 * @returns {object} - Effect result
 */
function applySummon(caster, target, effect, entityManager) {
  // Load the NPC definition
  const npcDefPath = effect.npcDefinition; // e.g., "monster" or path to definition
  let npcDef;

  try {
    npcDef = require(`../lib/${npcDefPath}`);
  } catch (error) {
    console.error(`Failed to load NPC definition ${npcDefPath}:`, error.message);
    return { type: 'summon', success: false, message: 'Invalid NPC definition' };
  }

  // Create summoned NPC instance
  const summonId = `summon_${caster.id}_${Date.now()}`;
  const summon = Object.create(npcDef);

  Object.assign(summon, {
    id: summonId,
    name: effect.name || 'summoned creature',
    description: effect.description || 'A magical summon.',
    currentRoom: caster.currentRoom,
    type: 'npc',
    isSummon: true,
    summoner: caster.id,
    summonDuration: effect.duration || 300, // 5 minutes default
    summonExpires: Date.now() + ((effect.duration || 300) * 1000),
    level: effect.level || caster.level || 1,
    hp: effect.hp || 20,
    maxHp: effect.hp || 20,
    strength: effect.strength || 10,
    dexterity: effect.dexterity || 10,
    intelligence: effect.intelligence || 10,
    heartbeatInterval: 2, // Attack every 2 seconds
    heartbeat: function(entityManager) {
      // Attack summoner's combat opponent
      const summoner = entityManager.get(this.summoner);
      if (summoner && summoner.combat && summoner.combat.opponent) {
        const opponent = entityManager.get(summoner.combat.opponent);
        if (opponent && opponent.currentRoom === this.currentRoom) {
          const combat = require('./combat');
          combat.executeAttack(this.id, summoner.combat.opponent, entityManager);
        }
      }
    }
  });

  // Register summon
  entityManager.objects.set(summonId, summon);

  // Enable heartbeat for attacking
  entityManager.enableHeartbeat(summonId, summon.heartbeatInterval);

  // Notify room
  entityManager.notifyRoom(caster.currentRoom,
    `\x1b[35m${summon.name} appears in a flash of magical energy!\x1b[0m`);

  console.log(`  🔮 ${caster.name} summoned ${summon.name} (${summonId})`);

  // Schedule despawn
  setTimeout(() => {
    despawnSummon(summonId, entityManager);
  }, summon.summonDuration * 1000);

  return {
    type: 'summon',
    success: true,
    summonId: summonId,
    name: summon.name,
    duration: summon.summonDuration
  };
}

/**
 * Apply teleport effect
 * @param {object} caster - The caster
 * @param {object} target - The target (or caster for self-teleport)
 * @param {object} effect - The effect definition
 * @param {object} entityManager - The entity manager
 * @returns {object} - Effect result
 */
function applyTeleport(caster, target, effect, entityManager) {
  const teleportTarget = target || caster;

  if (!effect.destination) {
    return { type: 'teleport', success: false, message: 'No destination specified' };
  }

  const oldRoom = teleportTarget.currentRoom;
  teleportTarget.currentRoom = effect.destination;
  entityManager.markDirty(teleportTarget.id);

  // Notify old room
  if (oldRoom) {
    entityManager.notifyRoom(oldRoom,
      `\x1b[35m${teleportTarget.name} vanishes in a flash of light!\x1b[0m`,
      teleportTarget.id);
  }

  // Notify new room
  if (effect.destination) {
    entityManager.notifyRoom(effect.destination,
      `\x1b[35m${teleportTarget.name} appears in a flash of light!\x1b[0m`,
      teleportTarget.id);
  }

  return {
    type: 'teleport',
    success: true,
    from: oldRoom,
    to: effect.destination
  };
}

/**
 * Remove a buff from a target
 * @param {string} targetId - The target entity ID
 * @param {string} buffId - The buff ID to remove
 * @param {object} entityManager - The entity manager
 */
function removeBuff(targetId, buffId, entityManager) {
  const target = entityManager.get(targetId);

  if (!target || !target.activeBuffs) {
    return;
  }

  const buffIndex = target.activeBuffs.findIndex(b => b.id === buffId);
  if (buffIndex === -1) {
    return;
  }

  const buff = target.activeBuffs[buffIndex];

  // Reverse buff effect
  if (buff.stat === 'ac') {
    target.buffedAC = (target.buffedAC || 0) - buff.amount;
  } else if (buff.stat === 'strength') {
    target.strength = (target.strength || 10) - buff.amount;
  } else if (buff.stat === 'dexterity') {
    target.dexterity = (target.dexterity || 10) - buff.amount;
  } else if (buff.stat === 'intelligence') {
    target.intelligence = (target.intelligence || 10) - buff.amount;
  }

  target.activeBuffs.splice(buffIndex, 1);
  entityManager.markDirty(targetId);

  // Notify target if they're a player
  if (target.type === 'player') {
    entityManager.notifyPlayer(targetId,
      `\x1b[33mYour ${buff.stat} buff has worn off.\x1b[0m`);
  }

  console.log(`  ⏱️  Buff expired: ${buff.stat} +${buff.amount} on ${target.name}`);
}

/**
 * Remove a debuff from a target
 * @param {string} targetId - The target entity ID
 * @param {string} debuffId - The debuff ID to remove
 * @param {object} entityManager - The entity manager
 */
function removeDebuff(targetId, debuffId, entityManager) {
  const target = entityManager.get(targetId);

  if (!target || !target.activeDebuffs) {
    return;
  }

  const debuffIndex = target.activeDebuffs.findIndex(d => d.id === debuffId);
  if (debuffIndex === -1) {
    return;
  }

  const debuff = target.activeDebuffs[debuffIndex];

  // Reverse debuff effect
  if (debuff.stat === 'ac') {
    target.buffedAC = (target.buffedAC || 0) + debuff.amount;
  } else if (debuff.stat === 'strength') {
    target.strength = (target.strength || 10) + debuff.amount;
  } else if (debuff.stat === 'dexterity') {
    target.dexterity = (target.dexterity || 10) + debuff.amount;
  } else if (debuff.stat === 'intelligence') {
    target.intelligence = (target.intelligence || 10) + debuff.amount;
  }

  target.activeDebuffs.splice(debuffIndex, 1);
  entityManager.markDirty(targetId);

  // Notify target if they're a player
  if (target.type === 'player') {
    entityManager.notifyPlayer(targetId,
      `\x1b[32mThe ${debuff.stat} debuff has worn off.\x1b[0m`);
  }

  console.log(`  ⏱️  Debuff expired: ${debuff.stat} -${debuff.amount} on ${target.name}`);
}

/**
 * Remove a DOT from a target
 * @param {string} targetId - The target entity ID
 * @param {string} dotId - The DOT ID to remove
 * @param {object} entityManager - The entity manager
 */
function removeDot(targetId, dotId, entityManager) {
  const target = entityManager.get(targetId);

  if (!target || !target.activeDots) {
    return;
  }

  const dotIndex = target.activeDots.findIndex(d => d.id === dotId);
  if (dotIndex === -1) {
    return;
  }

  const dot = target.activeDots[dotIndex];
  target.activeDots.splice(dotIndex, 1);
  entityManager.markDirty(targetId);

  // Notify room that the DOT has ended
  if (target.currentRoom) {
    entityManager.notifyRoom(target.currentRoom,
      `\x1b[33mThe ${dot.spellName} effect on ${target.name} fades away.\x1b[0m`);
  }

  console.log(`  ⏱️  DOT expired: ${dot.spellName} on ${target.name}`);
}

/**
 * Process DOT ticks for an entity
 * @param {object} entity - The entity with active DOTs
 * @param {object} entityManager - The entity manager
 */
function processDotTicks(entity, entityManager) {
  if (!entity.activeDots || entity.activeDots.length === 0) {
    return;
  }

  const now = Date.now();

  for (const dot of entity.activeDots) {
    const timeSinceLastTick = (now - dot.lastTick) / 1000;

    if (timeSinceLastTick >= dot.tickInterval) {
      // Calculate damage (potentially with resistances)
      let damage = dot.damagePerTick;

      // Calculate aggregated resistances (base + armor)
      const entityResistances = resistances.calculateResistances(entity, entityManager);

      // Check for resistance to this damage type
      if (entityResistances[dot.damageType] !== undefined) {
        const resistance = entityResistances[dot.damageType]; // 0.0 to 1.0
        damage = Math.floor(damage * (1 - resistance));

        if (resistance >= 1.0) {
          // Immune - show special message
          if (entity.currentRoom) {
            entityManager.notifyRoom(entity.currentRoom,
              `\x1b[90m${entity.name} resists the ${dot.spellName}!\x1b[0m`);
          }
          dot.lastTick = now;
          continue; // Skip damage
        }
      }

      // Apply damage
      entity.hp = Math.max(0, entity.hp - damage);
      entityManager.markDirty(entity.id);
      dot.lastTick = now;

      // Format and broadcast tick message
      if (entity.currentRoom) {
        const message = dot.tickMessage
          .replace('{target}', entity.name)
          .replace('{damage}', damage)
          .replace('{spell}', dot.spellName);

        entityManager.notifyRoom(entity.currentRoom, `\x1b[31m${message}\x1b[0m`);
      }

      // Check for death
      if (entity.hp <= 0) {
        entity.isDead = true;
        entityManager.markDirty(entity.id);

        // Handle death if there's a caster
        if (dot.casterId) {
          const combat = require('./combat');
          combat.handleDeath(entity.id, dot.casterId, entityManager);
        }

        return; // Stop processing DOTs for dead entity
      }
    }
  }

  // Clean up expired DOTs
  const expiredDots = entity.activeDots.filter(d => d.endTime <= now);
  if (expiredDots.length > 0) {
    for (const dot of expiredDots) {
      removeDot(entity.id, dot.id, entityManager);
    }
  }
}

/**
 * Despawn a summoned creature
 * @param {string} summonId - The summon entity ID
 * @param {object} entityManager - The entity manager
 */
function despawnSummon(summonId, entityManager) {
  const summon = entityManager.get(summonId);

  if (!summon || !summon.isSummon) {
    return;
  }

  // Notify room
  if (summon.currentRoom) {
    entityManager.notifyRoom(summon.currentRoom,
      `\x1b[35m${summon.name} fades away as the magic expires.\x1b[0m`);
  }

  // Disable heartbeat
  if (entityManager.heartbeats.has(summonId)) {
    entityManager.disableHeartbeat(summonId);
  }

  // Remove summon
  entityManager.objects.delete(summonId);

  console.log(`  🔮 Summon despawned: ${summonId}`);
}

/**
 * Send spell messages to caster, target, and room
 * @param {object} caster - The caster
 * @param {object} target - The target (may be null)
 * @param {object} spell - The spell definition
 * @param {Array} effectResults - Results from spell effects
 * @param {object} entityManager - The entity manager
 */
function sendSpellMessages(caster, target, spell, effectResults, entityManager) {
  // Get messages from spell definition
  const messages = spell.messages || {};

  // Send message to caster
  if (messages.caster) {
    let msg = messages.caster;
    msg = msg.replace('{target}', target ? target.name : 'yourself');
    entityManager.notifyPlayer(caster.id, `\x1b[36m${msg}\x1b[0m`);
  }

  // Send message to target
  if (target && target.type === 'player' && messages.target) {
    let msg = messages.target;
    msg = msg.replace('{caster}', caster.name);
    entityManager.notifyPlayer(target.id, `\x1b[36m${msg}\x1b[0m`);
  }

  // Send message to room
  if (messages.room && caster.currentRoom) {
    let msg = messages.room;
    msg = msg.replace('{caster}', caster.name);
    msg = msg.replace('{target}', target ? target.name : caster.name);
    entityManager.notifyRoom(caster.currentRoom,
      `\x1b[36m${msg}\x1b[0m`,
      [caster.id, target ? target.id : null].filter(Boolean));
  }

  // Send effect-specific messages (damage/heal amounts, etc.)
  for (const result of effectResults) {
    if (result.type === 'damage' && result.success) {
      entityManager.notifyPlayer(caster.id,
        `\x1b[33mYou deal ${result.amount} magical damage!\x1b[0m`);
      if (target && target.type === 'player') {
        entityManager.notifyPlayer(target.id,
          `\x1b[31mYou take ${result.amount} magical damage!\x1b[0m`);
      }
    }

    if (result.type === 'heal' && result.success) {
      entityManager.notifyPlayer(caster.id,
        `\x1b[32mYou heal for ${result.amount} HP!\x1b[0m`);
      if (target && target.type === 'player' && target.id !== caster.id) {
        entityManager.notifyPlayer(target.id,
          `\x1b[32m${caster.name} heals you for ${result.amount} HP!\x1b[0m`);
      }
    }
  }
}

/**
 * Get all loaded spells
 * @returns {Array} - Array of spell definitions
 */
function getAllSpells() {
  return Array.from(spellDefinitions.values());
}

module.exports = {
  loadSpells,
  getSpell,
  findSpellByName,
  getAllSpells,
  canCast,
  validateTarget,
  cast,
  processDotTicks,
  removeBuff,
  removeDebuff,
  removeDot,
  despawnSummon
};
