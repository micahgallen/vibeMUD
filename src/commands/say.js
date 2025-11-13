module.exports = {
    id: 'say',
    name: 'say',
    aliases: ['"'], // Allow players to use "message" as a shortcut
    category: 'Communication',
    description: 'Broadcasts a message to everyone in the current room.',
    usage: 'say <message> or " <message>',
    requiresLogin: true,
    execute: function(session, args, entityManager) {
        const player = session.player;

        if (!player || !player.currentRoom) {
            session.sendLine("You are not in a room.");
            return;
        }

        if (!args || args.trim().length === 0) {
            session.sendLine("What do you want to say?");
            return;
        }

        const message = args.trim();
        const playerName = player.capname || player.name;
        const formattedMessage = `${playerName} says: ${message}`;

        // Send message to the player who said it
        session.sendLine(`You say: ${message}`);

        // Notify other players in the room
        entityManager.notifyRoom(player.currentRoom, formattedMessage, player.id);
    },
};
