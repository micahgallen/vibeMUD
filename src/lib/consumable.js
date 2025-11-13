/**
 * Consumable Item Definition
 * For food, potions, scrolls, and other consumable items
 *
 * Inherits from: item.js
 * Inherited by: Templates like apple_001.json, potion_001.json
 */

const item = require('./item');

module.exports = Object.create(item, {
  // Override stackable for consumables - they should stack by default
  stackable: {
    value: true,
    writable: true,
    enumerable: true,
    configurable: true
  },

  itemType: {
    value: 'consumable',
    writable: false,
    enumerable: true,
    configurable: false
  },

  isConsumable: {
    value: true,
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Consume this item
   * @param {Object} consumer - The entity consuming (usually a player)
   * @param {Object} entityManager - The entity manager
   * @returns {Object} Result with success, message, and effects
   */
  consume: {
    value: function(consumer, entityManager) {
      const messages = [];
      let healed = 0;
      let manaRestored = 0;

      // Apply healing
      if (this.healAmount && consumer.hp !== undefined && consumer.maxHp !== undefined) {
        healed = Math.min(this.healAmount, consumer.maxHp - consumer.hp);
        consumer.hp += healed;
        entityManager.markDirty(consumer.id);

        if (healed > 0) {
          messages.push(`You heal ${healed} HP.`);
        }
      }

      // Apply mana restoration
      if (this.manaAmount && consumer.mana !== undefined && consumer.maxMana !== undefined) {
        manaRestored = Math.min(this.manaAmount, consumer.maxMana - consumer.mana);
        consumer.mana += manaRestored;
        entityManager.markDirty(consumer.id);

        if (manaRestored > 0) {
          messages.push(`You restore ${manaRestored} mana.`);
        }
      }

      // Apply status effects
      if (this.effects && Array.isArray(this.effects)) {
        this.applyEffects(consumer, entityManager);
        messages.push('You feel strange effects...');
      }

      // Handle stacking or destruction
      if (this.quantity && this.quantity > 1) {
        this.quantity--;
        entityManager.markDirty(this.id);
      } else {
        // Destroy the item instance
        entityManager.destroy(this.id);
      }

      const baseMessage = `You consume ${this.name}.`;
      const fullMessage = messages.length > 0
        ? `${baseMessage} ${messages.join(' ')}`
        : baseMessage;

      return {
        success: true,
        message: fullMessage,
        healed,
        manaRestored
      };
    },
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Apply status effects from consuming this item
   * @param {Object} consumer - The entity
   * @param {Object} entityManager - The entity manager
   */
  applyEffects: {
    value: function(consumer, entityManager) {
      if (!this.effects || !Array.isArray(this.effects)) {
        return;
      }

      // Apply each effect
      for (const effect of this.effects) {
        switch (effect.type) {
          case 'poison':
            // TODO: Implement poison system
            console.log(`Applied poison to ${consumer.id}`);
            break;

          case 'buff':
            // TODO: Implement buff system
            console.log(`Applied buff ${effect.name} to ${consumer.id}`);
            break;

          case 'debuff':
            // TODO: Implement debuff system
            console.log(`Applied debuff ${effect.name} to ${consumer.id}`);
            break;

          case 'instant_damage':
            if (effect.amount && consumer.hp !== undefined) {
              consumer.hp = Math.max(0, consumer.hp - effect.amount);
              entityManager.markDirty(consumer.id);
            }
            break;

          default:
            console.warn(`Unknown effect type: ${effect.type}`);
        }
      }
    },
    writable: false,
    enumerable: true,
    configurable: false
  }
});
