/**
 * Buy Command
 * Purchase items from a shop
 */

const { getDisplayName } = require('../utils/playerDisplay');
const Currency = require('../systems/currency');

module.exports = {
  id: "buy",
  name: "buy",
  aliases: ["purchase"],
  category: "commerce",
  description: "Buy items from a shop",
  usage: "buy <item number or name>",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    if (!room) {
      session.sendLine("You are nowhere.");
      return;
    }

    // Check if this is a shop
    if (!room.isShop) {
      session.sendLine("This is not a shop.");
      return;
    }

    // Get the shopkeeper NPC (for dynamic pricing)
    let keeper = null;
    if (room.npcs && room.npcs.length > 0) {
      keeper = entityManager.get(room.npcs[0]);
    }

    // Check if shop is open
    if (room.openHours) {
      const currentHour = 12; // TODO: Get from time system
      if (!room.isOpen(currentHour)) {
        session.sendLine(colors.warning(room.messages?.closed || "The shop is closed right now."));
        return;
      }
    }

    // Check trade restrictions
    const tradeCheck = room.canTradeWith(player);
    if (!tradeCheck.allowed) {
      session.sendLine(colors.warning(room.messages?.noTrade || "You cannot trade here."));
      return;
    }

    // Check if player specified what to buy
    if (!args || args.trim() === '') {
      session.sendLine("What do you want to buy? Type 'list' to see available items.");
      return;
    }

    // Get merchandise list
    const merchandise = room.getMerchandiseList(player, keeper);
    if (!merchandise || merchandise.length === 0) {
      session.sendLine("There is nothing for sale here right now.");
      return;
    }

    // Parse the argument - could be a number or item name
    let selectedItem = null;
    const argLower = args.trim().toLowerCase();

    // Try parsing as number (1-indexed for user)
    const itemNumber = parseInt(argLower);
    if (!isNaN(itemNumber) && itemNumber > 0 && itemNumber <= merchandise.length) {
      selectedItem = merchandise[itemNumber - 1];
    } else {
      // Try matching by name
      for (const merchItem of merchandise) {
        const itemObj = entityManager.get(merchItem.itemId);
        if (itemObj && itemObj.name.toLowerCase().includes(argLower)) {
          selectedItem = merchItem;
          break;
        }
      }
    }

    if (!selectedItem) {
      session.sendLine(colors.warning(room.messages?.noSuchItem || "That item is not available."));
      return;
    }

    // Get the actual item object
    const itemTemplate = entityManager.get(selectedItem.itemId);
    if (!itemTemplate) {
      session.sendLine(colors.error("Item template not found."));
      return;
    }

    // Check stock
    if (!room.isInStock(selectedItem.itemId)) {
      session.sendLine(colors.warning("That item is out of stock."));
      return;
    }

    // Get price
    const price = room.getPurchasePrice(selectedItem.itemId, player, keeper);
    if (price === null) {
      session.sendLine(colors.warning(room.messages?.noSuchItem || "That item is not for sale."));
      return;
    }

    // Check if player has enough money in purse
    const playerCopper = Currency.totalValue(player.purse?.coins || {});
    if (playerCopper < price) {
      const priceCoins = Currency.breakdown(price);
      session.sendLine(colors.warning(`You need ${Currency.format(priceCoins)} but only have ${Currency.format(player.purse.coins)}.`));
      if (keeper) {
        session.sendLine(colors.npc(`${keeper.name} says: "${room.getKeeperReaction('broke')}"`));
      }
      return;
    }

    // Check if player already has a stackable item of the same template
    let existingStack = null;
    if (itemTemplate.stackable && player.inventory && player.inventory.length > 0) {
      for (const itemId of player.inventory) {
        const item = entityManager.get(itemId);
        // Check if they share the same prototype (same template)
        if (item && item.__proto__ === itemTemplate) {
          existingStack = item;
          break;
        }
      }
    }

    // Process the transaction first
    if (!room.purchaseItem(selectedItem.itemId, price, entityManager)) {
      session.sendLine("Error: Transaction failed.");
      return;
    }

    // Deduct money from player's purse
    const paymentCoins = Currency.breakdown(price);
    player.removeCoins(paymentCoins, entityManager);

    // Either stack with existing item or clone a new instance
    let newItemId;
    if (existingStack) {
      // Stack with existing item
      existingStack.quantity = (existingStack.quantity || 1) + 1;
      entityManager.markDirty(existingStack.id);
      newItemId = existingStack.id;
    } else {
      // Clone a new instance from the template
      const newInstance = entityManager.clone(itemTemplate.id, {
        location: { type: 'inventory', owner: player.id },
        quantity: itemTemplate.stackable ? 1 : undefined
      });
      newItemId = newInstance.id;
    }

    // Success messages
    const priceDisplay = Currency.format(paymentCoins);
    session.sendLine(colors.success(`You buy ${itemTemplate.name} for ${priceDisplay}.`));

    if (keeper) {
      // Replace price placeholder and remove "gold" suffix if present
      let message = room.messages?.successBuy || `That'll be ${priceDisplay}. Thank you for your business!`;
      message = message.replace('%d gold', priceDisplay).replace('%s gold', priceDisplay).replace('%d', priceDisplay).replace('%s', priceDisplay);
      session.sendLine(colors.npc(`${keeper.name} says: "${message}"`));
    }

    // Notify room
    entityManager.notifyRoom(room.id,
      colors.dim(`${getDisplayName(player)} buys ${itemTemplate.name}.`),
      player.id
    );
  }
};
