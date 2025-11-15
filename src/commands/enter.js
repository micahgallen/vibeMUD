/**
 * Enter Command
 *
 * Allows players to enter objects like booths, buildings, or other enterable containers.
 */

module.exports = {
  id: "enter",
  name: "enter",
  aliases: [],
  category: "movement",
  description: "Enter an object or location",
  usage: "enter <object>",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    if (!player) {
      session.send("Error: Player not found.\n");
      return;
    }

    // Get player's current room
    const currentRoom = entityManager.get(player.currentRoom);
    if (!currentRoom) {
      session.send("Error: You are not in a valid location.\n");
      return;
    }

    if (!args || args.trim() === '') {
      session.send("Enter what?\n");
      return;
    }

    const targetName = args.trim().toLowerCase();

    // Find enterable objects in the room
    const objectsInRoom = Array.from(entityManager.objects.values()).filter(obj =>
      obj.location?.type === 'room' &&
      obj.location?.room === currentRoom.id
    );

    // Find the target object
    let targetObject = null;
    for (const obj of objectsInRoom) {
      const name = obj.name?.toLowerCase() || '';
      const aliases = obj.aliases || [];

      if (name === targetName ||
          aliases.some(alias => alias.toLowerCase() === targetName) ||
          targetName === 'booth' && obj.type === 'booth_portal' ||
          targetName === 'transporter' && obj.type === 'booth_portal' ||
          targetName === 'transporter booth' && obj.type === 'booth_portal' ||
          targetName === 'elevator' && obj.type === 'elevator_portal' ||
          targetName === 'lift' && obj.type === 'elevator_portal' ||
          targetName === 'hot tub' && obj.type === 'hot_tub' ||
          targetName === 'hottub' && obj.type === 'hot_tub' ||
          targetName === 'tub' && obj.type === 'hot_tub' ||
          targetName === 'jacuzzi' && obj.type === 'hot_tub') {
        targetObject = obj;
        break;
      }
    }

    if (!targetObject) {
      session.send(`There is no ${args} to enter.\n`);
      return;
    }

    // Check if object is enterable by looking for a definition with enter method
    if (targetObject.definition) {
      try {
        const def = require(`../lib/${targetObject.definition}`);

        if (def.enter && typeof def.enter === 'function') {
          // Call enter method
          const result = def.enter.call(targetObject, player, entityManager);

          if (result.success) {
            // Notify the current room
            if (result.roomMessage) {
              entityManager.notifyRoom(currentRoom.id, result.roomMessage, player.id);
            }

            // Move player to destination
            entityManager.move(player.id, {
              type: 'room',
              room: result.destination
            });

            // Send message to player
            session.send(result.enterMessage + "\n");

            // Show new room
            const lookCommand = require('./look');
            lookCommand.execute(session, '', entityManager, colors);

            return;
          } else {
            session.send(colors.red + result.message + colors.reset + "\n");
            return;
          }
        }
      } catch (err) {
        // Definition doesn't exist or has no enter method
        console.error('Error loading definition for enter:', err);
        session.send(colors.red + `Error: ${err.message}` + colors.reset + "\n");
        return;
      }
    }

    session.send("You can't enter that.\n");
  }
};
