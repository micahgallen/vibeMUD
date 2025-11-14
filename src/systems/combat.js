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
  const hit = rollToHit(attacker, defender, entityManager);

  if (hit) {
    // Calculate damage
    const damage = calculateDamage(attacker, defender, entityManager);

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
 * Formula: d20 + attacker.dexterity modifier + attacker.level >= defender's AC
 * @param {object} attacker - The attacker object
 * @param {object} defender - The defender object
 * @param {object} entityManager - The entity manager (for equipment lookups)
 * @returns {boolean} - Whether the attack hits
 */
function rollToHit(attacker, defender, entityManager) {
  const attackRoll = d20();

  // D&D 5E style: use dexterity modifier + proficiency/level bonus
  const dexMod = Math.floor(((attacker.dexterity || 10) - 10) / 2);
  const attackBonus = dexMod + (attacker.level || 1);
  const attackTotal = attackRoll + attackBonus;

  // Calculate defender's AC from equipped armor
  const defenderAC = calculateAC(defender, entityManager);

  return attackTotal >= defenderAC;
}

/**
 * Calculate AC from equipped armor
 * @param {object} entity - The entity (player or NPC)
 * @param {object} entityManager - The entity manager
 * @returns {number} - Total AC
 */
function calculateAC(entity, entityManager) {
  // NPCs without equipment use their ac property
  if (entity.type === 'npc' && (!entity.equipped || Object.keys(entity.equipped).length === 0)) {
    const dexMod = Math.floor(((entity.dexterity || 10) - 10) / 2);
    return 10 + (entity.ac || 0) + dexMod;
  }

  // Calculate from equipped armor
  if (!entity.equipped) {
    const dexMod = Math.floor(((entity.dexterity || 10) - 10) / 2);
    return 10 + dexMod; // Base AC with no armor
  }

  const entityDex = entity.dexterity || 10;
  const dexMod = Math.floor((entityDex - 10) / 2);

  // Start with base AC (10 + dex modifier for unarmored)
  let totalAC = 10 + dexMod;

  // Check for body armor (chest slot)
  const chestArmorId = entity.equipped.chest;
  if (chestArmorId) {
    const armor = entityManager.get(chestArmorId);
    if (armor && armor.itemType === 'armor' && !armor.broken) {
      totalAC = armor.getAC ? armor.getAC(entityDex) : armor.baseAC;
    }
  }

  // Add shield bonus if equipped
  const shieldId = entity.equipped.shield;
  if (shieldId) {
    const shield = entityManager.get(shieldId);
    if (shield && shield.itemType === 'armor' && !shield.broken) {
      const shieldBonus = shield.getAC ? shield.getAC(entityDex) : 2;
      totalAC += shieldBonus;
    }
  }

  return totalAC;
}

/**
 * Calculate damage amount from equipped weapon or unarmed
 * @param {object} attacker - The attacker object
 * @param {object} defender - The defender object (for future armor calculations)
 * @param {object} entityManager - The entity manager
 * @returns {number} - Damage amount
 */
function calculateDamage(attacker, defender, entityManager) {
  const strengthMod = Math.floor(((attacker.strength || 10) - 10) / 2); // D&D-style modifier
  const levelBonus = (attacker.level || 1);

  // Check for equipped weapon in main hand
  let weaponDamage = '1d4'; // Unarmed default
  if (attacker.equipped && attacker.equipped.mainHand) {
    const weapon = entityManager.get(attacker.equipped.mainHand);
    if (weapon && weapon.itemType === 'weapon' && !weapon.broken) {
      weaponDamage = weapon.getDamage ? weapon.getDamage() : (weapon.damage || '1d4');
    }
  }

  // Parse weapon damage (e.g., "1d6", "2d4", "1d8+2")
  const baseDamage = parseDamageRoll(weaponDamage);

  const totalDamage = Math.max(1, baseDamage + strengthMod + levelBonus);

  return totalDamage;
}

/**
 * Parse and roll damage dice
 * @param {string} diceStr - Damage dice string (e.g., "1d6", "2d4+3")
 * @returns {number} - Rolled damage
 */
function parseDamageRoll(diceStr) {
  // Parse format: XdY+Z or XdY
  const match = diceStr.match(/(\d+)d(\d+)(?:\+(\d+))?/);

  if (!match) {
    return 1; // Default to 1 if parsing fails
  }

  const numDice = parseInt(match[1]);
  const diceSize = parseInt(match[2]);
  const bonus = match[3] ? parseInt(match[3]) : 0;

  let total = bonus;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * diceSize) + 1;
  }

  return total;
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

  // Phase 2: Create corpse and handle respawn
  createCorpse(dead, room, entityManager);

  if (dead.type === 'player') {
    handlePlayerDeath(dead, entityManager);
  } else if (dead.type === 'npc') {
    handleNPCDeath(dead, entityManager);
  }
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

/**
 * Create a corpse from a dead entity
 * @param {object} dead - The dead entity
 * @param {string} roomId - The room where death occurred
 * @param {object} entityManager - The entity manager
 * @returns {string} - The corpse ID
 */
