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
  help: "Provides detailed information about an item or container, including stats like durability, damage, value, and contents. Note: 'look <thing>' does the same thing.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Examine what?');
      return;
    }

    const player = session.player;
    const targetName = args.toLowerCase();

    // Check if player is in booth room and examining booth-specific features
    if (player.currentRoom === 'booth_room') {
      const boothRoom = entityManager.get('booth_room');
      if (boothRoom && boothRoom.features) {
        // Examine camera
        if (targetName === 'camera') {
          session.sendLine('');
          session.sendLine(colors.objectName('A Strange Camera'));
          session.sendLine(boothRoom.features.camera);
          session.sendLine('');
          return;
        }

        // Examine sign
        if (targetName === 'sign' || targetName === 'instructions') {
          session.sendLine('');
          session.sendLine(boothRoom.features.sign);
          session.sendLine('');
          return;
        }

        // Examine buttons
        if (targetName === 'buttons' || targetName === 'button') {
          session.sendLine('');
          session.sendLine('You see buttons for the following destinations:\n');
          boothRoom.features.buttons.forEach(btn => {
            session.sendLine(` +---+`);
            session.sendLine(` | ${String(btn.number).padStart(2, ' ')}| ${btn.name.padEnd(14, ' ')}`);
            session.sendLine(` +---+\n`);
          });
          session.sendLine('');
          return;
        }
      }
    }

    // Check if player is in elevator room and examining elevator-specific features
    if (player.currentRoom === 'elevator_room') {
      const elevatorRoom = entityManager.get('elevator_room');
      if (elevatorRoom && elevatorRoom.features) {
        // Examine panel
        if (targetName === 'panel' || targetName === 'control panel') {
          session.sendLine('');
          session.sendLine(colors.objectName('The Elevator Control Panel'));
          session.sendLine(elevatorRoom.features.panel);
          session.sendLine('');
          return;
        }

        // Examine mirrors
        if (targetName === 'mirror' || targetName === 'mirrors') {
          session.sendLine('');
          session.sendLine(colors.objectName('The Flattering Mirrors'));
          session.sendLine(elevatorRoom.features.mirrors);
          session.sendLine('');
          return;
        }

        // Examine sign
        if (targetName === 'sign' || targetName === 'instructions') {
          session.sendLine('');
          session.sendLine(elevatorRoom.features.sign);
          session.sendLine('');
          return;
        }

        // Examine buttons
        if (targetName === 'buttons' || targetName === 'button') {
          session.sendLine('');
          session.sendLine('The elevator panel displays the following floors:\n');
          elevatorRoom.features.buttons.forEach(btn => {
            session.sendLine(` [ ${btn.number} ] ${btn.name}`);
          });
          session.sendLine('');
          return;
        }
      }
    }

    // Check if player is in hot tub room and examining hot tub-specific features
    if (player.currentRoom === 'hot_tub_room') {
      const hotTubRoom = entityManager.get('hot_tub_room');
      if (hotTubRoom && hotTubRoom.features) {
        // Examine panel
        if (targetName === 'panel' || targetName === 'control panel' || targetName === 'controls') {
          session.sendLine('');
          session.sendLine(colors.objectName('Hot Tub Control Panel'));
          session.sendLine(hotTubRoom.features.panel);
          session.sendLine('');
          return;
        }

        // Examine water
        if (targetName === 'water') {
          session.sendLine('');
          session.sendLine(colors.objectName('The Perfectly Heated Water'));
          session.sendLine(hotTubRoom.features.water);
          session.sendLine('');
          return;
        }

        // Examine lights
        if (targetName === 'lights' || targetName === 'light') {
          session.sendLine('');
          session.sendLine(colors.objectName('Chromotherapy Lights'));
          session.sendLine(hotTubRoom.features.lights);
          session.sendLine('');
          return;
        }

        // Examine jets
        if (targetName === 'jets' || targetName === 'jet') {
          session.sendLine('');
          session.sendLine(colors.objectName('Massage Jets'));
          session.sendLine(hotTubRoom.features.jets);
          session.sendLine('');
          return;
        }

        // Examine sign
        if (targetName === 'sign' || targetName === 'instructions') {
          session.sendLine('');
          session.sendLine(hotTubRoom.features.sign);
          session.sendLine('');
          return;
        }

        // Examine buttons
        if (targetName === 'buttons' || targetName === 'button') {
          session.sendLine('');
          session.sendLine('The hot tub control panel has the following buttons:\n');
          hotTubRoom.features.buttons.forEach(btn => {
            session.sendLine(` [ ${btn.number} ] ${btn.name.padEnd(10)} - ${btn.description}`);
          });
          session.sendLine('');
          return;
        }
      }
    }

    // Check for general room features
    const currentRoom = entityManager.get(player.currentRoom);
    if (currentRoom && currentRoom.features) {
      const featureKey = Object.keys(currentRoom.features).find(key =>
        key.toLowerCase() === targetName ||
        key.toLowerCase().includes(targetName) ||
        targetName.includes(key.toLowerCase())
      );

      if (featureKey) {
        const featureValue = currentRoom.features[featureKey];
        session.sendLine('');
        session.sendLine(featureValue);
        session.sendLine('');
        return;
      }
    }

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

    // Check booth portals in room
    if (!target) {
      target = Array.from(entityManager.objects.values()).find(obj =>
        obj.type === 'booth_portal' &&
        obj.location?.type === 'room' &&
        obj.location?.room === player.currentRoom &&
        (obj.name?.toLowerCase().includes(targetName) ||
         obj.aliases?.some(alias => alias.toLowerCase().includes(targetName)))
      );
    }

    // Check elevator portals in room
    if (!target) {
      target = Array.from(entityManager.objects.values()).find(obj =>
        obj.type === 'elevator_portal' &&
        obj.location?.type === 'room' &&
        obj.location?.room === player.currentRoom &&
        (obj.name?.toLowerCase().includes(targetName) ||
         obj.aliases?.some(alias => alias.toLowerCase().includes(targetName)))
      );
    }

    // Check hot tubs in room
    if (!target) {
      target = Array.from(entityManager.objects.values()).find(obj =>
        obj.type === 'hot_tub' &&
        obj.location?.type === 'room' &&
        obj.location?.room === player.currentRoom &&
        (obj.name?.toLowerCase().includes(targetName) ||
         obj.aliases?.some(alias => alias.toLowerCase().includes(targetName)))
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

    // Check if examining self
    if (!target) {
      if (targetName === 'self' || targetName === 'me') {
        target = player;
      } else {
        // Check if the target name matches the player's own name
        const playerCapname = (player.capname || '').toLowerCase();
        const playerDisplayName = (player.title ? `${player.title} ${player.name}` : player.name).toLowerCase();
        const playerUsername = player.username ? player.username.toLowerCase() : player.name.toLowerCase();

        if (playerCapname.includes(targetName) || playerDisplayName.includes(targetName) || playerUsername.includes(targetName)) {
          target = player;
        }
      }
    }

    // Check other players in room
    if (!target) {
      target = Array.from(entityManager.objects.values()).find(obj => {
        if (obj.type !== 'player' || obj.currentRoom !== player.currentRoom || obj.id === player.id) {
          return false;
        }

        // Only find players with active sessions
        if (!entityManager.sessions.has(obj.id)) {
          return false;
        }

        // Check name (both display name and username)
        const capname = (obj.capname || '').toLowerCase();
        const displayName = (obj.title ? `${obj.title} ${obj.name}` : obj.name).toLowerCase();
        const username = obj.username ? obj.username.toLowerCase() : obj.name.toLowerCase();

        if (capname.includes(targetName) || displayName.includes(targetName) || username.includes(targetName)) {
          return true;
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
    } else if (target.type === 'player') {
      const { getDisplayName } = require('../utils/playerDisplay');
      const displayName = getDisplayName(target);
      session.sendLine(colors.playerName(displayName));
    } else if (target.type === 'item') {
      session.sendLine(colors.objectName(target.name));
    } else if (target.type === 'container') {
      session.sendLine(colors.objectName(target.name));
    } else if (target.type === 'booth_portal' || target.type === 'elevator_portal' || target.type === 'hot_tub') {
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
      // Only show status if not explicitly hidden (e.g., corpses)
      if (!target.hideContainerStatus) {
        const status = target.isOpen ? 'open' : 'closed';
        session.sendLine(colors.magenta(`Status: ${status}`));
      }

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

      // Show equipped items
      if (target.equipped && Object.keys(target.equipped).length > 0) {
        session.sendLine('');
        session.sendLine(colors.info('Equipment:'));
        const equippedItems = [];

        if (target.equipped.mainHand) {
          const weapon = entityManager.get(target.equipped.mainHand);
          if (weapon) equippedItems.push(`  Main Hand: ${colors.objectName(weapon.name)}`);
        }

        if (target.equipped.offHand) {
          const offhand = entityManager.get(target.equipped.offHand);
          if (offhand) equippedItems.push(`  Off Hand: ${colors.objectName(offhand.name)}`);
        }

        if (target.equipped.head) {
          const helmet = entityManager.get(target.equipped.head);
          if (helmet) equippedItems.push(`  Head: ${colors.objectName(helmet.name)}`);
        }

        if (target.equipped.chest) {
          const armor = entityManager.get(target.equipped.chest);
          if (armor) equippedItems.push(`  Chest: ${colors.objectName(armor.name)}`);
        }

        if (target.equipped.hands) {
          const gloves = entityManager.get(target.equipped.hands);
          if (gloves) equippedItems.push(`  Hands: ${colors.objectName(gloves.name)}`);
        }

        if (target.equipped.legs) {
          const legs = entityManager.get(target.equipped.legs);
          if (legs) equippedItems.push(`  Legs: ${colors.objectName(legs.name)}`);
        }

        if (target.equipped.feet) {
          const boots = entityManager.get(target.equipped.feet);
          if (boots) equippedItems.push(`  Feet: ${colors.objectName(boots.name)}`);
        }

        if (target.equipped.shield) {
          const shield = entityManager.get(target.equipped.shield);
          if (shield) equippedItems.push(`  Shield: ${colors.objectName(shield.name)}`);
        }

        if (equippedItems.length > 0) {
          equippedItems.forEach(item => session.sendLine(item));
        }
      }
    }

    if (target.type === 'player') {
      // Use the description system to generate rich player descriptions
      const descSystem = require('../systems/descriptions');
      const desc = descSystem.generateCompletePlayerDescription(target, entityManager, colors);

      const lineWidth = 60; // Optimal width for readability

      // Helper function to wrap text to specified width
      const wrapText = (text, width) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
          // Check if adding this word would exceed width
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (testLine.length <= width) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines.join('\n');
      };

      // Helper function to add color tags to level descriptions
      const addLevelColorTags = (text) => {
        // Wrap level-related words in yellow tags, then wrap whole thing in blue
        const tagged = text.replace(/(bewildered|confidence|competence|veteran|legend|experience|gravitas|cautionary tale)/gi,
          (match) => `<yellow>${match}</>`);
        return `<bright_blue>${tagged}</>`;
      };

      // Helper function to add color tags to health descriptions
      const addHealthColorTags = (text) => {
        // Wrap health-related words in magenta tags, then wrap whole thing in blue
        const tagged = text.replace(/(healthy|hale|vigor|hit points|wear|scuffs|bruises|healer|determination|bandaging|battered|breeze|stubborn)/gi,
          (match) => `<magenta>${match}</>`);
        return `<bright_blue>${tagged}</>`;
      };

      // Header with player name
      session.sendLine('');
      session.sendLine(colors.highlight('═'.repeat(lineWidth)));
      session.sendLine(colors.highlight(`  ${(target.capname || target.name)}`));
      session.sendLine(colors.highlight('═'.repeat(lineWidth)));
      session.sendLine('');

      // Base appearance (wrapped)
      session.sendLine(colors.dim(wrapText(desc.base, lineWidth)));
      session.sendLine('');

      // Section break
      session.sendLine(colors.dim('─'.repeat(lineWidth)));
      session.sendLine('');

      // Level descriptor with color tags (wrapped then parsed)
      const levelText = wrapText(desc.level, lineWidth);
      const levelColored = colors.parseColorTags(addLevelColorTags(levelText));
      session.sendLine(levelColored);

      // Equipment (if any)
      if (desc.equipment) {
        session.sendLine('');
        const equipText = colors.parseColorTags(wrapText(desc.equipment, lineWidth));
        session.sendLine(equipText);
      }

      // Health descriptor with color tags (wrapped then parsed)
      session.sendLine('');
      const healthText = wrapText(desc.health, lineWidth);
      const healthColored = colors.parseColorTags(addHealthColorTags(healthText));
      session.sendLine(healthColored);

      // Section break
      session.sendLine('');
      session.sendLine(colors.dim('─'.repeat(lineWidth)));
      session.sendLine('');

      // Guild affiliation (wrapped)
      session.sendLine(colors.warning(wrapText(desc.guild, lineWidth)));

      // Ghost status (if applicable, wrapped)
      if (desc.ghost) {
        session.sendLine('');
        session.sendLine(desc.ghost);
      }

      // Footer
      session.sendLine('');
      session.sendLine(colors.highlight('═'.repeat(lineWidth)));
    }

    session.sendLine('');
  }
};
