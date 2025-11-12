/**
 * open command
 * Open a container
 */

module.exports = {
  id: "open",
  name: "open",
  aliases: [],
  category: "container",
  description: "Open a container",
  usage: "open <container>",
  help: "Opens a container so you can see and access its contents.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Open what?');
      return;
    }

    const player = session.player;
    const containerName = args.toLowerCase();

    const container = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'container' &&
      obj.location?.type === 'room' &&
      obj.location?.room === player.currentRoom &&
      obj.name.toLowerCase().includes(containerName)
    );

    if (!container) {
      session.sendLine('You don\'t see that here.');
      return;
    }

    if (container.isOpen) {
      session.sendLine('It\'s already open.');
      return;
    }

    if (container.isLocked) {
      session.sendLine('It\'s locked.');
      return;
    }

    container.isOpen = true;
    container.modifiedAt = new Date().toISOString();
    entityManager.markDirty(container.id);
    session.sendLine(colors.green + `You open ${container.name}.` + colors.reset);
  }
};
