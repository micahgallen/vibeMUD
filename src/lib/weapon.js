/**
 * Weapon Item Definition
 * For swords, axes, maces, daggers, and other weapons
 *
 * Inherits from: item.js
 * Inherited by: Templates like iron_sword_001.json, dagger_001.json
 */

const item = require('./item');

module.exports = Object.create(item, {
  // Weapons are not stackable
  stackable: {
    value: false,
    writable: false,
    enumerable: true,
    configurable: false
  },

  itemType: {
    value: 'weapon',
    writable: false,
    enumerable: true,
    configurable: false
  },

  // Default weapon properties
  damage: {
    value: '1d4',
    writable: true,
    enumerable: true,
    configurable: true
  },

  durability: {
    value: 100,
    writable: true,
    enumerable: true,
    configurable: true
  },

  maxDurability: {
    value: 100,
    writable: true,
    enumerable: true,
    configurable: true
  },

  broken: {
    value: false,
    writable: true,
    enumerable: true,
    configurable: true
  },

  weaponType: {
    value: 'melee',  // melee, ranged, magic
    writable: true,
    enumerable: true,
    configurable: true
  },

  /**
   * Get the damage dice for this weapon
   * @returns {string} Damage dice (e.g., "1d8+2")
   */
  getDamage: {
    value: function() {
      if (this.broken) {
        return '1d2'; // Broken weapons do minimal damage
      }
      return this.damage || '1d4';
    },
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Reduce weapon durability from use
   * @param {number} amount - Amount to reduce
   * @param {Object} entityManager - Entity manager
   * @returns {Object} Result with broken status and message
   */
  reduceDurability: {
    value: function(amount, entityManager) {
      if (this.broken) {
        return { broken: true, message: `${this.name} is already broken!` };
      }

      this.durability = Math.max(0, this.durability - amount);
      entityManager.markDirty(this.id);

      if (this.durability === 0) {
        this.broken = true;
        return {
          broken: true,
          message: `${this.name} shatters from overuse!`
        };
      }

      // Warn if low durability
      if (this.durability < this.maxDurability * 0.2) {
        return {
          broken: false,
          message: `${this.name} is badly damaged and may break soon.`,
          warning: true
        };
      }

      return { broken: false };
    },
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Repair the weapon
   * @param {number} amount - Amount to repair
   * @param {Object} entityManager - Entity manager
   * @returns {Object} Result with success and message
   */
  repair: {
    value: function(amount, entityManager) {
      if (!this.broken && this.durability === this.maxDurability) {
        return {
          success: false,
          message: `${this.name} doesn't need repair.`
        };
      }

      const oldDurability = this.durability;
      this.durability = Math.min(this.maxDurability, this.durability + amount);
      this.broken = false;
      entityManager.markDirty(this.id);

      const repairedAmount = this.durability - oldDurability;

      return {
        success: true,
        message: `You repair ${this.name} (+${repairedAmount} durability).`,
        repaired: repairedAmount
      };
    },
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Check if weapon can be used
   * @returns {boolean}
   */
  canUse: {
    value: function() {
      return !this.broken && this.durability > 0;
    },
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Get weapon condition description
   * @returns {string}
   */
  getCondition: {
    value: function() {
      if (this.broken) {
        return 'broken';
      }

      const percent = (this.durability / this.maxDurability) * 100;

      if (percent >= 90) return 'excellent';
      if (percent >= 70) return 'good';
      if (percent >= 50) return 'fair';
      if (percent >= 30) return 'poor';
      if (percent > 0) return 'terrible';
      return 'destroyed';
    },
    writable: false,
    enumerable: true,
    configurable: false
  }
});
