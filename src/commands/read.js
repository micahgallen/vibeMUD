/**
 * read command
 * Read signs, books, scrolls, and other readable items
 */

module.exports = {
  id: "read",
  name: "read",
  aliases: ["r"],
  category: "basic",
  description: "Read a sign, book, scroll, or other readable item",
  usage: "read <thing>",
  help: "Displays the full content of readable items like signs, books, scrolls, notes, etc.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    if (!args) {
      session.sendLine('Read what?');
      return;
    }

    const player = session.player;
    const targetName = args.toLowerCase();

    // Find readable item in inventory first
    let target = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'inventory' &&
      obj.location?.owner === player.id &&
      obj.name.toLowerCase().includes(targetName) &&
      obj.isReadable === true
    );

    // Check room if not found in inventory
    if (!target) {
      target = Array.from(entityManager.objects.values()).find(obj =>
        obj.type === 'item' &&
        obj.location?.type === 'room' &&
        obj.location?.room === player.currentRoom &&
        obj.name.toLowerCase().includes(targetName) &&
        obj.isReadable === true
      );
    }

    if (!target) {
      // Check if the item exists but isn't readable
      const nonReadable = Array.from(entityManager.objects.values()).find(obj =>
        obj.type === 'item' &&
        ((obj.location?.type === 'inventory' && obj.location?.owner === player.id) ||
         (obj.location?.type === 'room' && obj.location?.room === player.currentRoom)) &&
        obj.name.toLowerCase().includes(targetName)
      );

      if (nonReadable) {
        session.sendLine('That isn\'t something you can read.');
        return;
      }

      session.sendLine('You don\'t see that here.');
      return;
    }

    // Display the content
    session.sendLine('');

    // If the object has a getContent() method (like signs), use it
    if (typeof target.getContent === 'function') {
      const content = target.getContent(entityManager);
      session.sendLine(content);
    }
    // Otherwise, check for direct content properties
    else if (target.readableContent) {
      // Handle array of lines
      if (Array.isArray(target.readableContent)) {
        session.sendLine(target.readableContent.join('\n'));
      } else {
        session.sendLine(target.readableContent);
      }
    }
    // Fallback to description
    else {
      session.sendLine(colors.objectName(target.name));
      session.sendLine(target.description || 'There is nothing written on it.');
    }

    session.sendLine('');

    // Notify room that player is reading (for roleplay)
    const room = entityManager.get(player.currentRoom);
    if (room) {
      entityManager.notifyRoom(
        player.currentRoom,
        colors.dim(`${player.name} reads ${target.name}.`),
        player.id
      );
    }
  }
};
