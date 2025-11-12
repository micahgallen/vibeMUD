/**
 * drop command
 * Drop an item on the floor
 */

module.exports = {
  id: "drop",
  name: "drop",
  aliases: [],
  category: "item",
  description: "Drop an item on the floor",
  usage: "drop <item>",
  help: "Removes an item from your inventory and places it on the floor in your current room.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Drop what?');
      return;
    }

    const player = session.player;
    const itemName = args.toLowerCase();

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

    // Move item to room
    try {
      entityManager.move(item.id, {
        type: 'room',
        room: player.currentRoom
      });
      session.sendLine(colors.yellow + `You drop ${item.name}.` + colors.reset);
    } catch (error) {
      session.sendLine(colors.red + `Error: ${error.message}` + colors.reset);
    }
  }
};