function createCorpse(dead, roomId, entityManager) {
  // Load corpse definition
  const corpseDef = require('../lib/corpse');

  // Generate unique corpse ID
  const corpseId = `corpse_${dead.id}_${Date.now()}`;

  // Create corpse object with prototypal inheritance
  const corpse = Object.create(corpseDef);
  Object.assign(corpse, {
    id: corpseId,
    name: `the corpse of ${dead.name}`,
    description: dead.type === 'player'
      ? `The lifeless body of ${dead.name} lies here.`
      : `The remains of ${dead.name} lie here.`,
    location: { type: 'room', room: roomId },
    inventory: [],
    createdAt: Date.now(),
    heartbeatInterval: 60, // Check for decay every 60 seconds
    ownerType: dead.type, // Track if this was a player or NPC corpse
    ownerId: dead.id // Original entity ID for respawn
  });

  // Register corpse
  entityManager.objects.set(corpseId, corpse);

  // Transfer inventory to corpse
  if (dead.inventory && dead.inventory.length > 0) {
    for (const itemId of [...dead.inventory]) {
      try {
        entityManager.move(itemId, {
          type: 'container',
          owner: corpseId
        });
        console.log(`  💀 Moved ${itemId} to corpse`);
      } catch (error) {
        console.error(`  ⚠️  Failed to move ${itemId} to corpse:`, error.message);
      }
    }
  }

  // Enable decay heartbeat
  entityManager.enableHeartbeat(corpseId, 60);

  // Notify room
  if (roomId) {
    entityManager.notifyRoom(roomId,
      `\x1b[90m${corpse.name} lies here.\x1b[0m`);
  }

  console.log(`  💀 Created corpse: ${corpseId} in ${roomId}`);

  return corpseId;
}

/**
 * Handle player death - turn into ghost and schedule respawn
 * @param {object} player - The dead player
 * @param {object} entityManager - The entity manager
 */
function handlePlayerDeath(player, entityManager) {
  // Set ghost state
  player.isGhost = true;
  player.isDead = false; // Clear isDead, they're now a ghost
  player.hp = 0; // Keep HP at 0 until respawn
  entityManager.markDirty(player.id);

  // Notify player
  entityManager.notifyPlayer(player.id,
    `\x1b[31m\n${'='.repeat(60)}\n` +
    `You have died!\n` +
    `You will respawn in 30 seconds...\n` +
    `${'='.repeat(60)}\x1b[0m\n`);

  console.log(`  👻 ${player.name} became a ghost`);

  // Schedule respawn after 30 seconds
  setTimeout(() => {
    respawnPlayer(player.id, entityManager);
  }, 30000);
}

/**
 * Handle NPC death - despawn and schedule respawn
 * @param {object} npc - The dead NPC
 * @param {object} entityManager - The entity manager
 */
function handleNPCDeath(npc, entityManager) {
  // Store respawn data before despawning
  const respawnData = {
    id: npc.id,
    definition: npc.definition,
    currentRoom: npc.currentRoom,
    hp: npc.maxHp,
    level: npc.level,
    // Store any other essential properties
    ...JSON.parse(JSON.stringify(npc)) // Deep clone
  };

  // Disable heartbeat
  if (entityManager.heartbeats.has(npc.id)) {
    entityManager.disableHeartbeat(npc.id);
  }

  // Remove NPC from game
  entityManager.objects.delete(npc.id);

  console.log(`  💀 Despawned NPC: ${npc.id}`);

  // Schedule respawn after 5 minutes
  setTimeout(() => {
    respawnNPC(respawnData, entityManager);
  }, 300000); // 5 minutes
}

/**
 * Respawn a player at the respawn point
 * @param {string} playerId - The player ID
 * @param {object} entityManager - The entity manager
 */
function respawnPlayer(playerId, entityManager) {
  const player = entityManager.get(playerId);

  if (!player) {
    console.warn(`Cannot respawn: player ${playerId} not found`);
    return;
  }

  // Remove ghost state
  delete player.isGhost;

  // Restore HP to full
  player.hp = player.maxHp;

  // Teleport to respawn point (Count von Count's healing fountain)
  const respawnRoom = 'counts_fountain';
  player.currentRoom = respawnRoom;

  entityManager.markDirty(playerId);

  // Notify player
  entityManager.notifyPlayer(playerId,
    `\x1b[32m\n${'='.repeat(60)}\n` +
    `You have been resurrected!\n` +
    `${'='.repeat(60)}\x1b[0m\n`);

  // Notify respawn room
  entityManager.notifyRoom(respawnRoom,
    `\x1b[36m${player.name} materializes from the void.\x1b[0m`,
    playerId);

  console.log(`  ✨ ${player.name} respawned at ${respawnRoom}`);

  // Auto-look at new location
  const lookCommand = require('../commands/look.js');
  const session = Array.from(entityManager.sessions.values()).find(s =>
    s.player && s.player.id === playerId
  );

  if (session) {
    const colors = require('../core/colors');
    lookCommand.execute(session, '', entityManager, colors);
  }
}

/**
 * Respawn an NPC at its original location
 * @param {object} respawnData - The NPC respawn data
 * @param {object} entityManager - The entity manager
 */
function respawnNPC(respawnData, entityManager) {
  // Check if NPC already exists (shouldn't happen, but safety check)
  if (entityManager.objects.has(respawnData.id)) {
    console.warn(`Cannot respawn: NPC ${respawnData.id} already exists`);
    return;
  }

  // Load definition if available
  let npc = respawnData;
  if (respawnData.definition) {
    try {
      const definition = require(`../lib/${respawnData.definition}`);
      npc = Object.create(definition);
      Object.assign(npc, respawnData);
    } catch (error) {
      console.warn(`Could not load definition ${respawnData.definition}, using raw data`);
    }
  }

  // Reset to full HP
  npc.hp = npc.maxHp;
  delete npc.isDead;

  // Register NPC
  entityManager.objects.set(npc.id, npc);

  // Re-enable heartbeat if NPC had one
  if (npc.heartbeatInterval) {
    entityManager.enableHeartbeat(npc.id, npc.heartbeatInterval);
  }

  // Notify room
  if (npc.currentRoom) {
    entityManager.notifyRoom(npc.currentRoom,
      `\x1b[36m${npc.name} appears.\x1b[0m`);
  }

  console.log(`  ✨ NPC respawned: ${npc.id} at ${npc.currentRoom}`);
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
