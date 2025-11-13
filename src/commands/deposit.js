/**
 * deposit command
 * Deposit coins from your purse into your bank account
 */

const Currency = require('../systems/currency');

module.exports = {
  id: 'deposit',
  name: 'deposit',
  aliases: ['dep'],
  category: 'banking',
  description: 'Deposit coins into your bank account',
  usage: 'deposit <amount> <type> | deposit all',
  help: 'Deposits coins from your purse into your bank account. Examples: deposit 100 gold | deposit all',
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    // Check if player is in a bank
    if (!room || !room.isBank) {
      session.sendLine('You must be at a bank to make a deposit.');
      return;
    }

    // Check bank access
    if (typeof room.canAccess === 'function') {
      const access = room.canAccess(player);
      if (!access.allowed) {
        session.sendLine(room.messages?.noAccess || 'You cannot use this bank.');
        return;
      }
    }

    // Check if deposit service is available
    if (room.services && !room.services.deposit) {
      session.sendLine('This bank does not offer deposit services.');
      return;
    }

    if (!args || args.trim() === '') {
      session.sendLine('Usage: deposit <amount> <type>');
      session.sendLine('   or: deposit all');
      session.sendLine('Examples:');
      session.sendLine('  deposit 100 gold');
      session.sendLine('  deposit 50 silver');
      session.sendLine('  deposit all');
      return;
    }

    const lowerArgs = args.trim().toLowerCase();

    let coinsToDeposit;

    // Handle "deposit all"
    if (lowerArgs === 'all') {
      coinsToDeposit = { ...player.purse.coins };
      const totalValue = Currency.totalValue(coinsToDeposit);

      if (totalValue === 0) {
        session.sendLine('You don\'t have any coins in your purse to deposit.');
        return;
      }
    } else {
      // Parse "deposit <amount> <type>"
      const parts = lowerArgs.split(/\s+/);

      if (parts.length < 2) {
        session.sendLine('Usage: deposit <amount> <type>');
        return;
      }

      const amount = parseInt(parts[0], 10);
      const denomName = parts[1];

      if (isNaN(amount) || amount <= 0) {
        session.sendLine('Amount must be a positive number.');
        return;
      }

      const denom = Currency.findDenomination(denomName);
      if (!denom) {
        const validDenoms = Currency.denominations.map(d => d.name).join(', ');
        session.sendLine(`Invalid coin type: ${denomName}`);
        session.sendLine(`Valid types: ${validDenoms}`);
        return;
      }

      coinsToDeposit = Currency.createCoins(amount, denom.name);
    }

    // Check if player has the coins
    if (!player.hasCoins(coinsToDeposit)) {
      session.sendLine('You don\'t have enough coins to deposit that amount.');
      return;
    }

    const depositValue = Currency.totalValue(coinsToDeposit);

    // Check minimum deposit
    if (room.minDeposit && depositValue < room.minDeposit) {
      const minCoins = Currency.breakdown(room.minDeposit);
      session.sendLine(`The minimum deposit is ${Currency.format(minCoins)}.`);
      return;
    }

    // Calculate fee
    let fee = 0;
    if (room.calculateFee) {
      fee = room.calculateFee(depositValue, 'deposit');
    }

    const netDeposit = depositValue - fee;

    // Check account balance limit
    if (room.maxBalance) {
      const currentBalance = player.bankAccount || 0;
      if (currentBalance + netDeposit > room.maxBalance) {
        const maxCoins = Currency.breakdown(room.maxBalance);
        session.sendLine(`Your account cannot hold that much. Maximum balance is ${Currency.format(maxCoins)}.`);
        return;
      }
    }

    try {
      // Remove coins from purse
      player.removeCoins(coinsToDeposit, entityManager);

      // Add to bank account
      player.bankAccount = (player.bankAccount || 0) + netDeposit;
      entityManager.markDirty(player.id);

      // Notify player
      const depositedCoins = Currency.breakdown(netDeposit);
      session.sendLine(colors.success(`You deposit ${Currency.format(coinsToDeposit)} into your account.`));

      if (fee > 0) {
        const feeCoins = Currency.breakdown(fee);
        session.sendLine(colors.warning(`A service fee of ${Currency.format(feeCoins)} was charged.`));
      }

      session.sendLine(colors.info(`New balance: ${Currency.format(Currency.breakdown(player.bankAccount))}`));

      // Teller message
      if (room.getTellerReaction) {
        const reaction = room.getTellerReaction('thanks');
        if (reaction) {
          session.sendLine(colors.dim(`${room.tellerName || 'The teller'} says: "${reaction}"`));
        }
      }

    } catch (error) {
      session.sendLine(colors.error(`Error: ${error.message}`));
    }
  }
};
