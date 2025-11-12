/**
 * examine command
 * Examine an item or container closely
 */

module.exports = {
  id: "examine",
  name: "examine",
  aliases: ["x","ex"],
  category: "basic",
  description: "Examine an item or container closely",
  usage: "examine <thing>",
  help: "Provides detailed information about an item or container, including stats like durability, damage, value, and contents.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Examine what?');
      return;
    }

    const player = session.player;
    const targetName = args.toLowerCase();

    // Check inventory first
    let target = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'inventory' &&
      obj.location?.owner === player.id &&
      obj.name.toLowerCase().includes(targetName)
    );

    // Check room
    if (!target) {
      target = Array.from(entityManager.objects.values()).find(obj =>
        obj.type === 'item' &&
        obj.location?.type === 'room' &&
        obj.location?.room === player.currentRoom &&
        obj.name.toLowerCase().includes(targetName)
      );
    }

    // Check containers in room
    if (!target) {
      target = Array.from(entityManager.objects.values()).find(obj =>
        obj.type === 'container' &&
        obj.location?.type === 'room' &&
        obj.location?.room === player.currentRoom &&
        obj.name.toLowerCase().includes(targetName)
      );
    }

    if (!target) {
      session.sendLine('You don\'t see that here.');
      return;
    }

    session.sendLine('');
    session.sendLine(colors.bright + target.name + colors.reset);

    if (target.description) {
      session.sendLine(target.description);
    } else {
      session.sendLine('You see nothing special about it.');
    }

    // Show additional details
    if (target.type === 'item') {
      if (target.durability !== undefined) {
        session.sendLine(colors.info(`Durability: ${target.durability}%`));
      }
      if (target.damage !== undefined) {
        session.sendLine(colors.error(`Damage: ${target.damage}`));
      }
      if (target.value !== undefined) {
        session.sendLine(colors.warning(`Value: ${target.value} gold`));
      }
      if (target.quantity !== undefined && target.quantity > 1) {
        session.sendLine(colors.success(`Quantity: ${target.quantity}`));
      }
    }

    if (target.type === 'container') {
      const status = target.isOpen ? 'open' : 'closed';
      session.sendLine(colors.magenta + `Status: ${status}` + colors.reset);

      if (target.isOpen && target.inventory && target.inventory.length > 0) {
        session.sendLine('');
        session.sendLine('Contents:');
        target.inventory.forEach(itemId => {
          const item = entityManager.get(itemId);
          if (item) {
            session.sendLine(`  ${item.name}`);
          }
        });
      }
    }

    session.sendLine('');
  }
};
