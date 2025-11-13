/**
 * Combat System
 * Manages turn-based fighting in vibeMUD using per-combat heartbeats
 * Each combat encounter gets its own 2-second heartbeat that processes attacks in initiative order
 */

// Dice rolling helper
function d20() {
  return Math.floor(Math.random() * 20) + 1;
}

function d6() {
  return Math.floor(Math.random() * 6) + 1;
}

// Generate unique combat ID
function generateCombatId() {
  return `combat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start a combat encounter between two participants
 * @param {string} attackerId - ID of the attacker
 * @param {string} defenderId - ID of the defender
 * @param {object} entityManager - The entity manager
 */
function engage(attackerId, defenderId, entityManager) {
  const attacker = entityManager.get(attackerId);
  const defender = entityManager.get(defenderId);

  if (!attacker || !defender) {
    console.error('Cannot engage combat: invalid participants');
    return;
  }

  // Check if either participant is already in combat
  if (attacker.combat) {
    entityManager.notifyPlayer(attackerId, 'You are already in combat!');
    return;
  }

  if (defender.combat) {
    entityManager.notifyPlayer(attackerId, `${defender.name} is already in combat!`);
    return;
  }

  // Generate unique combat ID
  const combatId = generateCombatId();

  // Roll initiative
  const initiative = rollInitiative(attackerId, defenderId, entityManager);

  // Set combat state on both participants
  attacker.combat = {
    opponent: defenderId,
    combatId: combatId,
    queuedAction: null
  };
  entityManager.markDirty(attackerId);

  defender.combat = {
    opponent: attackerId,
    combatId: combatId,
    queuedAction: null
  };
  entityManager.markDirty(defenderId);

  // Notify participants and room
  entityManager.notifyPlayer(attackerId, `\x1b[31mYou attack ${defender.name}!\x1b[0m`);
  entityManager.notifyPlayer(defenderId, `\x1b[31m${attacker.name} attacks you!\x1b[0m`);

  const room = attacker.currentRoom;
  if (room) {
    entityManager.notifyRoom(room,
      `\x1b[31m${attacker.name} attacks ${defender.name}!\x1b[0m`,
      [attackerId, defenderId]);
  }

  // Create combat encounter object with heartbeat
  const encounter = {
    id: combatId,
    type: 'combat_encounter',
    participants: [attackerId, defenderId],
    initiative: initiative,
    startTime: Date.now(),
    heartbeatInterval: 2,
    // Heartbeat function that will be called by EntityManager
    heartbeat: function(entityManager) {
      processCombatRound(this, entityManager);
    }
  };

  // Register encounter as an entity (so it can have heartbeats)
  entityManager.objects.set(combatId, encounter);

  // Enable heartbeat for this encounter (2 second interval)
  entityManager.enableHeartbeat(combatId, 2);

  console.log(`  ⚔️  Combat started: ${attacker.name} vs ${defender.name} (${combatId})`);
}

/**
 * End combat for a participant
 * @param {string} participantId - ID of the participant leaving combat
 * @param {object} entityManager - The entity manager
 */
function disengage(participantId, entityManager) {
  const participant = entityManager.get(participantId);

  if (!participant || !participant.combat) {
    return; // Not in combat
  }

  const combatId = participant.combat.combatId;
  const opponentId = participant.combat.opponent;
  const opponent = entityManager.get(opponentId);

  // Clear combat state from participant
  delete participant.combat;
  entityManager.markDirty(participantId);

  // Clear combat state from opponent
  if (opponent && opponent.combat && opponent.combat.combatId === combatId) {
    delete opponent.combat;
    entityManager.markDirty(opponentId);
    entityManager.notifyPlayer(opponentId, `\x1b[33m${participant.name} has fled from combat!\x1b[0m`);
  }

  // Remove combat heartbeat and encounter object
  entityManager.disableHeartbeat(combatId);
  entityManager.objects.delete(combatId);

  console.log(`  🏃 ${participant.name} disengaged from combat (${combatId})`);
}

/**
 * Process one round of combat (called by heartbeat)
 * @param {object} encounter - The combat encounter data
 * @param {object} entityManager - The entity manager
 */
function processCombatRound(encounter, entityManager) {
  // Check if combat should continue
  if (!shouldContinueCombat(encounter, entityManager)) {
    entityManager.disableHeartbeat(encounter.id);
    entityManager.objects.delete(encounter.id);
    return;
  }

  // Process attacks in initiative order
  for (const attackerId of encounter.initiative) {
    const attacker = entityManager.get(attackerId);

    // Verify attacker is still valid and in combat
    if (!attacker || !attacker.combat || attacker.combat.combatId !== encounter.id) {
      continue;
    }

    const defenderId = attacker.combat.opponent;
    const defender = entityManager.get(defenderId);

    // Verify defender is still valid
    if (!defender || !defender.combat || defender.combat.combatId !== encounter.id) {
      continue;
    }

    // Check for queued action (future: spells, items)
    if (attacker.combat.queuedAction) {
      // TODO: Phase 3 - execute queued actions
      attacker.combat.queuedAction = null;
    } else {
      // Default action: attack
      executeAttack(attackerId, defenderId, entityManager);
    }

    // Check if defender died
    if (defender.hp <= 0) {
      // Defender is dead - end combat
      handleDeath(defenderId, attackerId, entityManager);
      entityManager.disableHeartbeat(encounter.id);
      entityManager.objects.delete(encounter.id);
      return;
    }
  }
}

/**
 * Execute a single attack
 * @param {string} attackerId - ID of the attacker
 * @param {string} defenderId - ID of the defender
 * @param {object} entityManager - The entity manager
 * @returns {boolean} - Whether the attack hit
 */
function executeAttack(attackerId, defenderId, entityManager) {
  const attacker = entityManager.get(attackerId);
  const defender = entityManager.get(defenderId);

  if (!attacker || !defender) {
    return false;
  }

  // Roll to hit
  const hit = rollToHit(attacker, defender);

  if (hit) {
    // Calculate damage
    const damage = calculateDamage(attacker, defender);

    // Apply damage
    applyDamage(defenderId, damage, attackerId, entityManager);

    // Notify participants
    entityManager.notifyPlayer(attackerId,
      `\x1b[32mYou hit ${defender.name} for \x1b[33m${damage}\x1b[32m damage!\x1b[0m`);
    entityManager.notifyPlayer(defenderId,
      `\x1b[31m${attacker.name} hits you for \x1b[33m${damage}\x1b[31m damage!\x1b[0m`);

    // Notify room
    const room = attacker.currentRoom;
    if (room) {
      entityManager.notifyRoom(room,
        `\x1b[33m${attacker.name} hits ${defender.name} for ${damage} damage!\x1b[0m`,
        [attackerId, defenderId]);
    }

    return true;
  } else {
    // Miss
    entityManager.notifyPlayer(attackerId,
      `\x1b[90mYou miss ${defender.name}!\x1b[0m`);
    entityManager.notifyPlayer(defenderId,
      `\x1b[90m${attacker.name} misses you!\x1b[0m`);

    // Notify room
    const room = attacker.currentRoom;
    if (room) {
      entityManager.notifyRoom(room,
        `\x1b[90m${attacker.name} misses ${defender.name}!\x1b[0m`,
        [attackerId, defenderId]);
    }

    return false;
  }
}

/**
 * Roll initiative order
 * @param {string} id1 - First participant ID
 * @param {string} id2 - Second participant ID
 * @param {object} entityManager - The entity manager
 * @returns {Array<string>} - Initiative order (highest first)
 */
function rollInitiative(id1, id2, entityManager) {
  const p1 = entityManager.get(id1);
  const p2 = entityManager.get(id2);

  if (!p1 || !p2) {
    return [id1, id2];
  }

  // Higher dexterity goes first
  const p1Dex = p1.dexterity || 10;
  const p2Dex = p2.dexterity || 10;

  if (p1Dex > p2Dex) {
    return [id1, id2];
  } else if (p2Dex > p1Dex) {
    return [id2, id1];
  } else {
    // Tie: random
    return Math.random() < 0.5 ? [id1, id2] : [id2, id1];
  }
}

/**
 * Calculate hit chance and determine if attack hits
 * Formula: d20 + attacker.dexterity + attacker.level >= 10 + defender.ac + defender.dexterity
 * @param {object} attacker - The attacker object
 * @param {object} defender - The defender object
 * @returns {boolean} - Whether the attack hits
 */
function rollToHit(attacker, defender) {
  const attackRoll = d20();
  const attackBonus = (attacker.dexterity || 10) + (attacker.level || 1);
  const attackTotal = attackRoll + attackBonus;

  const defenseValue = 10 + (defender.ac || 0) + (defender.dexterity || 10);

  return attackTotal >= defenseValue;
}

/**
 * Calculate damage amount
 * Formula: 1d6 + attacker.strength + attacker.level
 * @param {object} attacker - The attacker object
 * @param {object} defender - The defender object (for future armor calculations)
 * @returns {number} - Damage amount
 */
function calculateDamage(attacker, defender) {
  const baseDamage = d6();
  const strengthBonus = Math.floor(((attacker.strength || 10) - 10) / 2); // D&D-style modifier
  const levelBonus = (attacker.level || 1);

  const totalDamage = Math.max(1, baseDamage + strengthBonus + levelBonus);

  return totalDamage;
}

/**
 * Apply damage to a target and check for death
 * @param {string} targetId - ID of the target
 * @param {number} amount - Damage amount
 * @param {string} sourceId - ID of the damage source
 * @param {object} entityManager - The entity manager
 */
function applyDamage(targetId, amount, sourceId, entityManager) {
  const target = entityManager.get(targetId);

  if (!target) {
    return;
  }

  // Apply damage
  target.hp = Math.max(0, target.hp - amount);
  entityManager.markDirty(targetId);

  // Check for death
  if (target.hp <= 0) {
    target.isDead = true;
    entityManager.markDirty(targetId);
  }
}

/**
 * Handle death of a participant
 * @param {string} deadId - ID of the dead participant
 * @param {string} killerId - ID of the killer
 * @param {object} entityManager - The entity manager
 */
function handleDeath(deadId, killerId, entityManager) {
  const dead = entityManager.get(deadId);
  const killer = entityManager.get(killerId);

  if (!dead) return;

  const room = dead.currentRoom;

  // Clear combat state
  if (dead.combat) {
    delete dead.combat;
    entityManager.markDirty(deadId);
  }

  if (killer && killer.combat) {
    delete killer.combat;
    entityManager.markDirty(killerId);
  }

  // Notify room of death
  if (room) {
    entityManager.notifyRoom(room,
      `\x1b[31m${dead.name} has been slain!\x1b[0m`);
  }

  // Notify killer
  if (killer) {
    entityManager.notifyPlayer(killerId,
      `\x1b[32mYou have slain ${dead.name}!\x1b[0m`);
  }

  console.log(`  💀 ${dead.name} was slain by ${killer ? killer.name : 'unknown'}`);

  // TODO: Phase 2 - Create corpse, handle respawn
}

/**
 * Check if combat should continue
 * @param {object} encounter - The combat encounter
 * @param {object} entityManager - The entity manager
 * @returns {boolean} - Whether combat should continue
 */
function shouldContinueCombat(encounter, entityManager) {
  // Check all participants are still valid
  for (const participantId of encounter.participants) {
    const participant = entityManager.get(participantId);

    // Participant doesn't exist, is dead, or not in this combat
    if (!participant ||
        participant.isDead ||
        !participant.combat ||
        participant.combat.combatId !== encounter.id) {
      return false;
    }

    // Check opponent still exists
    const opponentId = participant.combat.opponent;
    const opponent = entityManager.get(opponentId);

    if (!opponent || opponent.isDead || !opponent.combat) {
      return false;
    }

    // Check both in same room
    if (participant.currentRoom !== opponent.currentRoom) {
      return false;
    }
  }

  return true;
}

module.exports = {
  engage,
  disengage,
  processCombatRound,
  executeAttack,
  rollInitiative,
  rollToHit,
  calculateDamage,
  applyDamage,
  shouldContinueCombat,
  handleDeath
};
