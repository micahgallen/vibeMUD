/**
 * balance command
 * Check your bank account balance
 */

const Currency = require('../systems/currency');

module.exports = {
  id: 'balance',
  name: 'balance',
  aliases: ['bankbalance'],
  category: 'banking',
  description: 'Check your bank account balance',
  usage: 'balance',
  help: 'Displays the current balance of your bank account. Must be used at a bank.',
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    // Check if player is in a bank
    if (!room || !room.isBank) {
      session.sendLine('You must be at a bank to check your balance.');
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

    // Check if bank is open
    // TODO: Add game time system for hour checking
    // For now, assume always open unless explicitly closed

    // Get player's bank balance
    const balance = player.bankAccount || 0;
    const balanceCoins = Currency.breakdown(balance);

    if (balance === 0) {
      session.sendLine(colors.info('Your bank account is empty.'));
      return;
    }

    // Display balance
    session.sendLine(colors.info('\n=== Bank Account ==='));
    session.sendLine(Currency.format(balanceCoins));
    session.sendLine(colors.dim(`Total value: ${balance} copper`));
    session.sendLine('');

    // Teller message (if room has personality)
    if (room.getTellerReaction) {
      const reaction = room.getTellerReaction('thanks');
      if (reaction && Math.random() < 0.3) {
        session.sendLine(colors.dim(`${room.tellerName || 'The teller'} says: "${reaction}"`));
      }
    }
  }
};
