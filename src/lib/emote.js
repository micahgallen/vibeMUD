/**
 * Emote Definition - Base template for all emotes
 * Provides common behavior for social interaction commands
 *
 * Emotes use prototypal inheritance:
 * - This file defines the behavior (execute function)
 * - Individual emote JSON files provide data (messages, target requirements)
 */

module.exports = {
  type: "emote",
  category: "social",
  requiresLogin: true,

  /**
   * Execute the emote
   * Uses instance data from the JSON file (this.messages, this.targetRequired, etc.)
   */
  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const room = entityManager.get(player.currentRoom);

    if (!room) {
      session.sendLine(colors.error('You are nowhere. The void swallows your emotions.'));
      return;
    }

    // Parse target if provided
    const targetName = (args || '').toLowerCase().trim();
    let target = null;

    // Check if emote requires a target
    if (this.targetRequired && !targetName) {
      const usage = this.usageMessage || `Usage: ${this.name} <player>`;
      session.sendLine(colors.error(usage));
      return;
    }

    // If target is provided, find them
    if (targetName) {
      // Check for self-emote
      if (targetName === 'self' || targetName === 'me' || targetName === player.name.toLowerCase()) {
        if (this.messages.self) {
          session.sendLine('');
          session.sendLine(colors.emote(this.messages.self));
          session.sendLine('');

          // Notify room (if self message has room variant)
          if (this.messages.selfRoom) {
            const roomMsg = this.messages.selfRoom.replace('{actor}', player.name);
            entityManager.notifyRoom(room.id, colors.emote(roomMsg), player.id);
          }
        } else {
          session.sendLine(colors.error(`You can't ${this.name} yourself.`));
        }
        return;
      }

      // Find target player in the room
      const playersInRoom = Array.from(entityManager.sessions.values()).filter(s =>
        s.state === 'playing' &&
        s.player &&
        s.player.currentRoom === room.id &&
        s.player.id !== player.id
      );

      target = playersInRoom.find(s =>
        s.player.name.toLowerCase().startsWith(targetName)
      );

      if (!target) {
        session.sendLine(colors.error(`You don't see '${targetName}' here.`));
        return;
      }
    }

    // Execute emote based on whether there's a target
    if (target) {
      // Targeted emote
      const targetPlayer = target.player;

      // Message to actor (first person)
      const actorMsg = this.messages.firstPerson
        .replace('{target}', colors.playerName(targetPlayer.name));
      session.sendLine('');
      session.sendLine(colors.emote(actorMsg));
      session.sendLine('');

      // Message to target (second person)
      const targetMsg = this.messages.secondPerson
        .replace('{actor}', colors.playerName(player.name));
      target.sendLine('');
      target.sendLine(colors.emote(targetMsg));
      target.sendLine('');

      // Message to room (third person)
      const roomMsg = this.messages.thirdPerson
        .replace('{actor}', player.name)
        .replace('{target}', targetPlayer.name);

      // Notify everyone except actor and target
      const othersInRoom = Array.from(entityManager.sessions.values()).filter(s =>
        s.state === 'playing' &&
        s.player &&
        s.player.currentRoom === room.id &&
        s.player.id !== player.id &&
        s.player.id !== targetPlayer.id
      );

      othersInRoom.forEach(s => {
        s.sendLine('');
        s.sendLine(colors.emote(roomMsg));
        s.sendLine('');
      });

    } else {
      // Untargeted emote
      if (!this.messages.untargeted) {
        session.sendLine(colors.error(`The ${this.name} emote requires a target.`));
        return;
      }

      // Message to actor
      session.sendLine('');
      session.sendLine(colors.emote(this.messages.untargeted));
      session.sendLine('');

      // Message to room
      if (this.messages.untargetedRoom) {
        const roomMsg = this.messages.untargetedRoom.replace('{actor}', player.name);
        entityManager.notifyRoom(room.id, colors.emote(roomMsg), player.id);
      }
    }
  }
};
