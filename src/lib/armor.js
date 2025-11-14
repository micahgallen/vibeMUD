/**
 * Armor Item Definition
 * For armor pieces that provide AC (Armor Class) protection
 *
 * Inherits from: item.js
 * Inherited by: Armor templates and instances
 *
 * D&D 5E Armor Classes:
 * - Light Armor: 11-12 AC + Dex modifier (leather, padded)
 * - Medium Armor: 13-15 AC + Dex modifier (max +2) (hide, chain shirt, scale mail)
 * - Heavy Armor: 16-18 AC (chain mail, plate)
 * - Shields: +2 AC bonus
 */

const item = require('./item');

module.exports = Object.create(item, {
  // Armor is not stackable
  stackable: {
    value: false,
    writable: false,
    enumerable: true,
    configurable: false
  },

  itemType: {
    value: 'armor',
    writable: false,
    enumerable: true,
    configurable: false
  },

  // Armor category (light, medium, heavy, shield)
  armorType: {
    value: 'light',
    writable: true,
    enumerable: true,
    configurable: true
  },

  // Base AC provided by this armor
  baseAC: {
    value: 11,
    writable: true,
    enumerable: true,
    configurable: true
  },

  // Maximum dexterity bonus allowed
  // null = unlimited, 0 = none, 2 = max +2
  maxDexBonus: {
    value: null,
    writable: true,
    enumerable: true,
    configurable: true
  },

  // Armor slot (head, chest, legs, hands, feet, shield)
  slot: {
    value: 'chest',
    writable: true,
    enumerable: true,
    configurable: true
  },

  // Durability
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

  /**
   * Calculate effective AC provided by this armor
   * @param {number} wearerDex - The wearer's dexterity score
   * @returns {number} - Total AC provided
   */
  getAC: {
    value: function(wearerDex = 10) {
      if (this.broken) {
        return 0; // Broken armor provides no protection
      }

      // For shields, just return the bonus
      if (this.armorType === 'shield') {
        return this.baseAC || 2;
      }

      // Calculate dexterity modifier
      const dexMod = Math.floor((wearerDex - 10) / 2);

      // Apply max dex bonus restriction
      let effectiveDexMod = dexMod;
      if (this.maxDexBonus !== null && this.maxDexBonus !== undefined) {
        effectiveDexMod = Math.min(dexMod, this.maxDexBonus);
      }

      return this.baseAC + effectiveDexMod;
    },
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Reduce armor durability from damage
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
          message: `${this.name} falls apart from damage!`
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
   * Repair the armor
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
   * Check if armor can be used
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
   * Get armor condition description
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
  },

  /**
   * Get armor type description
   * @returns {string}
   */
  getArmorTypeDescription: {
    value: function() {
      switch (this.armorType) {
        case 'light':
          return 'Light armor (full Dex bonus)';
        case 'medium':
          return `Medium armor (max +${this.maxDexBonus || 2} Dex bonus)`;
        case 'heavy':
          return 'Heavy armor (no Dex bonus)';
        case 'shield':
          return 'Shield';
        default:
          return 'Armor';
      }
    },
    writable: false,
    enumerable: true,
    configurable: false
  }
});
