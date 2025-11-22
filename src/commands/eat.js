/**
 * Eat Command
 * Consume food items
 */

module.exports = {
  id: "eat",
  name: "eat",
  aliases: ["consume"],
  category: "basic",
  description: "Eat food to restore health or gain effects",
  usage: "eat <item>",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    if (!player) {
      session.sendLine("Error: Player not found.");
      return;
    }

    if (!args || args.trim() === '') {
      session.sendLine("Eat what?");
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
      session.sendLine(`You can't eat ${item.name}!`);
      return;
    }

    // Consume the item
    const result = item.consume(player, entityManager);

    if (result.success) {
      session.sendLine(colors.green(result.message));

      // Notify room
      if (player.currentRoom) {
        entityManager.notifyRoom(
          player.currentRoom,
          `${colors.cyan(player.capname || player.name)} eats ${item.name}.`,
          player.id
        );
      }
    } else {
      session.sendLine(colors.red(result.message || "Failed to eat the item."));
    }
  }
};
