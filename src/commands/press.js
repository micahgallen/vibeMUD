/**
 * Press Command
 *
 * General-purpose command for pressing buttons, levers, switches, etc.
 * Delegates to object-specific press handlers.
 */

module.exports = {
  id: "press",
  name: "press",
  aliases: ["push"],
  category: "interaction",
  description: "Press a button, lever, or switch",
  usage: "press <button/object>",
  requiresLogin: true,

  execute: async function(session, args, entityManager, colors) {
    const player = session.player;
    if (!player) {
      session.send("Error: Player not found.\n");
      return;
    }

    if (!args || args.trim() === '') {
      session.send("Press what?\n");
      return;
    }

    const input = args.trim().toLowerCase();
    const currentRoom = entityManager.get(player.currentRoom);

    if (!currentRoom) {
      session.send("Error: You are not in a valid location.\n");
      return;
    }

    // Special handling for booth room buttons
    if (currentRoom.id === 'booth_room') {
      await this.handleBoothPress(player, input, currentRoom, session, entityManager, colors);
      return;
    }

    // Otherwise, look for pressable objects in the current room
    const objectsInRoom = Array.from(entityManager.objects.values()).filter(obj =>
      obj.location?.type === 'room' &&
      obj.location?.room === currentRoom.id
    );

    // Look for objects with press handlers
    for (const obj of objectsInRoom) {
      if (obj.definition) {
        try {
          const def = require(`../lib/${obj.definition}`);
          if (def.onPress) {
            // Check if this is the object being pressed
            const name = obj.name?.toLowerCase() || '';
            const aliases = obj.aliases || [];

            if (name.includes(input) || aliases.some(alias => alias.toLowerCase().includes(input))) {
              await def.onPress.call(obj, player, input, session, entityManager, colors);
              return;
            }
          }
        } catch (err) {
          // Definition doesn't exist or has no onPress
        }
      }
    }

    session.send("There's nothing here to press.\n");
  },

  /**
   * Handle pressing buttons in the booth room
   */
  async handleBoothPress(player, input, boothRoom, session, entityManager, colors) {
    // Parse button input (remove "button" if present)
    const buttonInput = input.replace(/^(button|buttons?)\s+/i, '').trim();

    if (!boothRoom.features || !boothRoom.features.buttons) {
      session.send("There are no buttons here.\n");
      return;
    }

    const buttons = boothRoom.features.buttons;

    // Find destination by number or name
    let destination = null;
    const buttonNum = parseInt(buttonInput);

    if (!isNaN(buttonNum) && buttonNum > 0 && buttonNum <= buttons.length) {
      destination = buttons[buttonNum - 1];
    } else {
      // Try to match by name
      destination = buttons.find(b =>
        b.name.toLowerCase() === buttonInput.toLowerCase() ||
        b.name.toLowerCase().includes(buttonInput)
      );
    }

    if (!destination) {
      session.send("There is no such button.\n");
      return;
    }

    // Transport sequence with flavor
    session.send(`You press the button for ${destination.name}.\n`);

    await this.delay(1000);
    session.send(colors.info("The camera begins to hum softly.") + "\n\n");

    await this.delay(3000);
    session.send(colors.warning("As you look down, you then notice that you are being broken down into\nsmall particles.") + "\n\n");

    await this.delay(2000);
    session.send(colors.highlight("You then feel a strange pulling sensation as you are sucked into the camera.") + "\n\n");

    await this.delay(1000);

    // Update the booth room's exit to point to the destination
    boothRoom.exits.out = destination.destination;
    entityManager.markDirty('booth_room');

    session.send(colors.success("Suddenly you are standing in a different booth.") + "\n\n");
    session.send(boothRoom.description + "\n");
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
