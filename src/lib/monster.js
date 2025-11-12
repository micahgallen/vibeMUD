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
   * Wandering heartbeat - NPC moves randomly between rooms or speaks dialogue
   * This function is inherited by all monsters that have wanders: true
   */
  heartbeat: function(entityManager) {
    if (!this.wanders) return;

    // 30% chance to speak instead of wandering (if dialogue exists)
    if (this.dialogue && this.dialogue.length > 0 && Math.random() < 0.3) {
      const randomLine = this.dialogue[Math.floor(Math.random() * this.dialogue.length)];
      entityManager.notifyRoom(this.currentRoom, `\x1b[33m${randomLine}\x1b[0m`);
      console.log(`  💬 ${this.name} says: "${randomLine}"`);
      return;
    }

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
  },

  /**
   * Handle emote received from a player
   * Checks emote_triggers configuration and executes appropriate response
   */
  onEmoteReceived: function(emoteName, actor, entityManager) {
    // Check if this NPC has emote triggers configured
    if (!this.emote_triggers || !this.emote_triggers[emoteName]) {
      return;
    }

    const trigger = this.emote_triggers[emoteName];
    const roomId = this.currentRoom;

    // Display any immediate messages
    if (trigger.messages && trigger.messages.length > 0) {
      const messageDelay = trigger.message_delay || 1; // seconds between messages

      trigger.messages.forEach((msg, index) => {
        setTimeout(() => {
          const formattedMsg = msg
            .replace('{actor}', actor.name)
            .replace('{npc}', this.name);
          entityManager.notifyRoom(roomId, `\x1b[36m${formattedMsg}\x1b[0m`);
        }, index * messageDelay * 1000);
      });
    }

    // Execute the trigger effect after messages complete
    const totalMessageTime = trigger.messages ? trigger.messages.length * (trigger.message_delay || 1) * 1000 : 0;

    setTimeout(() => {
      this._executeTriggerEffect(trigger, actor, entityManager);
    }, totalMessageTime);
  },

  /**
   * Execute the effect specified by an emote trigger
   */
  _executeTriggerEffect: function(trigger, actor, entityManager) {
    switch (trigger.effect) {
      case 'despawn':
        // Remove NPC from the game
        console.log(`  💨 ${this.name} despawned (triggered by ${actor.name})`);
        entityManager.notifyRoom(this.currentRoom,
          `\x1b[36m${this.name} disappears.\x1b[0m`);

        // Stop wandering
        if (this.wanders) {
          this.wanders = false;
        }

        // Remove from heartbeats
        if (entityManager.heartbeats.has(this.id)) {
          entityManager.heartbeats.delete(this.id);
        }

        // Remove from entity manager
        entityManager.objects.delete(this.id);
        break;

      case 'emote':
        // Trigger another emote from the NPC
        if (trigger.emote_name && global.commandDispatcher) {
          const emoteCmd = global.commandDispatcher.getCommand(trigger.emote_name);
          if (emoteCmd) {
            // Create a pseudo-session for the NPC
            const npcSession = {
              player: this,
              sendLine: (msg) => {
                // NPCs don't have screens, but we can log or notify room
                entityManager.notifyRoom(this.currentRoom, msg);
              },
              prompt: () => {}
            };

            // Execute the emote (untargeted)
            emoteCmd.execute(npcSession, '', entityManager, require('../core/colors'));
          }
        }
        break;

      case 'respawn':
        // Re-enable wandering if it was disabled
        if (trigger.respawn_delay) {
          setTimeout(() => {
            this.wanders = true;
            console.log(`  ♻️  ${this.name} respawned`);
          }, trigger.respawn_delay * 1000);
        }
        break;

      default:
        console.warn(`Unknown trigger effect: ${trigger.effect}`);
    }
  }
};
