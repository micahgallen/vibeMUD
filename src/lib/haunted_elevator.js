/**
 * Haunted Elevator Definition
 * An elevator that occasionally experiences... supernatural events
 * Based on The Shining's iconic elevator of blood
 */

module.exports = {
  type: 'room',

  /**
   * Haunted elevator heartbeat - periodically manifests disturbing phenomena
   * This function is inherited by elevator room instances with this definition
   */
  heartbeat: function(entityManager) {
    // Get all players currently in the elevator
    const playersInElevator = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'player' &&
      obj.currentRoom === this.id &&
      entityManager.sessions.has(obj.id) // Only active players
    );

    // Only manifest phenomena if someone is present to witness it
    if (playersInElevator.length === 0) return;

    // Random chance of manifestation (20% chance per heartbeat)
    if (Math.random() > 0.2) return;

    const manifestations = [
      // Blood-related phenomena (the classic)
      {
        message: '\x1b[31mA thin rivulet of crimson liquid seeps from beneath the elevator doors, pooling on the floor at your feet. The smell of copper fills the air.\x1b[0m',
        sound: true
      },
      {
        message: '\x1b[31mThe elevator walls begin to weep. Not water. Never water. Thick crimson streams run down the gilded mirrors, distorting your reflection into something drowning.\x1b[0m',
        sound: false
      },
      {
        message: '\x1b[31mA wave of blood crashes against the elevator doors from outside with a sound like a tidal wave. The doors buckle but hold. The muzak continues playing.\x1b[0m',
        sound: true
      },
      {
        message: '\x1b[31mThe carpet beneath your feet squelches, suddenly saturated. You don\'t look down. You can feel it soaking through your shoes. You still don\'t look down.\x1b[0m',
        sound: false
      },

      // Other supernatural events
      {
        message: '\x1b[33mThe elevator shudders and drops several feet before catching itself. The floor indicator spins wildly—2, 5, 3, 1, 4—before settling on a floor that doesn\'t exist.\x1b[0m',
        sound: true
      },
      {
        message: '\x1b[35mFor just a moment, your reflection in the mirror isn\'t you. It\'s someone else. Someone dead. Someone who died here. Then you blink and it\'s you again. Probably.\x1b[0m',
        sound: false
      },
      {
        message: '\x1b[36mThe muzak cuts out mid-note. In the silence, you hear breathing that isn\'t yours. Heavy, labored breathing, like someone drowning. Then the music resumes as if nothing happened.\x1b[0m',
        sound: true
      },
      {
        message: '\x1b[33mThe elevator doors open briefly onto a hallway you\'ve never seen before. The carpet pattern is different. The wallpaper is from 1921. A man in a tuxedo stands in the corridor, staring at you. The doors close. You\'re still on the same floor you started.\x1b[0m',
        sound: true
      },
      {
        message: 'The lights flicker. In that moment of darkness, you feel hands—cold, wet hands—brushing against your back. The lights return. You\'re alone. You were always alone.',
        sound: false
      },
      {
        message: '\x1b[31mWritten in condensation on the mirror, as if traced by a finger: REDRUM. Below it: GET OUT. Below that: TOO LATE.\x1b[0m',
        sound: false
      }
    ];

    // Select a random manifestation
    const manifestation = manifestations[Math.floor(Math.random() * manifestations.length)];

    // Notify all players in the elevator
    playersInElevator.forEach(player => {
      entityManager.notifyPlayer(player.id, '\n' + manifestation.message + '\n');

      // Optional sound effect notification
      if (manifestation.sound && Math.random() > 0.5) {
        setTimeout(() => {
          entityManager.notifyPlayer(player.id, '\x1b[90m*The elevator groans, metal straining against forces it was never designed to contain*\x1b[0m');
        }, 2000);
      }
    });

    // Log the event
    console.log(`  👻 The elevator manifested supernatural phenomena for ${playersInElevator.length} witness(es)`);

    // Occasionally update the room description temporarily
    if (Math.random() > 0.7) {
      const originalDescription = this.description;
      this.description = this.description + ' \x1b[31mThe walls are weeping crimson.\x1b[0m';
      entityManager.markDirty(this.id);

      // Restore original description after a while
      setTimeout(() => {
        this.description = originalDescription;
        entityManager.markDirty(this.id);
      }, 30000); // 30 seconds
    }
  }
};
