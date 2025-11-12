/**
 * deleteplayer command
 * Permanently delete a player from the game (admin only)
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  id: "deleteplayer",
  name: "deleteplayer",
  aliases: ["delplayer"],
  category: "admin",
  description: "Permanently delete a player from the game",
  usage: "deleteplayer <playername>",
  help: "Permanently removes a player from the game. Drops all their items in their current room, removes them from memory, and deletes their save file. This action cannot be undone. Admin only.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const executingPlayer = session.player;

    // Admin check - for now, check if player has isAdmin flag
    // TODO: Implement proper permission system
    if (!executingPlayer.isAdmin) {
      session.sendLine('');
      session.sendLine(colors.error('You do not have permission to use this command.'));
      session.sendLine('');
      return;
    }

    if (!args) {
      session.sendLine('');
      session.sendLine(colors.error('Usage: deleteplayer <playername>'));
      session.sendLine('');
      return;
    }

    const targetPlayerName = args.trim().toLowerCase();

    // Find the player
    const targetPlayer = Array.from(entityManager.objects.values()).find(obj =>
      obj.type === 'player' && obj.id.toLowerCase() === targetPlayerName
    );

    if (!targetPlayer) {
      session.sendLine('');
      session.sendLine(colors.error(`Player '${targetPlayerName}' not found.`));
      session.sendLine('');
      return;
    }

    // Prevent deleting yourself
    if (targetPlayer.id === executingPlayer.id) {
      session.sendLine('');
      session.sendLine(colors.error('You cannot delete yourself!'));
      session.sendLine(colors.hint('Use the delete command from the main menu instead.'));
      session.sendLine('');
      return;
    }

    session.sendLine('');
    session.sendLine(colors.warning(`⚠️  Deleting player '${targetPlayer.name}' (${targetPlayer.id})...`));

    // Step 1: Disconnect if online
    const targetSession = entityManager.sessions.get(targetPlayer.id);
    if (targetSession) {
      session.sendLine(colors.info('   Disconnecting player...'));
      targetSession.sendLine('');
      targetSession.sendLine(colors.error('Your character has been deleted by an administrator.'));
      targetSession.sendLine('');
      targetSession.socket.end();
      entityManager.sessions.delete(targetPlayer.id);
    }

    // Step 2: Drop all items in their current room
    if (targetPlayer.inventory && targetPlayer.inventory.length > 0) {
      session.sendLine(colors.info(`   Dropping ${targetPlayer.inventory.length} item(s) in room ${targetPlayer.currentRoom}...`));

      // Create a copy of inventory array since we'll be modifying it
      const itemIds = [...targetPlayer.inventory];

      for (const itemId of itemIds) {
        try {
          entityManager.move(itemId, {
            type: 'room',
            room: targetPlayer.currentRoom
          });
        } catch (error) {
          console.error(`Error dropping item ${itemId}:`, error);
        }
      }
    }

    // Step 3: Remove from EntityManager
    session.sendLine(colors.info('   Removing from entity manager...'));
    entityManager.objects.delete(targetPlayer.id);
    entityManager.dirtyObjects.delete(targetPlayer.id);

    // Remove any heartbeats
    if (entityManager.heartbeats.has(targetPlayer.id)) {
      entityManager.heartbeats.delete(targetPlayer.id);
    }

    // Step 4: Delete JSON file
    session.sendLine(colors.info('   Deleting save file...'));
    const playerFile = path.join(entityManager.dataDir, 'players', `${targetPlayer.id}.json`);

    try {
      if (fs.existsSync(playerFile)) {
        fs.unlinkSync(playerFile);
      }
    } catch (error) {
      session.sendLine(colors.error(`   Error deleting file: ${error.message}`));
      console.error('Error deleting player file:', error);
    }

    session.sendLine('');
    session.sendLine(colors.success(`✅ Player '${targetPlayer.name}' has been permanently deleted.`));
    session.sendLine('');
  }
};
