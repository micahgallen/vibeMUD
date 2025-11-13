/**
 * loot command
 * Loot items from a corpse
 */

module.exports = {
  id: "loot",
  name: "loot",
  aliases: [],
  category: "item",
  description: "Loot items from a corpse",
  usage: "loot [corpse name]",
  help: "Takes all items from a corpse. If you don't specify a corpse, it will loot your own corpse if present. Examples: loot | loot wumpy",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Check if player is a ghost
    if (player.isGhost) {
      session.sendLine(colors.error('You are a ghost and cannot loot until you respawn!'));
      return;
    }

    // Find corpses in the room
    const corpsesInRoom = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'container' &&
      obj.location?.type === 'room' &&
      obj.location?.room === player.currentRoom &&
      obj.name && obj.name.toLowerCase().includes('corpse')
    );

    if (corpsesInRoom.length === 0) {
      session.sendLine('There are no corpses here to loot.');
      return;
    }

    let targetCorpse = null;

    // If no args, try to find player's own corpse first
    if (!args || args.trim().length === 0) {
      targetCorpse = corpsesInRoom.find(corpse =>
        corpse.ownerId === player.id && corpse.ownerType === 'player'
      );

      // If no own corpse, loot the first available corpse
      if (!targetCorpse) {
        targetCorpse = corpsesInRoom[0];
      }
    } else {
      // Find corpse matching the target name
      const targetName = args.toLowerCase().trim();
      targetCorpse = corpsesInRoom.find(corpse =>
        corpse.name.toLowerCase().includes(targetName)
      );

      if (!targetCorpse) {
        session.sendLine(`You don't see '${args}' here.`);
        return;
      }
    }

    // Check if corpse has items
    if (!targetCorpse.inventory || targetCorpse.inventory.length === 0) {
      session.sendLine(`${targetCorpse.name} is empty.`);
      return;
    }

    try {
      // Count items
      const itemCount = targetCorpse.inventory.length;
      const itemNames = [];

      // Transfer all items to player's inventory
      for (const itemId of [...targetCorpse.inventory]) {
        const item = entityManager.get(itemId);
        if (item) {
          itemNames.push(item.name);

          // Check if item is stackable and player has an existing stack
          let stacked = false;
          if (item.stackable && item.canStackWith) {
            const existingStack = Array.from(entityManager.objects.values()).find(obj =>
              obj.type === 'item' &&
              obj.location?.type === 'inventory' &&
              obj.location?.owner === player.id &&
              obj.id !== item.id &&
              item.canStackWith(obj)
            );

            if (existingStack) {
              const success = existingStack.stackWith(item, entityManager);
              if (success) {
                stacked = true;
              }
            }
          }

          // If not stacked, move item normally
          if (!stacked) {
            entityManager.move(itemId, {
              type: 'inventory',
              owner: player.id
            });
          }
        }
      }

      // Check if this is the player's own corpse - if so, destroy it
      const isOwnCorpse = targetCorpse.ownerId === player.id && targetCorpse.ownerType === 'player';

      if (isOwnCorpse) {
        // Remove player's own corpse after looting
        entityManager.disableHeartbeat(targetCorpse.id);
        entityManager.removeFromLocation(targetCorpse);
        entityManager.objects.delete(targetCorpse.id);

        // Notify player
        session.sendLine(colors.success(`You reclaim your possessions from ${targetCorpse.name}.`));
        session.sendLine(colors.info(`You recovered ${itemCount} item${itemCount !== 1 ? 's' : ''}.`));
        session.sendLine(colors.dim(`The corpse crumbles to dust.`));

        // Notify room
        entityManager.notifyRoom(player.currentRoom,
          colors.dim(`${player.name} reclaims their possessions from ${targetCorpse.name}, which crumbles to dust.`),
          player.id);
      } else {
        // Looting someone else's corpse - leave it there
        session.sendLine(colors.success(`You loot ${targetCorpse.name}.`));
        session.sendLine(colors.info(`You took ${itemCount} item${itemCount !== 1 ? 's' : ''}:`));
        itemNames.forEach(name => {
          session.sendLine(colors.dim(`  - ${name}`));
        });

        // Notify room
        entityManager.notifyRoom(player.currentRoom,
          colors.dim(`${player.name} loots ${targetCorpse.name}.`),
          player.id);
      }

    } catch (error) {
      session.sendLine(colors.error(`Error: ${error.message}`));
    }
  }
};
