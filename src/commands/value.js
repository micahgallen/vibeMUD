/**
 * Value Command
 * Appraise an item to see what a shop will pay for it
 */

module.exports = {
  id: "value",
  name: "value",
  aliases: ["appraise", "estimate"],
  category: "commerce",
  description: "See what a shop will pay for an item",
  usage: "value <item name>",
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

    // Check if player specified what to appraise
    if (!args || args.trim() === '') {
      session.sendLine("What item do you want appraised?");
      return;
    }

    // Find the item in player's inventory
    const itemName = args.trim().toLowerCase();
    let itemToAppraise = null;

    if (player.inventory && player.inventory.length > 0) {
      for (const itemId of player.inventory) {
        const item = entityManager.get(itemId);
        if (item && item.name.toLowerCase().includes(itemName)) {
          itemToAppraise = item;
          break;
        }
      }
    }

    if (!itemToAppraise) {
      session.sendLine(colors.warning(room.messages?.noSuchItemToSell || "You don't have that item."));
      return;
    }

    // Appraise the item
    const appraisal = room.appraiseItem(itemToAppraise, player, keeper);

    if (appraisal.price === null) {
      // Shop won't buy it
      session.sendLine(colors.warning(appraisal.message));
      if (keeper) {
        session.sendLine(colors.npc(`${keeper.name} says: "${appraisal.message}"`));
      }
    } else {
      // Show the offer
      session.sendLine(colors.success(appraisal.message));
      if (keeper) {
        session.sendLine(colors.npc(`${keeper.name} says: "${appraisal.message}"`));
      }
      session.sendLine(colors.hint(`(Type 'sell ${itemToAppraise.name}' to complete the sale)`));
    }
  }
};
