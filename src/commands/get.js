/**
 * get command
 * Pick up an item from room or container
 */

module.exports = {
  id: "get",
  name: "get",
  aliases: ["take"],
  category: "item",
  description: "Pick up an item from room or container",
  usage: "get <item>",
  help: "Picks up an item from the room floor or from an open container and places it in your inventory.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Get what?');
      return;
    }

    const player = session.player;
    const itemName = args.toLowerCase();

    // Find item in current room
    let item = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'room' &&
      obj.location?.room === player.currentRoom &&
      obj.name.toLowerCase().includes(itemName)
    );

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

    // Move item to player inventory
    try {
      entityManager.move(item.id, {
        type: 'inventory',
        owner: player.id
      });
      session.sendLine(colors.success(`You pick up ${item.name}.`));
    } catch (error) {
      session.sendLine(colors.error(`Error: ${error.message}`));
    }
  }
};
