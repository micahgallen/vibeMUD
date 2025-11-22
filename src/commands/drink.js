/**
 * Drink Command
 * Consume beverages and potions
 */

module.exports = {
  id: "drink",
  name: "drink",
  aliases: ["quaff", "sip"],
  category: "basic",
  description: "Drink beverages, potions, or other liquids",
  usage: "drink <item>",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    if (!player) {
      session.sendLine("Error: Player not found.");
      return;
    }

    if (!args || args.trim() === '') {
      session.sendLine("Drink what?");
      return;
    }

    const itemName = args.trim().toLowerCase();

    // Find the item in player's inventory
    const inventory = Array.from(entityManager.objects.values()).filter(obj =>
      obj.location?.type === 'inventory' && obj.location?.owner === player.id
    );

    const item = inventory.find(obj =>
      obj.name && obj.name.toLowerCase().includes(itemName)
    );

    if (!item) {
      session.sendLine(`You don't have '${itemName}'.`);
      return;
    }

    // Check if item is consumable
    if (!item.isConsumable && typeof item.consume !== 'function') {
      session.sendLine(`You can't drink ${item.name}!`);
      return;
    }

    // Consume the item
    const result = item.consume(player, entityManager);

    if (result.success) {
      session.sendLine(colors.green(result.message));

      // Notify room
      if (player.currentRoom) {
        const action = item.alcoholic ? "downs" : "drinks";
        entityManager.notifyRoom(
          player.currentRoom,
          `${colors.cyan(player.capname || player.name)} ${action} ${item.name}.`,
          player.id
        );
      }
    } else {
      session.sendLine(colors.red(result.message || "Failed to drink the item."));
    }
  }
};
