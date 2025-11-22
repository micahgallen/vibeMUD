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

    // Special handling for elevator room buttons
    if (currentRoom.id === 'elevator_room') {
      await this.handleElevatorPress(player, input, currentRoom, session, entityManager, colors);
      return;
    }

    // Special handling for hot tub room buttons
    if (currentRoom.id === 'hot_tub_room') {
      await this.handleHotTubPress(player, input, currentRoom, session, entityManager, colors);
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
    const playerDisplayName = (player.capname || player.name);

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

    // Transport sequence with flavor - broadcast to room
    entityManager.notifyRoom(boothRoom.id, `${playerDisplayName} presses the button for ${destination.name}.`);
    session.send(`You press the button for ${destination.name}.\n`);

    await this.delay(1000);
    entityManager.notifyRoom(boothRoom.id, colors.info("The camera begins to hum softly."));
    session.send(colors.info("The camera begins to hum softly.") + "\n\n");

    await this.delay(3000);
    entityManager.notifyRoom(boothRoom.id, colors.warning(`${playerDisplayName} begins to shimmer and break down into small particles!`));
    session.send(colors.warning("As you look down, you then notice that you are being broken down into\nsmall particles.") + "\n\n");

    await this.delay(2000);
    entityManager.notifyRoom(boothRoom.id, colors.highlight(`${playerDisplayName} is sucked into the camera with a WHOOSH!`));
    session.send(colors.highlight("You then feel a strange pulling sensation as you are sucked into the camera.") + "\n\n");

    await this.delay(1000);

    // Update the booth room's exit to point to the destination
    boothRoom.exits.out = destination.destination;
    entityManager.markDirty('booth_room');

    entityManager.notifyRoom(boothRoom.id, colors.success(`${playerDisplayName} materializes in the booth!`));
    session.send(colors.success("Suddenly you are standing in a different booth.") + "\n\n");
    session.send(boothRoom.description + "\n");
  },

  /**
   * Handle pressing buttons in the hot tub room
   */
  async handleHotTubPress(player, input, hotTubRoom, session, entityManager, colors) {
    // Parse button input (remove "button" if present)
    const buttonInput = input.replace(/^(button|buttons?)\s+/i, '').trim();

    if (!hotTubRoom.features || !hotTubRoom.features.buttons) {
      session.send("There are no buttons here.\n");
      return;
    }

    const buttons = hotTubRoom.features.buttons;
    const playerDisplayName = (player.capname || player.name);

    // Find button by number or name
    let button = null;
    const buttonNum = parseInt(buttonInput);

    if (!isNaN(buttonNum) && buttonNum > 0 && buttonNum <= buttons.length) {
      button = buttons[buttonNum - 1];
    } else {
      // Try to match by name
      button = buttons.find(b =>
        b.name.toLowerCase() === buttonInput.toLowerCase() ||
        b.name.toLowerCase().includes(buttonInput)
      );
    }

    if (!button) {
      session.send("There is no such button.\n");
      return;
    }

    // Initialize activeEffects if not present
    if (!hotTubRoom.activeEffects) {
      hotTubRoom.activeEffects = {
        jets: { active: false, startTime: 0 },
        bubbles: { active: false, startTime: 0 },
        steam: { active: false, startTime: 0 },
        lights: { active: false }
      };
    }

    // Handle button press based on effect type
    const effectType = button.effect;

    if (effectType === 'therapeutic_jets') {
      if (hotTubRoom.activeEffects.jets.active) {
        // Turn OFF
        hotTubRoom.activeEffects.jets.active = false;
        entityManager.notifyRoom(hotTubRoom.id, `${playerDisplayName} presses the jets button.`);
        await this.delay(500);
        entityManager.notifyRoom(hotTubRoom.id, colors.info("The massage jets slowly wind down and shut off."));
      } else {
        // Turn ON
        hotTubRoom.activeEffects.jets.active = true;
        hotTubRoom.activeEffects.jets.startTime = Date.now();
        entityManager.notifyRoom(hotTubRoom.id, `${playerDisplayName} presses the jets button.`);
        await this.delay(800);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("The hot tub comes alive with a deep mechanical WHIRRRRR..."));
        await this.delay(1200);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("Powerful jets of water erupt from all sides, pummeling everyone with therapeutic intensity!"));
      }
      entityManager.markDirty(hotTubRoom.id);
    }
    else if (effectType === 'bubble_mode') {
      if (hotTubRoom.activeEffects.bubbles.active) {
        // Turn OFF
        hotTubRoom.activeEffects.bubbles.active = false;
        entityManager.notifyRoom(hotTubRoom.id, `${playerDisplayName} presses the bubbles button.`);
        await this.delay(500);
        entityManager.notifyRoom(hotTubRoom.id, colors.info("The bubbles gradually subside to a gentle fizz, then stop."));
      } else {
        // Turn ON
        hotTubRoom.activeEffects.bubbles.active = true;
        hotTubRoom.activeEffects.bubbles.startTime = Date.now();
        entityManager.notifyRoom(hotTubRoom.id, `${playerDisplayName} presses the bubbles button.`);
        await this.delay(800);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("A soft gurgling rises from the depths..."));
        await this.delay(1200);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("THOUSANDS of bubbles erupt from the bottom of the tub!"));
      }
      entityManager.markDirty(hotTubRoom.id);
    }
    else if (effectType === 'steam_boost') {
      if (hotTubRoom.activeEffects.steam.active) {
        // Turn OFF
        hotTubRoom.activeEffects.steam.active = false;
        entityManager.notifyRoom(hotTubRoom.id, `${playerDisplayName} presses the steam button.`);
        await this.delay(500);
        entityManager.notifyRoom(hotTubRoom.id, colors.info("The steam generator shuts off, and the fog slowly dissipates."));
      } else {
        // Turn ON
        hotTubRoom.activeEffects.steam.active = true;
        hotTubRoom.activeEffects.steam.startTime = Date.now();
        entityManager.notifyRoom(hotTubRoom.id, `${playerDisplayName} presses the steam button.`);
        await this.delay(800);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("The water temperature increases ever so slightly..."));
        await this.delay(1200);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("Steam begins to rise with dramatic purpose, clouding the air around you."));
      }
      entityManager.markDirty(hotTubRoom.id);
    }
    else if (effectType === 'chromotherapy') {
      if (hotTubRoom.activeEffects.lights.active) {
        // Turn OFF
        hotTubRoom.activeEffects.lights.active = false;
        entityManager.notifyRoom(hotTubRoom.id, `${playerDisplayName} presses the lights button.`);
        await this.delay(500);
        entityManager.notifyRoom(hotTubRoom.id, colors.info("The chromotherapy lights fade out, returning the water to its natural color."));
      } else {
        // Turn ON
        hotTubRoom.activeEffects.lights.active = true;
        entityManager.notifyRoom(hotTubRoom.id, `${playerDisplayName} presses the lights button.`);
        await this.delay(800);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("The underwater lights begin to pulse through a mesmerizing sequence..."));
        await this.delay(1000);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("RED - allegedly promotes energy and vitality!"));
        await this.delay(800);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("BLUE - supposedly calming and meditative!"));
        await this.delay(800);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("GREEN - purportedly balancing and harmonious!"));
        await this.delay(800);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("PURPLE - mysteriously spiritual and transcendent!"));
        await this.delay(800);
        entityManager.notifyRoom(hotTubRoom.id, colors.highlight("The lights settle into a soothing, continuous cycle of colors."));
      }
      entityManager.markDirty(hotTubRoom.id);
    }
    else {
      session.send("That button doesn't seem to do anything.\n");
      return;
    }

    session.send("\n");
  },

  /**
   * Handle pressing buttons in the elevator room
   */
  async handleElevatorPress(player, input, elevatorRoom, session, entityManager, colors) {
    // Parse button input (remove "button" if present)
    const buttonInput = input.replace(/^(button|buttons?)\s+/i, '').trim();

    if (!elevatorRoom.features || !elevatorRoom.features.buttons) {
      session.send("There are no buttons here.\n");
      return;
    }

    const buttons = elevatorRoom.features.buttons;

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

    // Elevator sequence with flavor
    session.send(`You press the button for ${destination.name}.\n`);

    await this.delay(800);
    session.send(colors.info("The elevator doors slide shut with a soft hiss.") + "\n");

    await this.delay(1500);
    session.send(colors.warning("You feel a gentle lurch as the elevator begins to move.") + "\n");

    await this.delay(1500);
    session.send(colors.highlight("The elevator plays a soothing melody that's definitely trying too hard.") + "\n");

    await this.delay(1200);
    session.send(colors.info("With a soft ding, the elevator comes to a smooth stop.") + "\n");

    await this.delay(800);

    // Update the elevator room's exit to point to the destination
    elevatorRoom.exits.out = destination.destination;
    entityManager.markDirty('elevator_room');

    session.send(colors.success("The brass doors slide open, revealing your destination.") + "\n\n");
    session.send(elevatorRoom.description + "\n");
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
