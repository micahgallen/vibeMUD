/**
 * save command
 * Manually save game state
 */

module.exports = {
  id: "save",
  name: "save",
  aliases: [],
  category: "system",
  description: "Manually save game state",
  usage: "save",
  help: "Forces an immediate save of all game objects to disk. The game auto-saves every 60 seconds.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    try {
      const count = entityManager.dirtyObjects.size;
      entityManager.saveDirty();
      session.sendLine(colors.success(`Game saved! (${count} objects saved)`));
    } catch (error) {
      session.sendLine(colors.error(`Error saving: ${error.message}`));
    }
  }
};
