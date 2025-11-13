/**
 * Coin Item Definition
 * Physical coins that exist in the world (on ground or in containers)
 * When picked up, coins are destroyed and value added to player's purse
 */

const Currency = require('../systems/currency');

module.exports = {
  type: 'item',
  itemType: 'currency',
  stackable: true,

  /**
   * Get display name with quantity
   * @returns {string} e.g., "15 gold coins" or "1 platinum coin"
   */
  getDisplayName: function() {
    const coinName = this.coinType || 'unknown';
    const plural = this.quantity !== 1 ? 's' : '';
    return `${this.quantity} ${coinName} coin${plural}`;
  },

  /**
   * Get full description
   * @returns {string} Descriptive text
   */
  getDescription: function() {
    const coinName = this.coinType || 'unknown';
    const plural = this.quantity !== 1 ? 's' : '';

    const descriptions = {
      platinum: 'gleaming platinum coin',
      gold: 'shiny gold coin',
      silver: 'silver coin',
      copper: 'copper coin'
    };

    const desc = descriptions[coinName] || 'coin';
    const article = this.quantity === 1 ? 'a ' : '';

    if (this.quantity === 1) {
      return `This is ${article}${desc}.`;
    } else {
      return `These are ${this.quantity} ${desc}${plural}.`;
    }
  },

  /**
   * Calculate weight of this coin stack
   * @returns {number} Total weight
   */
  getWeight: function() {
    const denom = Currency.findDenomination(this.coinType);
    if (!denom) return 0;
    return this.quantity * denom.weight;
  },

  /**
   * Get value in copper
   * @returns {number} Total value
   */
  getValue: function() {
    const denom = Currency.findDenomination(this.coinType);
    if (!denom) return 0;
    return this.quantity * denom.value;
  },

  /**
   * Can this coin stack merge with another item?
   * @param {Object} otherItem - Another item
   * @returns {boolean} True if they can stack
   */
  canStackWith: function(otherItem) {
    return otherItem.definition === 'coin' &&
           otherItem.coinType === this.coinType;
  },

  /**
   * Merge another coin stack into this one
   * @param {Object} otherCoin - Another coin item of same type
   */
  mergeWith: function(otherCoin) {
    if (!this.canStackWith(otherCoin)) {
      throw new Error('Cannot merge different coin types');
    }
    this.quantity += otherCoin.quantity;
  },

  /**
   * Split this stack into two stacks
   * @param {number} amount - Amount to split off
   * @returns {Object} Data for new coin stack
   * @throws {Error} If amount is invalid
   */
  split: function(amount) {
    if (amount <= 0 || amount >= this.quantity) {
      throw new Error('Invalid split amount');
    }

    this.quantity -= amount;

    // Return data for creating new coin item
    return {
      coinType: this.coinType,
      quantity: amount,
      definition: 'coin'
    };
  }
};
