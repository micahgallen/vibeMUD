/**
 * teleport command
 * Admin-only command to teleport to any room
 */

module.exports = {
  id: "teleport",
  name: "teleport",
  aliases: ["tp"],
  category: "admin",
  description: "Teleport to any room (admin only)",
  usage: "teleport <room_id>",
  help: "Instantly teleport to the specified room. This command is only available to administrators.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Check if player is an admin
    if (!player.isAdmin) {
      session.sendLine(colors.error('You do not have permission to use this command.'));
      return;
    }

    // Check if room ID was provided
    if (!args || args.trim() === '') {
      session.sendLine(colors.error('Usage: teleport <room_id>'));
      session.sendLine(colors.hint('Example: teleport sesame_street_01'));
      return;
    }

    const targetRoomId = args.trim();
    const targetRoom = entityManager.get(targetRoomId);

    // Validate room exists
    if (!targetRoom) {
      session.sendLine(colors.error(`Room '${targetRoomId}' does not exist.`));
      session.sendLine(colors.hint('Example: teleport sesame_street_01'));
      return;
    }

    // Validate it's actually a room
    if (targetRoom.type !== 'room') {
      session.sendLine(colors.error(`'${targetRoomId}' is not a room (it's a ${targetRoom.type}).`));
      return;
    }

    const oldRoomId = player.currentRoom;
    const oldRoom = entityManager.get(oldRoomId);
    const name = player.capname || player.name;

    // Notify old room (use custom exit message if set)
    if (oldRoom) {
      const exitMessage = player.tpExitMessage
        ? player.tpExitMessage.replace('{name}', name)
        : `${name} disappears in a flash of light!`;

      entityManager.notifyRoom(oldRoomId,
        colors.info(exitMessage),
        player.id);
    }

    // Move player to new room
    player.currentRoom = targetRoomId;
    entityManager.markDirty(player.id);

    // Notify new room (use custom enter message if set)
    const enterMessage = player.tpEnterMessage
      ? player.tpEnterMessage.replace('{name}', name)
      : `${name} appears in a flash of light!`;

    entityManager.notifyRoom(targetRoomId,
      colors.info(enterMessage),
      player.id);

    // Show the player their new location
    session.sendLine(colors.success(`You teleport to ${targetRoom.name}!`));
    session.sendLine('');

    // Auto-look at new room
    const lookCommand = require('./look.js');
    lookCommand.execute(session, '', entityManager, colors);
  }
};
