/**
 * coins command
 * Display the contents of your purse
 */

const Currency = require('../systems/currency');
const Weight = require('../systems/weight');

module.exports = {
  id: 'coins',
  name: 'coins',
  aliases: ['money', 'purse', 'wealth'],
  category: 'player',
  description: 'Display the contents of your purse',
  usage: 'coins',
  help: 'Shows how many coins you are carrying in your purse and their total value.',
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    if (!player.purse || !player.purse.coins) {
      session.sendLine('You have no purse! Something is very wrong...');
      return;
    }

    const coins = player.purse.coins;
    const totalValue = Currency.totalValue(coins);
    const coinWeight = Currency.calculateWeight(coins);

    // Display purse contents
    session.sendLine(colors.info('\n=== Your Purse ==='));
    session.sendLine(Currency.format(coins));
    session.sendLine(colors.dim(`Total value: ${totalValue} copper`));
    session.sendLine(colors.dim(`Weight: ${Weight.formatWeight(coinWeight)} lbs`));

    // Show bank balance if player has one
    if (player.bankAccount !== undefined && player.bankAccount > 0) {
      session.sendLine(colors.info(`\nBank balance: ${Currency.format(Currency.breakdown(player.bankAccount))}`));
      session.sendLine(colors.dim(`(${player.bankAccount} copper)`));
    }

    session.sendLine('');
  }
};
