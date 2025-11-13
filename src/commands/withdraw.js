/**
 * withdraw command
 * Withdraw coins from your bank account into your purse
 */

const Currency = require('../systems/currency');

module.exports = {
  id: 'withdraw',
  name: 'withdraw',
  aliases: ['with'],
  category: 'banking',
  description: 'Withdraw coins from your bank account',
  usage: 'withdraw <amount> <type> | withdraw all',
  help: 'Withdraws coins from your bank account into your purse. Examples: withdraw 100 gold | withdraw all',
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    // Check if player is in a bank
    if (!room || !room.isBank) {
      session.sendLine('You must be at a bank to make a withdrawal.');
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

    // Check if withdrawal service is available
    if (room.services && !room.services.withdraw) {
      session.sendLine('This bank does not offer withdrawal services.');
      return;
    }

    if (!args || args.trim() === '') {
      session.sendLine('Usage: withdraw <amount> <type>');
      session.sendLine('   or: withdraw all');
      session.sendLine('Examples:');
      session.sendLine('  withdraw 100 gold');
      session.sendLine('  withdraw 50 silver');
      session.sendLine('  withdraw all');
      return;
    }

    const lowerArgs = args.trim().toLowerCase();
    const currentBalance = player.bankAccount || 0;

    if (currentBalance === 0) {
      session.sendLine('Your bank account is empty.');
      return;
    }

    let withdrawValue;

    // Handle "withdraw all"
    if (lowerArgs === 'all') {
      withdrawValue = currentBalance;
    } else {
      // Parse "withdraw <amount> <type>"
      const parts = lowerArgs.split(/\s+/);

      if (parts.length < 2) {
        session.sendLine('Usage: withdraw <amount> <type>');
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

      const coinsRequested = Currency.createCoins(amount, denom.name);
      withdrawValue = Currency.totalValue(coinsRequested);
    }

    // Calculate fee
    let fee = 0;
    if (room.calculateFee) {
      fee = room.calculateFee(withdrawValue, 'withdraw');
    }

    const totalCost = withdrawValue + fee;

    // Check minimum withdrawal
    if (room.minWithdraw && withdrawValue < room.minWithdraw) {
      const minCoins = Currency.breakdown(room.minWithdraw);
      session.sendLine(`The minimum withdrawal is ${Currency.format(minCoins)}.`);
      return;
    }

    // Check if player has enough in account
    if (currentBalance < totalCost) {
      session.sendLine('You don\'t have enough coins in your account for that withdrawal.');
      const available = Currency.breakdown(currentBalance);
      session.sendLine(`Your balance: ${Currency.format(available)}`);
      return;
    }

    try {
      // Deduct from bank account (including fee)
      player.bankAccount = currentBalance - totalCost;

      // Add coins to purse (auto-converts to optimal denominations)
      const coinsToReceive = Currency.breakdown(withdrawValue);
      player.addCoins(coinsToReceive, entityManager);

      entityManager.markDirty(player.id);

      // Notify player
      session.sendLine(colors.success(`You withdraw ${Currency.format(coinsToReceive)} from your account.`));

      if (fee > 0) {
        const feeCoins = Currency.breakdown(fee);
        session.sendLine(colors.warning(`A service fee of ${Currency.format(feeCoins)} was charged.`));
      }

      const newBalance = Currency.breakdown(player.bankAccount);
      session.sendLine(colors.info(`New balance: ${Currency.format(newBalance)}`));

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
