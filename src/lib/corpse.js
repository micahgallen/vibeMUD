/**
 * Corpse Definition
 * Container created when entities die in combat
 */

module.exports = {
  type: 'container',
  isOpen: true,
  isLocked: false,
  capacity: 100, // Corpses can hold a lot
  inventory: [],
  hideContainerStatus: true, // Don't show "(open)" or "Status: open" for corpses

  // Corpses decay after 5 minutes
  decayTime: 300, // seconds

  /**
   * Get display name for the corpse
   */
  getDisplayName: function() {
    return this.name;
  },

  /**
   * Heartbeat - corpse decay
   * Corpses disappear after decayTime expires
   */
  heartbeat: function(entityManager) {
    // Check if corpse has expired
    const age = (Date.now() - this.createdAt) / 1000; // age in seconds

    if (age >= this.decayTime) {
      const room = this.location?.room;

      // Notify room of decay
      if (room) {
        entityManager.notifyRoom(room,
          `\x1b[90m${this.name} decays into dust.\x1b[0m`);
      }

      // Drop all items to the room before decaying
      if (this.inventory && this.inventory.length > 0) {
        for (const itemId of [...this.inventory]) {
          const item = entityManager.get(itemId);
          if (item && room) {
            entityManager.move(itemId, { type: 'room', room: room });
            console.log(`  💀 ${item.name} fell from decayed corpse`);
          }
        }
      }

      // Remove corpse from game
      entityManager.disableHeartbeat(this.id);
      entityManager.objects.delete(this.id);

      console.log(`  💀 Corpse decayed: ${this.id}`);
    }
  }
};
