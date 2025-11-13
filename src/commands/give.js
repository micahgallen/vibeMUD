/**
 * give command
 * Give items or coins to another player
 */

const Currency = require('../systems/currency');

module.exports = {
  id: 'give',
  name: 'give',
  aliases: ['pay'],
  category: 'player',
  description: 'Give items or coins to another player',
  usage: 'give <player> <item> | give <player> <amount> <coin_type>',
  help: 'Transfers an item from your inventory or coins from your purse to another player. Examples: give Alice sword | give Bob 10 gold',
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Usage: give <player> <item>');
      session.sendLine('   or: give <player> <amount> <coin_type>');
      session.sendLine('Examples:');
      session.sendLine('  give Alice sword');
      session.sendLine('  give Bob 10 gold');
      return;
    }

    const player = session.player;

    // Check if player is a ghost
    if (player.isGhost) {
      session.sendLine(colors.error('You are a ghost and cannot give items until you respawn!'));
      return;
    }

    const parts = args.trim().split(/\s+/);

    if (parts.length < 2) {
      session.sendLine('Usage: give <player> <item> or give <player> <amount> <coin_type>');
      return;
    }

    const targetName = parts[0];

    // Find target player
    const targetPlayer = entityManager.findPlayerByName(targetName);
    if (!targetPlayer) {
      session.sendLine(`Player '${targetName}' is not here or is not online.`);
      return;
    }

    // Check if trying to give to self
    if (targetPlayer.id === player.id) {
      session.sendLine('You cannot give things to yourself.');
      return;
    }

    // Check if in same room
    if (targetPlayer.currentRoom !== player.currentRoom) {
      session.sendLine(`${targetPlayer.name} is not in this room.`);
      return;
    }

    // Check if this is a coin transfer (pattern: <player> <amount> <type>)
    if (parts.length === 3) {
      const amountStr = parts[1];
      const amount = parseInt(amountStr, 10);

      if (!isNaN(amount) && amount > 0) {
        const denomName = parts[2];
        const denom = Currency.findDenomination(denomName);

        if (denom) {
          // This is a coin transfer
          this.handleGiveCoins(session, targetPlayer, amount, denom.name, entityManager, colors);
          return;
        }
      }
    }

    // Not a coin transfer - treat as item transfer
    const itemName = parts.slice(1).join(' ').toLowerCase();
    this.handleGiveItem(session, targetPlayer, itemName, entityManager, colors);
  },

  /**
   * Handle giving coins from purse to purse
   */
  handleGiveCoins: function(session, targetPlayer, amount, coinType, entityManager, colors) {
    const player = session.player;

    // Create coins object
    const coinsToGive = Currency.createCoins(amount, coinType);

    // Check if player has enough
    if (!player.hasCoins(coinsToGive)) {
      session.sendLine(`You don't have ${amount} ${coinType} coins to give.`);
      return;
    }

    try {
      // Transfer coins
      player.removeCoins(coinsToGive, entityManager);
      targetPlayer.addCoins(coinsToGive, entityManager);

      // Notify both players
      session.sendLine(colors.success(`You give ${Currency.format(coinsToGive)} to ${targetPlayer.name}.`));

      const targetSession = Array.from(entityManager.sessions.values()).find(s =>
        s.state === 'playing' && s.player && s.player.id === targetPlayer.id
      );

      if (targetSession) {
        targetSession.sendLine(colors.success(`${player.name} gives you ${Currency.format(coinsToGive)}.`));
      }

      // Notify room (excluding the two players involved)
      const playersInRoom = Array.from(entityManager.objects.values()).filter(obj =>
        obj.type === 'player' &&
        obj.currentRoom === player.currentRoom &&
        obj.id !== player.id &&
        obj.id !== targetPlayer.id
      );

      for (const otherPlayer of playersInRoom) {
        entityManager.notifyPlayer(otherPlayer.id,
          colors.dim(`${player.name} gives some coins to ${targetPlayer.name}.`)
        );
      }

    } catch (error) {
      session.sendLine(colors.error(`Error: ${error.message}`));
    }
  },

  /**
   * Handle giving an item from inventory
   */
  handleGiveItem: function(session, targetPlayer, itemName, entityManager, colors) {
    const player = session.player;

    // Find item in player's inventory
    const item = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'inventory' &&
      obj.location?.owner === player.id &&
      obj.name.toLowerCase().includes(itemName)
    );

    if (!item) {
      session.sendLine(`You don't have '${itemName}'.`);
      return;
    }

    try {
      // Transfer item using entityManager.move()
      entityManager.move(item.id, {
        type: 'inventory',
        owner: targetPlayer.id
      });

      // Notify both players
      session.sendLine(colors.success(`You give ${item.name} to ${targetPlayer.name}.`));

      const targetSession = Array.from(entityManager.sessions.values()).find(s =>
        s.state === 'playing' && s.player && s.player.id === targetPlayer.id
      );

      if (targetSession) {
        targetSession.sendLine(colors.success(`${player.name} gives you ${item.name}.`));
      }

      // Notify room (excluding the two players involved)
      entityManager.notifyRoom(player.currentRoom,
        colors.dim(`${player.name} gives something to ${targetPlayer.name}.`),
        [player.id, targetPlayer.id]  // Exclude both players
      );

    } catch (error) {
      session.sendLine(colors.error(`Error: ${error.message}`));
    }
  }
};
