/**
 * look command
 * Look at your surroundings
 * Formatting styled after "The Wumpy and Grift"
 */

const { getDisplayName } = require('../utils/playerDisplay');

module.exports = {
  id: "look",
  name: "look",
  aliases: ["l"],
  category: "basic",
  description: "Look at your surroundings",
  usage: "look",
  help: "Shows the room you're in, along with any items, containers, and other players present.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    if (!room) {
      session.sendLine(colors.error('You are in a void. This room does not exist.'));
      return;
    }

    let output = [];

    // Room name with underline
    output.push(colors.roomName(room.name));
    output.push(colors.line(colors.visibleLength(room.name), '=', colors.MUD_COLORS.ROOM_NAME));

    // Wrapped room description
    if (room.description) {
      const wrappedDescription = colors.wrap(room.description, 80);
      output.push(wrappedDescription);
    }

    // Exits
    if (room.exits) {
      const exitDirs = Object.keys(room.exits);
      if (exitDirs.length > 0) {
        const exitList = exitDirs.map(dir => colors.exits(dir)).join(', ');
        output.push('\n' + colors.exitsLabel('Exits: ') + exitList);
      } else {
        output.push('\n' + colors.exitsLabel('Exits: ') + colors.hint('none'));
      }
    } else {
      output.push('\n' + colors.exitsLabel('Exits: ') + colors.hint('none'));
    }

    // NPCs
    const npcsInRoom = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'npc' &&
      obj.currentRoom === room.id
    );

    if (npcsInRoom.length > 0) {
      output.push('');
      for (const npcObj of npcsInRoom) {
        output.push(colors.npc(npcObj.name) + ' is here.');
      }
    }

    // Objects
    if (room.objects && room.objects.length > 0) {
      output.push('');
      for (const objId of room.objects) {
        const obj = entityManager.get(objId);
        if (obj) {
          const displayName = obj.getDisplayName ? obj.getDisplayName() : obj.name;
          output.push('You see ' + colors.objectName(displayName) + ' here.');
        }
      }
    }

    // Items in room
    const itemsInRoom = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'room' &&
      obj.location?.room === room.id
    );

    if (itemsInRoom.length > 0) {
      output.push('');
      itemsInRoom.forEach(item => {
        const displayName = item.getDisplayName ? item.getDisplayName() : item.name;
        output.push('You see ' + colors.objectName(displayName) + ' here.');
      });
    }

    // Containers in room
    const containersInRoom = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'container' &&
      obj.location?.type === 'room' &&
      obj.location?.room === room.id
    );

    if (containersInRoom.length > 0) {
      output.push('');
      containersInRoom.forEach(container => {
        let display = 'You see ' + colors.objectName(container.name);
        if (container.isLocked) {
          display += colors.dim(' (locked)');
        } else if (container.isOpen) {
          display += colors.dim(' (open)');
        }
        display += ' here.';
        output.push(display);
      });
    }

    // Other players in room (only show those who are actually logged in)
    const playersInRoom = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'player' &&
      obj.currentRoom === room.id &&
      obj.id !== player.id &&
      entityManager.sessions.has(obj.id)  // Only show players with active sessions
    );

    if (playersInRoom.length > 0) {
      const playerNames = playersInRoom.map(p => colors.playerName(getDisplayName(p)));
      output.push('\n' + colors.info('Also here: ') + playerNames.join(', '));
    }

    session.sendLine('');
    session.sendLine(output.join('\n'));
    session.sendLine('');
  }
};
