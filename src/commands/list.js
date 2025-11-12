/**
 * List Command
 * Shows merchandise available for purchase in a shop
 */

module.exports = {
  id: "list",
  name: "list",
  aliases: ["shop", "wares"],
  category: "commerce",
  description: "List items for sale in a shop",
  usage: "list",
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
      // TODO: Get current game hour from time system
      // For now, assume always open
      const currentHour = 12; // Placeholder
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

    // Get merchandise list
    const merchandise = room.getMerchandiseList(player, keeper);

    if (!merchandise || merchandise.length === 0) {
      session.sendLine("There is nothing for sale here right now.");
      return;
    }

    // Build the display
    let output = [];
    output.push(colors.line(55, '═', colors.MUD_COLORS.CYAN));
    output.push(colors.roomName('  ' + (room.name || "Shop")));
    output.push(colors.line(55, '═', colors.MUD_COLORS.CYAN));
    output.push('');
    output.push(colors.colorize(' #   Item                                    Stock    Price', colors.ANSI.WHITE));
    output.push(colors.line(55, '─', colors.MUD_COLORS.CYAN));

    merchandise.forEach((item, index) => {
      // Get the actual item object for details
      const itemObj = entityManager.get(item.itemId);
      const itemName = itemObj ? itemObj.name : item.itemId;
      const paddedName = itemName.padEnd(35);
      const paddedStock = String(item.stock).padStart(8);
      const price = item.price || 0;
      const paddedPrice = String(price).padStart(6);

      output.push(`${colors.objectName('[' + (index + 1).toString().padStart(2) + ']')} ${paddedName} ${colors.colorize(paddedStock, colors.ANSI.WHITE)}   ${colors.success(paddedPrice + 'g')}`);
    });

    output.push(colors.line(55, '═', colors.MUD_COLORS.CYAN));
    output.push(colors.hint("Type 'buy <number>' to purchase an item"));
    output.push(colors.hint("Type 'value <item>' to see what the shop will pay for your items"));

    session.sendLine('');
    session.sendLine(output.join('\n'));
    session.sendLine('');
  }
};
