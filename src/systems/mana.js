/**
 * Mana System
 * Manages magical energy pools for spellcasting
 *
 * Entities with mana have:
 * - mp: Current mana points
 * - maxMp: Maximum mana points
 * - mpRegen: Mana regeneration rate (points per tick)
 */

/**
 * Initialize mana properties on an entity
 * @param {object} entity - The entity to initialize
 * @param {number} maxMp - Maximum mana points (defaults based on intelligence/level)
 * @param {object} entityManager - The entity manager
 */
function initializeMana(entity, maxMp = null, entityManager) {
  // Calculate default max MP based on intelligence and level
  if (maxMp === null) {
    const intelligence = entity.intelligence || 10;
    const level = entity.level || 1;
    const intMod = Math.floor((intelligence - 10) / 2);
    maxMp = Math.max(10, (level * 5) + (intMod * 2));
  }

  entity.maxMp = maxMp;
  entity.mp = maxMp; // Start at full mana
  entity.mpRegen = entity.mpRegen || 1; // Default 1 MP per regen tick

  if (entityManager) {
    entityManager.markDirty(entity.id);
  }
}

/**
 * Check if an entity has enough mana
 * @param {object} entity - The entity to check
 * @param {number} cost - Mana cost required
 * @returns {boolean} - Whether entity has enough mana
 */
function hasMana(entity, cost) {
  if (!entity.maxMp) {
    return false; // Entity has no mana pool
  }
  return entity.mp >= cost;
}

/**
 * Consume mana from an entity
 * @param {string} entityId - The entity ID
 * @param {number} cost - Mana cost to consume
 * @param {object} entityManager - The entity manager
 * @returns {boolean} - Whether mana was successfully consumed
 */
function consumeMana(entityId, cost, entityManager) {
  const entity = entityManager.get(entityId);

  if (!entity) {
    return false;
  }

  if (!hasMana(entity, cost)) {
    return false;
  }

  entity.mp = Math.max(0, entity.mp - cost);
  entityManager.markDirty(entityId);

  return true;
}

/**
 * Restore mana to an entity
 * @param {string} entityId - The entity ID
 * @param {number} amount - Mana to restore
 * @param {object} entityManager - The entity manager
 * @returns {number} - Amount actually restored
 */
function restoreMana(entityId, amount, entityManager) {
  const entity = entityManager.get(entityId);

  if (!entity || !entity.maxMp) {
    return 0;
  }

  const oldMp = entity.mp || 0;
  entity.mp = Math.min(entity.maxMp, oldMp + amount);
  entityManager.markDirty(entityId);

  return entity.mp - oldMp;
}

/**
 * Regenerate mana for an entity (called by heartbeat or tick)
 * @param {string} entityId - The entity ID
 * @param {object} entityManager - The entity manager
 * @returns {number} - Amount regenerated
 */
function regenerateMana(entityId, entityManager) {
  const entity = entityManager.get(entityId);

  if (!entity || !entity.maxMp || entity.mp >= entity.maxMp) {
    return 0;
  }

  const regenAmount = entity.mpRegen || 1;
  return restoreMana(entityId, regenAmount, entityManager);
}

/**
 * Get mana percentage (for display)
 * @param {object} entity - The entity
 * @returns {number} - Mana percentage (0-100)
 */
function getManaPercent(entity) {
  if (!entity.maxMp) {
    return 0;
  }
  return Math.floor((entity.mp / entity.maxMp) * 100);
}

/**
 * Get mana status string (for display)
 * @param {object} entity - The entity
 * @returns {string} - Formatted mana status
 */
function getManaStatus(entity) {
  if (!entity.maxMp) {
    return 'No mana';
  }
  return `${entity.mp}/${entity.maxMp} MP (${getManaPercent(entity)}%)`;
}

module.exports = {
  initializeMana,
  hasMana,
  consumeMana,
  restoreMana,
  regenerateMana,
  getManaPercent,
  getManaStatus
};
