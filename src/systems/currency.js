/**
 * Currency System
 * Handles multi-denomination currency with D&D style 1:10 conversion
 * 1 platinum = 10 gold = 100 silver = 1,000 copper
 */

const Currency = {
  // Denominations in descending value order (for auto-conversion)
  denominations: [
    { name: 'platinum', value: 1000, weight: 0.02 },
    { name: 'gold', value: 100, weight: 0.02 },
    { name: 'silver', value: 10, weight: 0.02 },
    { name: 'copper', value: 1, weight: 0.02 }
  ],

  // Starting money for new players
  startingMoney: {
    platinum: 0,
    gold: 5,
    silver: 10,
    copper: 50
  },

  /**
   * Convert all coin amounts into a single integer value (in copper)
   * @param {Object} coins - e.g., { copper: 5, silver: 2, gold: 1, platinum: 0 }
   * @returns {number} Total value in copper
   */
  totalValue: function(coins) {
    if (!coins) return 0;
    return (coins.copper || 0) +
           (coins.silver || 0) * 10 +
           (coins.gold || 0) * 100 +
           (coins.platinum || 0) * 1000;
  },

  /**
   * Convert a raw copper value into optimal denominations
   * @param {number} value - Total value in copper
   * @returns {Object} Coin breakdown { platinum, gold, silver, copper }
   */
  breakdown: function(value) {
    const coins = { platinum: 0, gold: 0, silver: 0, copper: 0 };
    let remainingValue = Math.floor(value);

    for (const denom of this.denominations) {
      coins[denom.name] = Math.floor(remainingValue / denom.value);
      remainingValue %= denom.value;
    }

    return coins;
  },

  /**
   * Add two coin sets and return auto-converted result
   * @param {Object} a - First coin set
   * @param {Object} b - Second coin set
   * @returns {Object} Combined and optimized coins
   */
  add: function(a, b) {
    const total = this.totalValue(a) + this.totalValue(b);
    return this.breakdown(total);
  },

  /**
   * Subtract coin set b from a, return optimized result
   * @param {Object} a - Starting coins
   * @param {Object} b - Coins to remove
   * @returns {Object} Remaining coins (optimized)
   * @throws {Error} If insufficient funds
   */
  subtract: function(a, b) {
    const total = this.totalValue(a) - this.totalValue(b);
    if (total < 0) {
      throw new Error('Insufficient funds');
    }
    return this.breakdown(total);
  },

  /**
   * Format coins as readable string
   * @param {Object} coins - Coin amounts
   * @returns {string} Formatted string like "5 platinum, 10 gold, 3 copper"
   */
  format: function(coins) {
    if (!coins) return 'no coins';

    const parts = [];
    for (const denom of this.denominations) {
      const amount = coins[denom.name] || 0;
      if (amount > 0) {
        parts.push(`${amount} ${denom.name}`);
      }
    }

    return parts.length > 0 ? parts.join(', ') : 'no coins';
  },

  /**
   * Calculate total weight of coins
   * @param {Object} coins - Coin amounts
   * @returns {number} Total weight (50 coins = 1.0 weight unit)
   */
  calculateWeight: function(coins) {
    if (!coins) return 0;

    let totalWeight = 0;
    for (const denom of this.denominations) {
      const amount = coins[denom.name] || 0;
      totalWeight += amount * denom.weight;
    }

    return totalWeight;
  },

  /**
   * Find denomination by name (case-insensitive, handles plurals)
   * @param {string} name - Denomination name (e.g., "gold", "silvers", "cp")
   * @returns {Object|null} Denomination object or null
   */
  findDenomination: function(name) {
    const lowerName = name.toLowerCase().trim();

    return this.denominations.find(d => {
      // Exact match
      if (d.name === lowerName) return true;
      // Plural form
      if (d.name + 's' === lowerName) return true;
      // Abbreviations
      if (d.name === 'platinum' && (lowerName === 'pp' || lowerName === 'plat')) return true;
      if (d.name === 'gold' && (lowerName === 'gp' || lowerName === 'g')) return true;
      if (d.name === 'silver' && (lowerName === 'sp' || lowerName === 's')) return true;
      if (d.name === 'copper' && (lowerName === 'cp' || lowerName === 'c')) return true;
      return false;
    }) || null;
  },

  /**
   * Create an empty coin purse
   * @returns {Object} Empty coin set
   */
  empty: function() {
    return { platinum: 0, gold: 0, silver: 0, copper: 0 };
  },

  /**
   * Check if purse has at least the specified amount
   * @param {Object} purse - Coin set to check
   * @param {Object} required - Required coin amounts
   * @returns {boolean} True if purse has enough
   */
  hasEnough: function(purse, required) {
    return this.totalValue(purse) >= this.totalValue(required);
  },

  /**
   * Create a specific coin set from amount and denomination
   * @param {number} amount - Number of coins
   * @param {string} denomination - Coin type (e.g., "gold")
   * @returns {Object} Coin set with specified amount
   */
  createCoins: function(amount, denomination) {
    const denom = this.findDenomination(denomination);
    if (!denom) {
      throw new Error(`Invalid denomination: ${denomination}`);
    }

    const coins = this.empty();
    coins[denom.name] = amount;
    return coins;
  }
};

module.exports = Currency;
