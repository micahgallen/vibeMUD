/**
 * Hot Tub Room Definition
 *
 * Handles the interior of the hot tub with toggle-based effects
 * that send periodic messages via heartbeat.
 */

module.exports = {
  type: 'room',

  /**
   * Initialize the room with effect tracking
   */
  initialize(entityManager) {
    if (!this.activeEffects) {
      this.activeEffects = {
        jets: { active: false, startTime: 0 },
        bubbles: { active: false, startTime: 0 },
        steam: { active: false, startTime: 0 },
        lights: { active: false }
      };
    }
  },

  /**
   * Heartbeat - sends periodic messages for active effects
   */
  heartbeat(entityManager) {
    // Ensure activeEffects is initialized
    if (!this.activeEffects) {
      this.initialize(entityManager);
      return;
    }

    const now = Date.now();
    const twoMinutes = 120000; // 2 minutes in milliseconds
    const colors = require('../core/colors');

    // Check jets
    if (this.activeEffects.jets.active) {
      const elapsed = now - this.activeEffects.jets.startTime;
      if (elapsed >= twoMinutes) {
        // Auto-shutoff after 2 minutes
        this.activeEffects.jets.active = false;
        entityManager.notifyRoom(this.id, colors.info("The massage jets slowly wind down and shut off."));
        entityManager.markDirty(this.id);
      } else {
        // Send periodic message
        const messages = [
          "The jets continue their therapeutic assault, kneading away stress.",
          "Powerful water streams pummel your muscles with relentless care.",
          "The jets whirr contentedly, doing what jets do best.",
          "Water pressure massages away tensions you forgot you had."
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        entityManager.notifyRoom(this.id, colors.highlight(msg));
      }
    }

    // Check bubbles
    if (this.activeEffects.bubbles.active) {
      const elapsed = now - this.activeEffects.bubbles.startTime;
      if (elapsed >= twoMinutes) {
        // Auto-shutoff after 2 minutes
        this.activeEffects.bubbles.active = false;
        entityManager.notifyRoom(this.id, colors.info("The bubbles gradually subside to a gentle fizz, then stop."));
        entityManager.markDirty(this.id);
      } else {
        // Send periodic message
        const messages = [
          "Thousands of bubbles continue to tickle and pop around you.",
          "The water churns with effervescent enthusiasm.",
          "Bubbles rise and dance in an endless aquatic celebration.",
          "The fizzing, bubbling water creates a champagne-like ambiance."
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        entityManager.notifyRoom(this.id, colors.highlight(msg));
      }
    }

    // Check steam
    if (this.activeEffects.steam.active) {
      const elapsed = now - this.activeEffects.steam.startTime;
      if (elapsed >= twoMinutes) {
        // Auto-shutoff after 2 minutes
        this.activeEffects.steam.active = false;
        entityManager.notifyRoom(this.id, colors.info("The steam generator shuts off, and the fog slowly dissipates."));
        entityManager.markDirty(this.id);
      } else {
        // Send periodic message
        const messages = [
          "Thick steam continues to rise, obscuring the world in therapeutic fog.",
          "The air remains heavy with moisture and relaxation.",
          "Steam swirls around you in languid, lazy spirals.",
          "The fog persists, creating a private world of warm vapor."
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        entityManager.notifyRoom(this.id, colors.highlight(msg));
      }
    }
  },

  /**
   * Get the appropriate room description based on lights state
   */
  getDescription() {
    if (!this.activeEffects) {
      this.activeEffects = {
        jets: { active: false, startTime: 0 },
        bubbles: { active: false, startTime: 0 },
        steam: { active: false, startTime: 0 },
        lights: { active: false }
      };
    }

    const baseDescription = "You're immersed in perfectly heated water, your muscles relaxing despite any philosophical objections they might have had. The rooftop lounge spreads out around you, though from this vantage point everything is softened by rising steam. The Sesame Street skyline stretches beyond, a panorama of whimsy and questionable zoning decisions. Beside you, a waterproof control panel gleams with buttons promising various aquatic experiences.";

    if (this.activeEffects.lights.active) {
      return baseDescription + " Chromotherapy lights pulse beneath the surface in a mesmerizing sequence of reds, blues, greens, and purples, painting the water in soothing, alien hues. The distant sound of the martini bar mingles with the gentle hum of jets on standby.";
    } else {
      return baseDescription + " The chromotherapy lights are currently off, leaving the water its natural, unenhanced color. The distant sound of the martini bar mingles with the gentle hum of jets on standby.";
    }
  }
};
