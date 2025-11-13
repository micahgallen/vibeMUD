/**
 * Shop Definition
 * Room definition that adds shop/merchant functionality
 * Any room can be a shop by referencing this definition or having shop properties
 *
 * Based on CircleMUD shop system with vibeMUD enhancements
 * Integrated with vibeMUD currency system (copper-based)
 */

const Currency = require('../systems/currency');

module.exports = {
  type: 'room',
  name: 'A Shop',
  description: 'A small shop with various goods for sale.',
  exits: {},
  items: [],

  // Shop-specific properties
  isShop: true,

  /**
   * Items available for purchase
   * Array of objects: { itemId: string, price: number, stock: number, maxStock: number }
   * price: Price in copper (base currency)
   * stock: -1 means infinite (produced by shop)
   */
  merchandise: [],

  /**
   * Items the shop will buy from players
   * Array of item types/categories, or empty array for "buy nothing"
   * Examples: ['weapon', 'armor', 'potion', 'gem']
   * null or undefined means "buy anything"
   */
  buyTypes: null,

  /**
   * Price multipliers
   * sellRate: What fraction of value the shop pays when buying from players (0.5 = 50%)
   * buyRate: What multiplier the shop charges when selling to players (1.0 = 100% of value)
   */
  sellRate: 0.5,  // Shop pays 50% of item value when buying
  buyRate: 1.0,   // Shop charges 100% of item value when selling

  /**
   * Stat-based pricing modifier
   * If enabled, prices adjust based on stat difference (charisma, reputation, etc.)
   * Formula: price * (1 + (keeperStat - playerStat) / statDivisor)
   */
  useDynamicPricing: false,
  pricingStat: 'charisma',    // Which stat to use for pricing (charisma, reputation, etc.)
  pricingStatDivisor: 70,     // Higher = less price variation
  pricingStatFloor: 0.75,     // Minimum multiplier (25% discount max)
  pricingStatCeiling: 1.25,   // Maximum multiplier (25% markup max)

  /**
   * Shop finances (all values in copper)
   * Shopkeeper has limited money on hand and a bank account
   */
  keeperCopper: 10000,         // Copper currently available to shopkeeper (100 gold equivalent)
  bankCopper: 50000,           // Copper in the bank (500 gold equivalent)
  maxKeeperCopper: 20000,      // Max copper keeper holds before depositing to bank
  minKeeperCopper: 5000,       // Min copper before withdrawing from bank
  usesBank: true,              // If true, excess money goes to bank

  /**
   * Shop hours
   * Array of [open, close] hour pairs (24-hour format)
   * Examples:
   *   [[0, 24]]           - Always open
   *   [[9, 17]]           - 9am to 5pm
   *   [[9, 12], [14, 18]] - 9am-12pm and 2pm-6pm (closed for lunch)
   *   null                - Always open
   */
  openHours: null,

  /**
   * Trade restrictions
   * Controls who can shop here based on alignment, guild, race, etc.
   */
  tradeWith: {
    notAlignment: [],      // Alignments shop won't trade with: ['evil', 'good', 'neutral']
    onlyAlignment: [],     // If set, only these alignments can trade
    notGuild: [],          // Guilds shop won't trade with
    onlyGuild: [],         // If set, only these guilds can trade
    notRace: [],           // Races shop won't trade with
    onlyRace: [],          // If set, only these races can trade
    minLevel: 0,           // Minimum level to shop here
    maxLevel: 999,         // Maximum level to shop here
  },

  /**
   * Shopkeeper personality/temper
   * How the keeper reacts to various situations
   * Options: 'polite', 'grumpy', 'aggressive', 'passive'
   */
  keeperTemper: 'polite',

  /**
   * Shop currency (default: 'gold')
   * Could be extended for barter systems, faction currency, etc.
   */
  currency: 'gold',

  /**
   * Merchant name (if different from room NPC)
   * Used for flavor text in buy/sell interactions
   */
  merchantName: 'the shopkeeper',

  /**
   * Customizable shop messages
   * Override these for unique shop personalities
   */
  messages: {
    greeting: 'Welcome to my shop! Type "list" to see what I have for sale.',
    noSuchItem: "I don't have that item.",
    noSuchItemToSell: "You don't have that item.",
    cantAfford: "You don't have enough gold for that!",
    shopCantAfford: "I can't afford to buy that from you right now.",
    noSellItem: "I don't buy that sort of thing.",
    itemWorthless: "That thing is worthless!",
    itemBroken: "I won't buy broken items. Get it repaired first!",
    noSell: "I'm sorry, but that item cannot be sold.",
    successBuy: "That'll be %d gold. Thank you for your business!",
    successSell: "I'll give you %d gold for that.",
    closed: "Sorry, we're closed right now. Come back later!",
    notOpen: "We're not open yet. Come back later!",
    noTrade: "I don't do business with your kind.",
  },

  /**
   * Restock configuration
   * If set, shop restocks items on heartbeat
   */
  restockEnabled: false,
  restockInterval: 300, // seconds between restocks
  lastRestock: 0,

  /**
   * Shop heartbeat - handles restocking, banking, and merchant behavior
   */
  heartbeat: function(entityManager) {
    // Manage banking (move gold between keeper and bank)
    if (this.usesBank) {
      this._manageBanking(entityManager);
    }

    // Check for restocking
    if (this.restockEnabled && this.merchandise) {
      const now = Date.now() / 1000;
      const timeSinceRestock = now - (this.lastRestock || 0);

      if (timeSinceRestock >= this.restockInterval) {
        this._restock(entityManager);
        this.lastRestock = now;
        entityManager.markDirty(this.id);
      }
    }

    // Greet new arrivals (if merchant is chatty)
    if (this.messages.greeting && this.greetNewArrivals) {
      this._greetPlayers(entityManager);
    }
  },

  /**
   * Manage banking - move copper between keeper and bank account
   */
  _manageBanking: function(entityManager) {
    let needsSave = false;

    // Deposit excess copper to bank
    if (this.keeperCopper > this.maxKeeperCopper) {
      const excess = this.keeperCopper - this.maxKeeperCopper;
      this.bankCopper += excess;
      this.keeperCopper = this.maxKeeperCopper;
      needsSave = true;
    }

    // Withdraw from bank if running low
    if (this.keeperCopper < this.minKeeperCopper && this.bankCopper > 0) {
      const needed = this.minKeeperCopper - this.keeperCopper;
      const withdrawal = Math.min(needed, this.bankCopper);
      this.keeperCopper += withdrawal;
      this.bankCopper -= withdrawal;
      needsSave = true;
    }

    if (needsSave) {
      entityManager.markDirty(this.id);
    }
  },

  /**
   * Restock merchandise
   * Restores stock counts to their maximum values
   */
  _restock: function(entityManager) {
    if (!this.merchandise) return;

    let restocked = false;
    for (const item of this.merchandise) {
      if (item.maxStock && item.stock < item.maxStock) {
        item.stock = item.maxStock;
        restocked = true;
      }
    }

    if (restocked) {
      console.log(`  🏪 Shop ${this.id} restocked`);
      entityManager.notifyRoom(this.id,
        `\x1b[36m${this.merchantName} restocks the shelves.\x1b[0m`);
    }
  },

  /**
   * Greet players in the room
   */
  _greetPlayers: function(entityManager) {
    const players = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'player' && obj.currentRoom === this.id
    );

    // Simple implementation - could be extended with per-player tracking
    // to avoid greeting the same player repeatedly
    if (players.length > 0 && Math.random() < 0.1) {
      entityManager.notifyRoom(this.id,
        `\x1b[33m${this.merchantName} says: "${this.messages.greeting}"\x1b[0m`);
    }
  },

  /**
   * Check if shop is currently open based on game time
   * @param {number} currentHour - Current game hour (0-23)
   * @returns {boolean}
   */
  isOpen: function(currentHour) {
    if (!this.openHours) return true; // Always open if no hours specified

    for (const [openTime, closeTime] of this.openHours) {
      if (currentHour >= openTime && currentHour < closeTime) {
        return true;
      }
    }
    return false;
  },

  /**
   * Check if a player can trade with this shop
   * @param {object} player - The player object
   * @returns {{allowed: boolean, reason: string}}
   */
  canTradeWith: function(player) {
    const restrictions = this.tradeWith;

    // Check level restrictions
    if (player.level < restrictions.minLevel) {
      return { allowed: false, reason: 'level_too_low' };
    }
    if (player.level > restrictions.maxLevel) {
      return { allowed: false, reason: 'level_too_high' };
    }

    // Check alignment restrictions
    if (restrictions.notAlignment.length > 0 &&
        player.alignment && restrictions.notAlignment.includes(player.alignment)) {
      return { allowed: false, reason: 'alignment' };
    }
    if (restrictions.onlyAlignment.length > 0 &&
        (!player.alignment || !restrictions.onlyAlignment.includes(player.alignment))) {
      return { allowed: false, reason: 'alignment' };
    }

    // Check guild restrictions
    if (restrictions.notGuild.length > 0 &&
        player.guild && restrictions.notGuild.includes(player.guild)) {
      return { allowed: false, reason: 'guild' };
    }
    if (restrictions.onlyGuild.length > 0 &&
        (!player.guild || !restrictions.onlyGuild.includes(player.guild))) {
      return { allowed: false, reason: 'guild' };
    }

    // Check race restrictions
    if (restrictions.notRace.length > 0 &&
        player.race && restrictions.notRace.includes(player.race)) {
      return { allowed: false, reason: 'race' };
    }
    if (restrictions.onlyRace.length > 0 &&
        (!player.race || !restrictions.onlyRace.includes(player.race))) {
      return { allowed: false, reason: 'race' };
    }

    return { allowed: true };
  },

  /**
   * Calculate dynamic price modifier based on stats
   * @param {object} player - The player object
   * @param {object} keeper - The keeper object (NPC in room)
   * @returns {number} Price multiplier
   */
  _calculatePriceModifier: function(player, keeper) {
    if (!this.useDynamicPricing) return 1.0;

    const playerStat = player[this.pricingStat] || 10;
    const keeperStat = keeper ? (keeper[this.pricingStat] || 11) : 11;

    // Calculate modifier: price * (1 + (keeperStat - playerStat) / divisor)
    let modifier = 1.0 + (keeperStat - playerStat) / this.pricingStatDivisor;

    // Clamp to floor and ceiling
    modifier = Math.max(this.pricingStatFloor, Math.min(this.pricingStatCeiling, modifier));

    return modifier;
  },

  /**
   * Check if an item is in good condition for shop transactions
   * @param {object} item - The item object
   * @returns {{valid: boolean, reason: string}}
   */
  _checkItemCondition: function(item) {
    // Check if item has value
    if (!item.value || item.value <= 0) {
      return { valid: false, reason: 'worthless' };
    }

    // Check if item is flagged as no-sell
    if (item.noSell || item.bound || item.questItem) {
      return { valid: false, reason: 'noSell' };
    }

    // Check if item is broken/damaged
    if (item.broken || (item.durability !== undefined && item.durability <= 0)) {
      return { valid: false, reason: 'broken' };
    }

    // Check if item is depleted (wands, staves, charged items)
    if (item.charges !== undefined && item.maxCharges !== undefined) {
      if (item.charges <= 0) {
        return { valid: false, reason: 'depleted' };
      }
    }

    return { valid: true };
  },

  /**
   * Get the price to buy an item from the shop (player buying from shop)
   * @param {string} itemId - The item ID or merchandise entry
   * @param {object} player - The player object
   * @param {object} keeper - The keeper NPC (optional, for dynamic pricing)
   * @returns {number|null} The price, or null if not for sale
   */
  getPurchasePrice: function(itemId, player, keeper) {
    if (!this.merchandise) return null;

    const merch = this.merchandise.find(m => m.itemId === itemId);
    if (!merch) return null;
    if (merch.stock === 0) return null;

    let price = merch.price * this.buyRate;

    // Apply dynamic pricing if enabled
    if (player && this.useDynamicPricing) {
      const modifier = this._calculatePriceModifier(player, keeper);
      price = Math.floor(price * modifier);
    }

    return price;
  },

  /**
   * Get the price the shop will pay for an item (player selling to shop)
   * @param {object} item - The item object
   * @param {object} player - The player object (optional, for dynamic pricing)
   * @param {object} keeper - The keeper NPC (optional, for dynamic pricing)
   * @returns {{price: number|null, reason: string}} The price and reason, or null if shop won't buy
   */
  getSellPrice: function(item, player, keeper) {
    // Check item condition
    const condition = this._checkItemCondition(item);
    if (!condition.valid) {
      return { price: null, reason: condition.reason };
    }

    // Check if shop buys this type of item
    if (this.buyTypes !== null && this.buyTypes !== undefined) {
      if (!Array.isArray(this.buyTypes)) {
        return { price: null, reason: 'noSellItem' };
      }
      if (!this.buyTypes.includes(item.itemType || item.type)) {
        return { price: null, reason: 'noSellItem' };
      }
    }

    // Calculate base price
    const baseValue = item.value || 0;
    let price = Math.floor(baseValue * this.sellRate);

    // Apply dynamic pricing if enabled
    if (player && this.useDynamicPricing) {
      // When shop is buying, reverse the modifier
      let modifier = this._calculatePriceModifier(player, keeper);
      modifier = 2.0 - modifier; // Invert the modifier (1.2 becomes 0.8)
      price = Math.floor(price * modifier);
    }

    // Ensure sell price doesn't exceed buy price (prevent exploits)
    const buyPrice = this.getPurchasePrice(item.id, player, keeper);
    if (buyPrice && price > buyPrice) {
      price = buyPrice;
    }

    return { price, reason: 'ok' };
  },

  /**
   * Appraise an item - get shop's offer without committing to sell
   * @param {object} item - The item object
   * @param {object} player - The player object
   * @param {object} keeper - The keeper NPC
   * @returns {{price: number|null, message: string}}
   */
  appraiseItem: function(item, player, keeper) {
    const result = this.getSellPrice(item, player, keeper);

    if (result.price === null) {
      let message;
      switch (result.reason) {
        case 'worthless':
          message = this.messages.itemWorthless;
          break;
        case 'noSell':
          message = this.messages.noSell;
          break;
        case 'broken':
          message = this.messages.itemBroken;
          break;
        case 'depleted':
          message = this.messages.itemBroken;
          break;
        case 'noSellItem':
          message = this.messages.noSellItem;
          break;
        default:
          message = "I can't buy that.";
      }
      return { price: null, message };
    }

    const priceCoins = Currency.breakdown(result.price);
    return {
      price: result.price,
      message: `I'll give you ${Currency.format(priceCoins)} for that.`
    };
  },

  /**
   * Check if an item is in stock
   * @param {string} itemId - The item ID
   * @returns {boolean}
   */
  isInStock: function(itemId) {
    if (!this.merchandise) return false;

    const merch = this.merchandise.find(m => m.itemId === itemId);
    if (!merch) return false;

    return merch.stock === -1 || merch.stock > 0;
  },

  /**
   * Process a purchase transaction (player buying from shop)
   * @param {string} itemId - The item ID
   * @param {number} price - The agreed-upon price in copper
   * @param {object} entityManager - Entity manager
   * @returns {boolean} Success
   */
  purchaseItem: function(itemId, price, entityManager) {
    if (!this.merchandise) return false;

    const merch = this.merchandise.find(m => m.itemId === itemId);
    if (!merch) return false;
    if (merch.stock === 0) return false;

    // Reduce stock (unless infinite)
    if (merch.stock > 0) {
      merch.stock--;
    }

    // Add copper to shopkeeper
    this.keeperCopper += price;

    entityManager.markDirty(this.id);
    return true;
  },

  /**
   * Process a sale transaction (player selling to shop)
   * @param {object} item - The item object
   * @param {number} price - The agreed-upon price in copper
   * @param {object} entityManager - Entity manager
   * @returns {{success: boolean, reason: string}}
   */
  sellItemToShop: function(item, price, entityManager) {
    // Check if shop has enough copper (keeper + bank)
    const totalCopper = this.keeperCopper + (this.usesBank ? this.bankCopper : 0);
    if (totalCopper < price) {
      return { success: false, reason: 'shopCantAfford' };
    }

    // Deduct copper from keeper (withdraw from bank if needed)
    if (this.keeperCopper >= price) {
      this.keeperCopper -= price;
    } else {
      const fromKeeper = this.keeperCopper;
      const fromBank = price - fromKeeper;
      this.keeperCopper = 0;
      if (this.usesBank) {
        this.bankCopper -= fromBank;
      }
    }

    // Could optionally add item to shop's inventory here
    // For now, we assume items sold to shop are "absorbed"

    entityManager.markDirty(this.id);
    return { success: true, reason: 'ok' };
  },

  /**
   * Get a formatted list of merchandise for display
   * @param {object} player - The player (for dynamic pricing)
   * @param {object} keeper - The keeper NPC (for dynamic pricing)
   * @returns {Array} Array of {itemId, name, price, stock} objects
   */
  getMerchandiseList: function(player, keeper) {
    if (!this.merchandise) return [];

    return this.merchandise.map(merch => {
      const price = this.getPurchasePrice(merch.itemId, player, keeper);
      return {
        itemId: merch.itemId,
        price: price,
        stock: merch.stock === -1 ? 'Unlimited' : merch.stock,
        inStock: merch.stock === -1 || merch.stock > 0
      };
    }).filter(item => item.inStock);
  },

  /**
   * React to player based on shopkeeper temper
   * @param {string} situation - The situation ('broke', 'steal', 'success')
   * @returns {string} Reaction message
   */
  getKeeperReaction: function(situation) {
    const reactions = {
      polite: {
        broke: "I understand times are tough. Come back when you have the gold.",
        steal: "Please don't do that here!",
        success: "Thank you for your business!"
      },
      grumpy: {
        broke: "No money, no deal. Get out!",
        steal: "Thief! Guards!",
        success: "Yeah, yeah. Next!"
      },
      aggressive: {
        broke: "*spits* Get outta here, you broke fool!",
        steal: "*The shopkeeper lunges at you!*",
        success: "About time someone with gold showed up."
      },
      passive: {
        broke: "*shrugs* Come back later, I guess.",
        steal: "*looks away nervously*",
        success: "*nods quietly*"
      }
    };

    const temper = this.keeperTemper || 'polite';
    return reactions[temper]?.[situation] || reactions.polite[situation];
  },

  /**
   * Get the total value of the shop (merchandise + copper)
   * @returns {number} Total shop value in copper
   */
  getTotalValue: function() {
    let total = this.keeperCopper + (this.usesBank ? this.bankCopper : 0);

    if (this.merchandise) {
      for (const merch of this.merchandise) {
        if (merch.stock > 0) {
          total += merch.price * merch.stock;
        }
      }
    }

    return total;
  }

};
