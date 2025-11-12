/**
 * close command
 * Close a container
 */

module.exports = {
  id: "close",
  name: "close",
  aliases: [],
  category: "container",
  description: "Close a container",
  usage: "close <container>",
  help: "Closes a container, hiding its contents from view.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Close what?');
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

    if (!container.isOpen) {
      session.sendLine('It\'s already closed.');
      return;
    }

    container.isOpen = false;
    container.modifiedAt = new Date().toISOString();
    entityManager.markDirty(container.id);
    session.sendLine(colors.warning(`You close ${container.name}.`));
  }
};
