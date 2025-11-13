/**
 * Bank Definition
 * Room definition that adds banking functionality
 * Any room can be a bank by referencing this definition or having bank properties
 */

module.exports = {
  type: 'room',
  name: 'A Bank',
  description: 'A secure establishment where adventurers can store their wealth.',
  exits: {},
  items: [],

  // Bank-specific properties
  isBank: true,

  /**
   * Bank services available
   * deposit: Allow coin deposits
   * withdraw: Allow coin withdrawals
   * balance: Allow balance checks
   * transfer: Allow transfers to other players (future feature)
   */
  services: {
    deposit: true,
    withdraw: true,
    balance: true,
    transfer: false  // Future feature
  },

  /**
   * Banking fees
   * depositFee: Percentage fee for deposits (0.0 = no fee)
   * withdrawFee: Percentage fee for withdrawals (0.0 = no fee)
   * minimumFee: Minimum fee in copper (even if percentage is lower)
   */
  depositFee: 0.0,      // No deposit fee
  withdrawFee: 0.0,     // No withdrawal fee
  minimumFee: 0,        // No minimum fee

  /**
   * Account limits
   * maxBalance: Maximum balance per account in copper (null = unlimited)
   * minDeposit: Minimum deposit amount in copper
   * minWithdraw: Minimum withdrawal amount in copper
   */
  maxBalance: null,     // Unlimited
  minDeposit: 1,        // At least 1 copper
  minWithdraw: 1,       // At least 1 copper

  /**
   * Bank hours
   * Array of [open, close] hour pairs (24-hour format)
   * null = always open
   */
  openHours: null,      // Always open

  /**
   * Access restrictions
   * Controls who can use this bank
   */
  accessRestrictions: {
    minLevel: 0,
    maxLevel: 999,
    allowedGuilds: [],    // Empty = all guilds
    bannedGuilds: [],
    allowedRaces: [],     // Empty = all races
    bannedRaces: []
  },

  /**
   * Teller personality
   * How the teller interacts with customers
   * Options: 'professional', 'friendly', 'grumpy', 'nervous'
   */
  tellerPersonality: 'professional',

  /**
   * Teller name (for flavor text)
   */
  tellerName: 'the bank teller',

  /**
   * Customizable bank messages
   */
  messages: {
    greeting: 'Welcome to the bank. Type "balance" to check your account, "deposit" to store coins, or "withdraw" to retrieve them.',
    noAccess: 'I\'m sorry, but you don\'t have access to our banking services.',
    closed: 'The bank is closed right now. Please come back during business hours.',
    depositSuccess: 'Thank you! I\'ve deposited %s into your account.',
    withdrawSuccess: 'Here you go. I\'ve withdrawn %s from your account.',
    balanceCheck: 'Your current balance is %s.',
    insufficientFunds: 'You don\'t have enough coins in your account for that withdrawal.',
    insufficientPurse: 'You don\'t have enough coins to deposit that amount.',
    amountTooLow: 'The minimum transaction amount is %s.',
    accountFull: 'Your account cannot hold that much. Maximum balance is %s.',
    invalidAmount: 'Please specify a valid amount.',
    emptyAccount: 'Your account is empty.',
    serviceFee: '(A service fee of %s has been applied.)'
  },

  /**
   * Bank security level
   * Higher security = safer from theft/hacking (future feature)
   */
  securityLevel: 5,  // 1-10 scale

  /**
   * Check if bank is currently open
   * @param {number} currentHour - Current game hour (0-23)
   * @returns {boolean}
   */
  isOpen: function(currentHour) {
    if (!this.openHours) return true;

    for (const [openTime, closeTime] of this.openHours) {
      if (currentHour >= openTime && currentHour < closeTime) {
        return true;
      }
    }
    return false;
  },

  /**
   * Check if a player can use this bank
   * @param {object} player - The player object
   * @returns {{allowed: boolean, reason: string}}
   */
  canAccess: function(player) {
    const restrictions = this.accessRestrictions;

    // Check level restrictions
    if (player.level < restrictions.minLevel) {
      return { allowed: false, reason: 'level_too_low' };
    }
    if (player.level > restrictions.maxLevel) {
      return { allowed: false, reason: 'level_too_high' };
    }

    // Check guild restrictions
    if (restrictions.bannedGuilds.length > 0 &&
        player.guild && restrictions.bannedGuilds.includes(player.guild)) {
      return { allowed: false, reason: 'guild_banned' };
    }
    if (restrictions.allowedGuilds.length > 0 &&
        (!player.guild || !restrictions.allowedGuilds.includes(player.guild))) {
      return { allowed: false, reason: 'guild_not_allowed' };
    }

    // Check race restrictions
    if (restrictions.bannedRaces.length > 0 &&
        player.race && restrictions.bannedRaces.includes(player.race)) {
      return { allowed: false, reason: 'race_banned' };
    }
    if (restrictions.allowedRaces.length > 0 &&
        (!player.race || !restrictions.allowedRaces.includes(player.race))) {
      return { allowed: false, reason: 'race_not_allowed' };
    }

    return { allowed: true };
  },

  /**
   * Calculate transaction fee
   * @param {number} amount - Transaction amount in copper
   * @param {string} type - 'deposit' or 'withdraw'
   * @returns {number} Fee in copper
   */
  calculateFee: function(amount, type) {
    const feeRate = type === 'deposit' ? this.depositFee : this.withdrawFee;
    let fee = Math.floor(amount * feeRate);

    // Apply minimum fee if set
    if (this.minimumFee > 0 && fee > 0 && fee < this.minimumFee) {
      fee = this.minimumFee;
    }

    return fee;
  },

  /**
   * Get teller reaction based on personality
   * @param {string} situation - The situation
   * @returns {string} Reaction message
   */
  getTellerReaction: function(situation) {
    const reactions = {
      professional: {
        greeting: 'Good day. How may I assist you with your account?',
        thanks: 'Thank you for banking with us.',
        goodbye: 'Have a pleasant day.',
        error: 'I apologize, but there seems to be an issue with that transaction.'
      },
      friendly: {
        greeting: 'Hey there! What can I do for you today?',
        thanks: 'Awesome! Thanks for stopping by!',
        goodbye: 'See you later! Come back soon!',
        error: 'Oops! Looks like something went wrong there.'
      },
      grumpy: {
        greeting: 'What do you want?',
        thanks: 'Yeah, whatever. Next!',
        goodbye: 'Finally.',
        error: '*sighs* That won\'t work.'
      },
      nervous: {
        greeting: 'Oh! H-hello. Um, how can I help you?',
        thanks: '*nervously counts coins* Y-yes, that should be right...',
        goodbye: 'B-bye now...',
        error: 'Oh dear! I-I think there\'s a problem...'
      }
    };

    const personality = this.tellerPersonality || 'professional';
    return reactions[personality]?.[situation] || reactions.professional[situation];
  }
};
