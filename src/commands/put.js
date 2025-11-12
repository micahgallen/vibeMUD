/**
 * put command
 * Put item in container
 */

module.exports = {
  id: "put",
  name: "put",
  aliases: [],
  category: "item",
  description: "Put item in container",
  usage: "put <item> in <container>",
  help: "Takes an item from your inventory and places it inside a container. The container must be open.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args || !args.includes(' in ')) {
      session.sendLine('Usage: put <item> in <container>');
      return;
    }

    const player = session.player;
    const [itemPart, containerPart] = args.split(' in ').map(s => s.trim().toLowerCase());

    // Find item in player inventory
    const item = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'inventory' &&
      obj.location?.owner === player.id &&
      obj.name.toLowerCase().includes(itemPart)
    );

    if (!item) {
      session.sendLine('You don\'t have that item.');
      return;
    }

    // Find container in room
    const container = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'container' &&
      obj.location?.type === 'room' &&
      obj.location?.room === player.currentRoom &&
      obj.name.toLowerCase().includes(containerPart)
    );

    if (!container) {
      session.sendLine('You don\'t see that container here.');
      return;
    }

    if (!container.isOpen) {
      session.sendLine('The container is closed.');
      return;
    }

    // Move item to container
    try {
      entityManager.move(item.id, {
        type: 'container',
        owner: container.id
      });
      session.sendLine(colors.green + `You put ${item.name} in ${container.name}.` + colors.reset);
    } catch (error) {
      session.sendLine(colors.red + `Error: ${error.message}` + colors.reset);
    }
  }
};
