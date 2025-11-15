/**
 * Out command - exit through the "out" exit
 */

module.exports = {
  id: "out",
  name: "out",
  aliases: ["exit"],
  category: "movement",
  description: "Exit through the out exit",
  usage: "out",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    if (!player) {
      session.send("Error: Player not found.\n");
      return;
    }

    const currentRoom = entityManager.get(player.currentRoom);
    if (!currentRoom) {
      session.send("You are nowhere!\n");
      return;
    }

    // Check if there's an "out" exit
    if (!currentRoom.exits || !currentRoom.exits.out) {
      session.send("There is no exit in that direction.\n");
      return;
    }

    const destinationId = currentRoom.exits.out;
    const destination = entityManager.get(destinationId);

    if (!destination) {
      session.send("That exit leads nowhere!\n");
      return;
    }

    // Move the player
    entityManager.move(player.id, {
      type: 'room',
      room: destinationId
    });

    // Show the new room
    const lookCommand = require('./look');
    lookCommand.execute(session, '', entityManager, colors);
  }
};
