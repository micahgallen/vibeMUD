/**
 * Monster Definition
 * Base definition for wandering NPCs
 */

// Helper function for opposite directions
function getOppositeDirection(direction) {
  const opposites = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
    up: 'down',
    down: 'up',
    northeast: 'southwest',
    northwest: 'southeast',
    southeast: 'northwest',
    southwest: 'northeast'
  };
  return opposites[direction] || 'somewhere';
}

module.exports = {
  type: 'npc',
  hp: 20,
  maxHp: 20,
  wanders: true,

  /**
   * Wandering heartbeat - NPC moves randomly between rooms
   * This function is inherited by all monsters that have wanders: true
   */
  heartbeat: function(entityManager) {
    if (!this.wanders) return;

    const room = entityManager.get(this.currentRoom);
    if (!room || !room.exits || Object.keys(room.exits).length === 0) return;

    const exits = Object.keys(room.exits);
    const randomExit = exits[Math.floor(Math.random() * exits.length)];
    const newRoomId = room.exits[randomExit];
    const newRoom = entityManager.get(newRoomId);

    if (!newRoom) return;

    // Announce departure
    entityManager.notifyRoom(this.currentRoom,
      `\x1b[36m${this.name} wanders ${randomExit}.\x1b[0m`);

    // Move NPC
    this.currentRoom = newRoomId;
    entityManager.markDirty(this.id);

    // Announce arrival
    entityManager.notifyRoom(newRoomId,
      `\x1b[36m${this.name} wanders in from the ${getOppositeDirection(randomExit)}.\x1b[0m`);

    console.log(`  🚶 ${this.name} wandered ${randomExit} to ${newRoom.name}`);
  }
};
