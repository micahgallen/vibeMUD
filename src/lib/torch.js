/**
 * Torch Definition
 * Burning torch that consumes fuel over time
 */

module.exports = {
  type: 'item',
  name: 'Burning Torch',
  description: 'A wooden torch wrapped in oil-soaked cloth, burning brightly.',
  isLit: true,
  fuelRemaining: 300, // seconds
  providesLight: true,

  /**
   * Torch heartbeat - burns fuel and eventually goes out
   * This function is inherited by all torch instances
   */
  heartbeat: function(entityManager) {
    if (!this.isLit) return;

    // Burn 10 seconds of fuel each heartbeat
    this.fuelRemaining = (this.fuelRemaining || 300) - 10;

    if (this.fuelRemaining <= 30 && this.fuelRemaining > 20) {
      // Warn when fuel is low
      if (this.location?.type === 'inventory') {
        entityManager.notifyPlayer(this.location.owner,
          '\x1b[33mYour torch flickers and starts to dim...\x1b[0m');
      } else if (this.location?.type === 'room') {
        entityManager.notifyRoom(this.location.room,
          '\x1b[33mA torch flickers and starts to dim...\x1b[0m');
      }
    }

    if (this.fuelRemaining <= 0) {
      // Torch burns out
      this.isLit = false;
      this.fuelRemaining = 0;
      this.name = 'Burnt-Out Torch';
      this.description = 'This torch has burned out completely. It might be refuelable.';
      this.providesLight = false;

      // Notify holders/room
      if (this.location?.type === 'inventory') {
        entityManager.notifyPlayer(this.location.owner,
          '\x1b[31mYour torch burns out!\x1b[0m');
      } else if (this.location?.type === 'room') {
        entityManager.notifyRoom(this.location.room,
          '\x1b[31mA torch burns out and goes dark.\x1b[0m');
      }

      // Disable heartbeat when burnt out
      entityManager.disableHeartbeat(this.id);
      console.log(`  🔥 Torch ${this.id} burned out`);
    }

    entityManager.markDirty(this.id);
  }
};
