/**
 * get command
 * Pick up an item from room or container
 */

const Currency = require('../systems/currency');

module.exports = {
  id: "get",
  name: "get",
  aliases: ["take"],
  category: "item",
  description: "Pick up an item from room or container",
  usage: "get <item> | get coins | get <type> coins",
  help: "Picks up an item from the room floor or from an open container. For coins, use 'get coins' to pick up all coins, or 'get gold coins' to pick up only gold coins.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Get what?');
      return;
    }

    const player = session.player;

    // Check if player is a ghost
    if (player.isGhost) {
      session.sendLine(colors.error('You are a ghost and cannot pick up items until you respawn!'));
      return;
    }

    const itemName = args.toLowerCase().trim();

    // Special handling for looting your own corpse
    if (itemName.includes('corpse') || itemName === 'all') {
      const myCorpse = Array.from(entityManager.objects.values()).find(obj =>
        obj.type === 'container' &&
        obj.location?.type === 'room' &&
        obj.location?.room === player.currentRoom &&
        obj.ownerId === player.id &&
        obj.ownerType === 'player'
      );

      if (myCorpse && myCorpse.inventory && myCorpse.inventory.length > 0) {
        // Loot your own corpse - transfer all items and destroy corpse
        this.handleLootOwnCorpse(session, myCorpse, entityManager, colors);
        return;
      }
    }

    // Special handling for coins
    if (itemName === 'coins' || itemName.endsWith(' coins') || itemName.endsWith(' coin')) {
      this.handleGetCoins(session, itemName, entityManager, colors);
      return;
    }

    // Find item in current room
    let item = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'room' &&
      obj.location?.room === player.currentRoom &&
      obj.name.toLowerCase().includes(itemName)
    );

    // If found item is a coin, route to coin handler
    if (item && item.definition === 'coin') {
      this.handleGetCoins(session, itemName, entityManager, colors);
      return;
    }

    // If not found in room, check open containers
    if (!item) {
      const openContainers = Array.from(entityManager.objects.values()).filter(obj =>
        obj.type === 'container' &&
        obj.location?.type === 'room' &&
        obj.location?.room === player.currentRoom &&
        obj.isOpen === true
      );

      for (const container of openContainers) {
        item = Array.from(entityManager.objects.values()).find(obj =>
          obj.type === 'item' &&
          obj.location?.type === 'container' &&
          obj.location?.owner === container.id &&
          obj.name.toLowerCase().includes(itemName)
        );
        if (item) break;
      }
    }

    if (!item) {
      session.sendLine('You don\'t see that here.');
      return;
    }

    // Double-check: if found item is a coin (from container), route to coin handler
    if (item.definition === 'coin') {
      this.handleGetCoins(session, itemName, entityManager, colors);
      return;
    }

    // Check if item is stackable and player has an existing stack
    try {
      let stacked = false;
      if (item.stackable && item.canStackWith) {
        // Look for existing stack in player inventory
        const existingStack = Array.from(entityManager.objects.values()).find(obj =>
          obj.type === 'item' &&
          obj.location?.type === 'inventory' &&
          obj.location?.owner === player.id &&
          obj.id !== item.id &&
          item.canStackWith(obj)
        );

        if (existingStack) {
          // Stack with existing item
          const displayName = item.getDisplayName ? item.getDisplayName() : item.name;
          const success = existingStack.stackWith(item, entityManager);
          if (success) {
            session.sendLine(colors.success(`You pick up ${displayName}.`));
            stacked = true;
          }
        }
      }

      // If not stacked, move item to inventory normally
      if (!stacked) {
        entityManager.move(item.id, {
          type: 'inventory',
          owner: player.id
        });
        const displayName = item.getDisplayName ? item.getDisplayName() : item.name;
        session.sendLine(colors.success(`You pick up ${displayName}.`));
      }
    } catch (error) {
      session.sendLine(colors.error(`Error: ${error.message}`));
    }
  },

  /**
   * Handle picking up coins from the room
   * Coins are destroyed and added to player's purse
   */
  handleGetCoins: function(session, itemName, entityManager, colors) {
    const player = session.player;

    // Determine which coin type (if specific)
    let specificType = null;
    if (itemName !== 'coins' && itemName !== 'coin') {
      // Extract coin type from "gold coins", "platinum coin", etc.
      const parts = itemName.split(/\s+/);
      if (parts.length >= 2) {
        const denom = Currency.findDenomination(parts[0]);
        if (denom) {
          specificType = denom.name;
        }
      }
    }

    // Find all coin items in the room
    const coinsInRoom = Array.from(entityManager.objects.values()).filter(obj =>
      obj.definition === 'coin' &&
      obj.location?.type === 'room' &&
      obj.location?.room === player.currentRoom &&
      (specificType === null || obj.coinType === specificType)
    );

    if (coinsInRoom.length === 0) {
      session.sendLine(specificType ?
        `You don't see any ${specificType} coins here.` :
        'You don\'t see any coins here.');
      return;
    }

    // Calculate total coins being picked up
    const totalCoins = Currency.empty();
    for (const coinItem of coinsInRoom) {
      totalCoins[coinItem.coinType] += coinItem.quantity;
    }

    // Add to player's purse (auto-converts)
    try {
      player.addCoins(totalCoins, entityManager);

      // Remove coin items from the world
      for (const coinItem of coinsInRoom) {
        entityManager.removeFromLocation(coinItem);
        entityManager.objects.delete(coinItem.id);
      }

      // Notify player
      session.sendLine(colors.success(`You pick up ${Currency.format(totalCoins)} and add them to your purse.`));

      // Notify room
      entityManager.notifyRoom(player.currentRoom,
        colors.dim(`${player.name} picks up some coins.`),
        player.id);

    } catch (error) {
      session.sendLine(colors.error(`Error: ${error.message}`));
    }
  },

  /**
   * Handle looting your own corpse
   * Transfers all items and despawns the corpse
   */
  handleLootOwnCorpse: function(session, corpse, entityManager, colors) {
    const player = session.player;

    try {
      // Count items
      const itemCount = corpse.inventory.length;

      // Transfer all items to player's inventory
      for (const itemId of [...corpse.inventory]) {
        entityManager.move(itemId, {
          type: 'inventory',
          owner: player.id
        });
      }

      // Remove corpse from world
      entityManager.disableHeartbeat(corpse.id);
      entityManager.removeFromLocation(corpse);
      entityManager.objects.delete(corpse.id);

      // Notify player
      session.sendLine(colors.success(`You reclaim your possessions from ${corpse.name}.`));
      session.sendLine(colors.info(`You recovered ${itemCount} item${itemCount !== 1 ? 's' : ''}.`));
      session.sendLine(colors.dim(`The corpse crumbles to dust.`));

      // Notify room
      entityManager.notifyRoom(player.currentRoom,
        colors.dim(`${player.name} reclaims their possessions from ${corpse.name}, which crumbles to dust.`),
        player.id);

    } catch (error) {
      session.sendLine(colors.error(`Error: ${error.message}`));
    }
  }
};
