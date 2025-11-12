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

    // Check NPCs in room
    if (!target) {
      target = Array.from(entityManager.objects.values()).find(obj => {
        if (obj.type !== 'npc' || obj.currentRoom !== player.currentRoom) {
          return false;
        }

        // Check name
        if (obj.name.toLowerCase().includes(targetName)) {
          return true;
        }

        // Check keywords
        if (obj.keywords && Array.isArray(obj.keywords)) {
          return obj.keywords.some(keyword =>
            keyword.toLowerCase() === targetName ||
            keyword.toLowerCase().startsWith(targetName)
          );
        }

        return false;
      });
    }

    if (!target) {
      session.sendLine('You don\'t see that here.');
      return;
    }

    session.sendLine('');

    // Display name with appropriate color based on type
    if (target.type === 'npc') {
      session.sendLine(colors.npcName(target.name));
    } else if (target.type === 'item') {
      session.sendLine(colors.objectName(target.name));
    } else if (target.type === 'container') {
      session.sendLine(colors.objectName(target.name));
    } else {
      session.sendLine(colors.highlight(target.name));
    }

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
      session.sendLine(colors.magenta(`Status: ${status}`));

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

    if (target.type === 'npc') {
      if (target.level !== undefined) {
        session.sendLine(colors.info(`Level: ${target.level}`));
      }
      if (target.hp !== undefined && target.maxHp !== undefined) {
        const hpPercent = Math.round((target.hp / target.maxHp) * 100);
        let hpColor = colors.success;
        if (hpPercent < 30) hpColor = colors.error;
        else if (hpPercent < 60) hpColor = colors.warning;
        session.sendLine(hpColor(`Health: ${target.hp}/${target.maxHp}`));
      }
    }

    session.sendLine('');
  }
};
