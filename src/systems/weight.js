/**
 * Weight and Encumbrance System
 * Manages item weights and carrying capacity
 */

const Currency = require('./currency');

const Weight = {
  /**
   * Get weight of a single item
   * @param {Object} item - Item object
   * @param {Object} entityManager - Entity manager for resolving definitions
   * @returns {number} Weight of the item
   */
  getItemWeight: function(item, entityManager) {
    // Coins calculate weight dynamically
    if (item.definition === 'coin') {
      if (typeof item.getWeight === 'function') {
        return item.getWeight();
      }
      // Fallback calculation
      const denom = Currency.findDenomination(item.coinType);
      return denom ? (item.quantity * denom.weight) : 0;
    }

    // Standard items have weight property
    return item.weight || 0;
  },

  /**
   * Calculate total weight of inventory
   * @param {Array} inventory - Array of item IDs
   * @param {Object} entityManager - Entity manager
   * @returns {number} Total weight
   */
  calculateInventoryWeight: function(inventory, entityManager) {
    if (!inventory || inventory.length === 0) return 0;

    let totalWeight = 0;
    for (const itemId of inventory) {
      const item = entityManager.get(itemId);
      if (item) {
        totalWeight += this.getItemWeight(item, entityManager);
      }
    }

    return totalWeight;
  },

  /**
   * Calculate total weight player is carrying (inventory + purse)
   * @param {Object} player - Player object
   * @param {Object} entityManager - Entity manager
   * @returns {number} Total weight
   */
  calculateCarryingWeight: function(player, entityManager) {
    let totalWeight = 0;

    // Add inventory weight
    if (player.inventory) {
      totalWeight += this.calculateInventoryWeight(player.inventory, entityManager);
    }

    // Add purse weight
    if (player.purse && player.purse.coins) {
      totalWeight += Currency.calculateWeight(player.purse.coins);
    }

    return totalWeight;
  },

  /**
   * Get maximum carrying capacity for a player
   * @param {Object} player - Player object
   * @returns {number} Maximum weight capacity
   */
  getMaxCarryWeight: function(player) {
    // Base capacity + strength bonus
    const baseCapacity = player.baseCarryWeight || 100;
    const strength = player.strength || 10;
    const strengthBonus = (strength - 10) * 10; // +10 capacity per point above 10

    return baseCapacity + strengthBonus;
  },

  /**
   * Check if player can carry additional weight
   * @param {Object} player - Player object
   * @param {number} additionalWeight - Weight to add
   * @param {Object} entityManager - Entity manager
   * @returns {boolean} True if player can carry it
   */
  canCarry: function(player, additionalWeight, entityManager) {
    const currentWeight = this.calculateCarryingWeight(player, entityManager);
    const maxWeight = this.getMaxCarryWeight(player);
    return (currentWeight + additionalWeight) <= maxWeight;
  },

  /**
   * Get encumbrance level (for future movement penalties)
   * @param {Object} player - Player object
   * @param {Object} entityManager - Entity manager
   * @returns {string} 'light', 'medium', 'heavy', 'overloaded'
   */
  getEncumbranceLevel: function(player, entityManager) {
    const currentWeight = this.calculateCarryingWeight(player, entityManager);
    const maxWeight = this.getMaxCarryWeight(player);
    const ratio = currentWeight / maxWeight;

    if (ratio >= 1.0) return 'overloaded';
    if (ratio >= 0.75) return 'heavy';
    if (ratio >= 0.5) return 'medium';
    return 'light';
  },

  /**
   * Format weight display
   * @param {number} weight - Weight value
   * @returns {string} Formatted weight string
   */
  formatWeight: function(weight) {
    return weight.toFixed(1);
  },

  /**
   * Get carrying status message
   * @param {Object} player - Player object
   * @param {Object} entityManager - Entity manager
   * @returns {string} Status message
   */
  getCarryingStatus: function(player, entityManager) {
    const current = this.calculateCarryingWeight(player, entityManager);
    const max = this.getMaxCarryWeight(player);
    const level = this.getEncumbranceLevel(player, entityManager);

    const levelDescriptions = {
      light: 'You feel light and agile.',
      medium: 'You are carrying a moderate load.',
      heavy: 'You are heavily encumbered.',
      overloaded: 'You are overloaded and can barely move!'
    };

    return `Carrying: ${this.formatWeight(current)}/${this.formatWeight(max)} lbs - ${levelDescriptions[level]}`;
  }
};

module.exports = Weight;
