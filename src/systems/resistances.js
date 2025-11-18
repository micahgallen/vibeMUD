/**
 * Resistance System
 * Handles damage type resistances from base stats and equipped armor
 */

/**
 * Calculate resistances from base stats and equipped armor
 * @param {object} entity - The entity (player or NPC)
 * @param {object} entityManager - The entity manager
 * @returns {object} - Aggregated resistances map
 */
function calculateResistances(entity, entityManager) {
  const resistances = {};

  // Start with base resistances from the entity itself
  if (entity.resistances) {
    for (const [damageType, value] of Object.entries(entity.resistances)) {
      resistances[damageType] = value;
    }
  }

  // Add resistances from equipped armor
  if (entity.equipped) {
    const armorSlots = ['chest', 'head', 'legs', 'hands', 'feet', 'shield'];

    for (const slot of armorSlots) {
      const armorId = entity.equipped[slot];
      if (armorId) {
        const armor = entityManager.get(armorId);
        if (armor && armor.itemType === 'armor' && !armor.broken && armor.resistances) {
          // Add armor resistances to total
          for (const [damageType, value] of Object.entries(armor.resistances)) {
            resistances[damageType] = (resistances[damageType] || 0) + value;
          }
        }
      }
    }
  }

  // Cap resistances at 1.0 (100% immunity) for positive values
  // Allow negative resistances (vulnerabilities) to go below 0
  for (const damageType in resistances) {
    if (resistances[damageType] > 1.0) {
      resistances[damageType] = 1.0;
    }
  }

  return resistances;
}

module.exports = {
  calculateResistances
};
