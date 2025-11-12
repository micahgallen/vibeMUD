/**
 * who command
 * See all players in the world
 */

module.exports = {
  id: "who",
  name: "who",
  aliases: [],
  category: "basic",
  description: "See all players in the world",
  usage: "who",
  help: "Shows a list of all players currently logged into the game and their locations.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const players = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'player'
    );

    session.sendLine('');
    session.sendLine(colors.bright + 'Players in the world:' + colors.reset);
    session.sendLine('');

    players.forEach(p => {
      const isYou = p.id === session.player.id ? ' (you)' : '';
      const room = entityManager.get(p.currentRoom);
      const roomName = room ? room.name : 'Unknown';
      session.sendLine(`  ${p.name}${isYou} - ${roomName}`);
    });

    session.sendLine('');
    session.sendLine(`Total: ${players.length} player${players.length !== 1 ? 's' : ''}`);
    session.sendLine('');
  }
};
