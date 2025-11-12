/**
 * inventory command
 * Check your inventory
 */

module.exports = {
  id: "inventory",
  name: "inventory",
  aliases: ["i"],
  category: "basic",
  description: "Check your inventory",
  usage: "inventory",
  help: "Displays a list of all items you are currently carrying.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const items = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'inventory' &&
      obj.location?.owner === player.id
    );

    session.sendLine('');
    if (items.length === 0) {
      session.sendLine('You are not carrying anything.');
    } else {
      session.sendLine(colors.success('You are carrying:'));
      items.forEach(item => {
        const quantity = item.quantity ? ` (x${item.quantity})` : '';
        session.sendLine(`  ${item.name}${quantity}`);
      });
    }
    session.sendLine('');
  }
};
