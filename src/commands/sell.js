/**
 * Sell Command
 * Sell items to a shop
 */

const { getDisplayName } = require('../utils/playerDisplay');
const Currency = require('../systems/currency');

module.exports = {
  id: "sell",
  name: "sell",
  aliases: [],
  category: "commerce",
  description: "Sell items to a shop",
  usage: "sell <item name>",
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

    // Check if player specified what to sell
    if (!args || args.trim() === '') {
      session.sendLine("What do you want to sell?");
      return;
    }

    // Find the item in player's inventory
    const itemName = args.trim().toLowerCase();
    let itemToSell = null;

    if (player.inventory && player.inventory.length > 0) {
      for (const itemId of player.inventory) {
        const item = entityManager.get(itemId);
        if (item && item.name.toLowerCase().includes(itemName)) {
          itemToSell = item;
          break;
        }
      }
    }

    if (!itemToSell) {
      session.sendLine(colors.warning(room.messages?.noSuchItemToSell || "You don't have that item."));
      return;
    }

    // Get the price the shop will pay
    const priceResult = room.getSellPrice(itemToSell, player, keeper);

    if (priceResult.price === null) {
      // Get the appropriate rejection message
      let message;
      switch (priceResult.reason) {
        case 'worthless':
          message = room.messages?.itemWorthless || "That item is worthless.";
          break;
        case 'noSell':
          message = room.messages?.noSell || "That item cannot be sold.";
          break;
        case 'broken':
          message = room.messages?.itemBroken || "That item is broken.";
          break;
        case 'depleted':
          message = room.messages?.itemBroken || "That item is depleted.";
          break;
        case 'noSellItem':
          message = room.messages?.noSellItem || "I don't buy that type of item.";
          break;
        default:
          message = "I can't buy that.";
      }
      session.sendLine(colors.warning(message));
      if (keeper) {
        session.sendLine(colors.npc(`${keeper.name} says: "${message}"`));
      }
      return;
    }

    const price = priceResult.price;

    // Check if shop has enough gold
    const saleResult = room.sellItemToShop(itemToSell, price, entityManager);
    if (!saleResult.success) {
      if (saleResult.reason === 'shopCantAfford') {
        session.sendLine(colors.warning(room.messages?.shopCantAfford || "The shop can't afford to buy that right now."));
        if (keeper) {
          session.sendLine(colors.npc(`${keeper.name} says: "I'm sorry, I don't have enough gold for that right now."`));
        }
      } else {
        session.sendLine(colors.error("The transaction failed."));
      }
      return;
    }

    // Store item display name before destroying it
    const soldItemName = itemToSell.name;

    // Destroy the item instance (shop absorbs it or adds to stock)
    entityManager.destroy(itemToSell.id);

    // Add money to player's purse
    const paymentCoins = Currency.breakdown(price);
    player.addCoins(paymentCoins, entityManager);

    // Success messages
    const paymentDisplay = Currency.format(paymentCoins);
    session.sendLine(colors.success(`You sell ${soldItemName} for ${paymentDisplay}.`));

    if (keeper) {
      // Replace price placeholder and remove "gold" suffix if present
      let message = room.messages?.successSell || `I'll give you ${paymentDisplay} for that.`;
      message = message.replace('%d gold', paymentDisplay).replace('%s gold', paymentDisplay).replace('%d', paymentDisplay).replace('%s', paymentDisplay);
      session.sendLine(colors.npc(`${keeper.name} says: "${message}"`));
      session.sendLine(colors.npc(`${keeper.name} says: "${room.getKeeperReaction('success')}"`));
    }

    // Notify room
    entityManager.notifyRoom(room.id,
      colors.dim(`${getDisplayName(player)} sells ${soldItemName}.`),
      player.id
    );
  }
};
