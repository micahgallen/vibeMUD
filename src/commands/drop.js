/**
 * drop command
 * Drop an item on the floor
 */

const Currency = require('../systems/currency');

module.exports = {
  id: "drop",
  name: "drop",
  aliases: [],
  category: "item",
  description: "Drop an item on the floor",
  usage: "drop <item> | drop <amount> <coin_type>",
  help: "Removes an item from your inventory and places it on the floor in your current room. For coins, use 'drop 10 gold' to drop coins from your purse.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Drop what?');
      return;
    }

    const player = session.player;

    // Check if player is a ghost
    if (player.isGhost) {
      session.sendLine(colors.error('You are a ghost and cannot drop items until you respawn!'));
      return;
    }

    const lowerArgs = args.toLowerCase().trim();

    // Check if this is a coin drop command (e.g., "10 gold", "5 silver coins")
    const coinMatch = lowerArgs.match(/^(\d+)\s+(\w+)(?:\s+coins?)?$/);
    if (coinMatch) {
      const amount = parseInt(coinMatch[1], 10);
      const denomName = coinMatch[2];

      // Check if it's a valid denomination
      const denom = Currency.findDenomination(denomName);
      if (denom) {
        this.handleDropCoins(session, amount, denom.name, entityManager, colors);
        return;
      }
    }

    // Check if dropping a quantity of an item (e.g., "drop 2 apple")
    const quantityMatch = lowerArgs.match(/^(\d+)\s+(.+)$/);
    let dropQuantity = null;
    let itemName = lowerArgs;

    if (quantityMatch) {
      dropQuantity = parseInt(quantityMatch[1], 10);
      itemName = quantityMatch[2];
    }

    // Find item in player inventory
    const item = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'inventory' &&
      obj.location?.owner === player.id &&
      obj.name.toLowerCase().includes(itemName)
    );

    if (!item) {
      session.sendLine('You don\'t have that.');
      return;
    }

    // Handle stack splitting if quantity specified and item is stackable
    try {
      if (dropQuantity && item.stackable && item.quantity > 1) {
        if (dropQuantity >= item.quantity) {
          // Dropping entire stack
          entityManager.move(item.id, {
            type: 'room',
            room: player.currentRoom
          });
          session.sendLine(colors.warning(`You drop ${item.getDisplayName()}.`));
        } else if (dropQuantity < 1) {
          session.sendLine('You must drop at least 1.');
          return;
        } else {
          // Split the stack
          const splitStack = item.split(dropQuantity, entityManager);
          if (splitStack) {
            // Move the split stack to the room
            entityManager.move(splitStack.id, {
              type: 'room',
              room: player.currentRoom
            });
            session.sendLine(colors.warning(`You drop ${splitStack.getDisplayName()}.`));
          } else {
            session.sendLine(colors.error('Unable to split that item.'));
          }
        }
      } else {
        // Drop entire item/stack
        entityManager.move(item.id, {
          type: 'room',
          room: player.currentRoom
        });
        const displayName = item.getDisplayName ? item.getDisplayName() : item.name;
        session.sendLine(colors.warning(`You drop ${displayName}.`));
      }
    } catch (error) {
      session.sendLine(colors.error(`Error: ${error.message}`));
    }
  },

  /**
   * Handle dropping coins from purse to room
   * Creates physical coin item in the room
   */
  handleDropCoins: function(session, amount, coinType, entityManager, colors) {
    const player = session.player;

    if (amount <= 0) {
      session.sendLine('You must drop at least 1 coin.');
      return;
    }

    // Create coin object to check/remove
    const coinsToRemove = Currency.createCoins(amount, coinType);

    // Check if player has enough
    if (!player.hasCoins(coinsToRemove)) {
      session.sendLine(`You don't have ${amount} ${coinType} coins.`);
      return;
    }

    try {
      // Remove from player's purse
      player.removeCoins(coinsToRemove, entityManager);

      // Create physical coin item in the room
      const coinItemId = `coins_${coinType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Load coin definition
      const coinDef = entityManager.loadDefinition('coin');
      const coinItem = Object.create(coinDef);

      Object.assign(coinItem, {
        id: coinItemId,
        type: 'item',
        definition: 'coin',
        coinType: coinType,
        quantity: amount,
        name: `${amount} ${coinType} coin${amount > 1 ? 's' : ''}`,
        location: {
          type: 'room',
          room: player.currentRoom
        },
        createdAt: new Date().toISOString()
      });

      // Register and add to room
      entityManager.objects.set(coinItemId, coinItem);
      entityManager.addToLocation(coinItem);

      // Notify player
      session.sendLine(colors.warning(`You drop ${Currency.format(coinsToRemove)}.`));

            // Notify room

            entityManager.notifyRoom(player.currentRoom,

              colors.dim(`${(player.capname || player.name)} drops some coins.`),

              player.id);

          } catch (error) {

            session.sendLine(colors.error(`Error: ${error.message}`));

          }
  }
};
