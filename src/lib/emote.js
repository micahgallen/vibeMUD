/**
 * Emote Definition - Base template for all emotes
 * Provides common behavior for social interaction commands
 *
 * Emotes use prototypal inheritance:
 * - This file defines the behavior (execute function)
 * - Individual emote JSON files provide data (messages, target requirements)
 *
 * Advanced Features:
 * - Dynamic messages: Messages can be arrays that cycle based on player state
 * - Player state tracking: Emotes can maintain state like tauntIndex
 * - Lifecycle hooks: beforeExecute, afterExecute for custom behavior
 */

const { getDisplayName } = require('../utils/playerDisplay');

module.exports = {
  type: "emote",
  category: "social",
  requiresLogin: true,

  /**
   * Get a message from the messages object
   * Handles both static strings and dynamic arrays
   */
  _getMessage: function(messageKey, player, entityManager) {
    const msg = this.messages[messageKey];

    if (!msg) return null;

    // If message is an array, select based on player state
    if (Array.isArray(msg)) {
      // Initialize player state if needed
      const stateKey = this.stateKey || `${this.id}Index`;
      if (typeof player[stateKey] === 'undefined') {
        player[stateKey] = 0;
        entityManager.markDirty(player.id);
      }

      // Get message at current index
      const index = player[stateKey] % msg.length;
      return msg[index];
    }

    // Static string message
    return msg;
  },

  /**
   * Update player state after emote execution
   * Used for rotating messages (like taunt)
   */
  _updateState: function(player, entityManager) {
    if (!this.rotatingMessages) return;

    const stateKey = this.stateKey || `${this.id}Index`;

    // Initialize if needed
    if (typeof player[stateKey] === 'undefined') {
      player[stateKey] = 0;
    }

    // Increment and wrap
    player[stateKey] = (player[stateKey] + 1) % this.rotatingMessages;
    entityManager.markDirty(player.id);
  },

  /**
   * Notify target entity of emote (for NPC trigger responses)
   */
  _notifyTargetEntity: function(emoteName, actor, target, entityManager) {
    // Check if target is an NPC with emote trigger handling
    if (target.type === 'npc' && typeof target.onEmoteReceived === 'function') {
      target.onEmoteReceived(emoteName, actor, entityManager);
    }
  },

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

    // Call beforeExecute hook if defined
    if (this.beforeExecute && typeof this.beforeExecute === 'function') {
      this.beforeExecute(session, args, entityManager, colors);
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
        const selfMsg = this._getMessage('self', player, entityManager);
        if (selfMsg) {
          session.sendLine('');
          session.sendLine(colors.emote(selfMsg));
          session.sendLine('');

          // Notify room (if self message has room variant)
          const selfRoomMsg = this._getMessage('selfRoom', player, entityManager);
          if (selfRoomMsg) {
            const roomMsg = selfRoomMsg.replace('{actor}', getDisplayName(player));
            entityManager.notifyRoom(room.id, colors.emote(roomMsg), player.id);
          }
        } else {
          session.sendLine(colors.error(`You can't ${this.name} yourself.`));
        }

        // Update state and call afterExecute
        this._updateState(player, entityManager);
        if (this.afterExecute && typeof this.afterExecute === 'function') {
          this.afterExecute(session, args, entityManager, colors);
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

      const playerTarget = playersInRoom.find(s =>
        s.player.name.toLowerCase().startsWith(targetName)
      );

      if (playerTarget) {
        target = playerTarget;
      } else {
        // Check for NPCs in the room
        const npcsInRoom = Array.from(entityManager.objects.values()).filter(obj =>
          obj.type === 'npc' &&
          obj.currentRoom === room.id
        );

        const npcTarget = npcsInRoom.find(npc => {
          const nameLower = npc.name.toLowerCase();
          // Check if name starts with target
          if (nameLower.startsWith(targetName)) return true;
          // Check if any keyword matches
          if (npc.keywords && Array.isArray(npc.keywords)) {
            return npc.keywords.some(keyword =>
              keyword.toLowerCase() === targetName ||
              keyword.toLowerCase().startsWith(targetName)
            );
          }
          return false;
        });

        if (npcTarget) {
          // Create a pseudo-session object for NPC
          target = { player: npcTarget, isNPC: true };
        } else {
          session.sendLine(colors.error(`You don't see '${targetName}' here.`));
          return;
        }
      }
    }

    // Execute emote based on whether there's a target
    if (target) {
      // Targeted emote
      const targetPlayer = target.player;

      // Get dynamic messages
      const firstPersonMsg = this._getMessage('firstPerson', player, entityManager);
      const secondPersonMsg = this._getMessage('secondPerson', player, entityManager);
      const thirdPersonMsg = this._getMessage('thirdPerson', player, entityManager);

      // Message to actor (first person)
      if (firstPersonMsg) {
        const actorMsg = firstPersonMsg.replace('{target}', colors.playerName(getDisplayName(targetPlayer)));
        session.sendLine('');
        session.sendLine(colors.emote(actorMsg));
        session.sendLine('');
      }

      // Message to target (second person) - only if target is a player with session
      if (secondPersonMsg && !target.isNPC && target.sendLine) {
        const targetMsg = secondPersonMsg.replace('{actor}', colors.playerName(getDisplayName(player)));
        target.sendLine('');
        target.sendLine(colors.emote(targetMsg));
        target.sendLine('');
      }

      // Message to room (third person)
      if (thirdPersonMsg) {
        const roomMsg = thirdPersonMsg
          .replace('{actor}', getDisplayName(player))
          .replace('{target}', getDisplayName(targetPlayer));

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
      }

      // Notify target entity if it has emote trigger handling
      this._notifyTargetEntity(this.name, player, targetPlayer, entityManager);

    } else {
      // Untargeted emote
      const untargetedMsg = this._getMessage('untargeted', player, entityManager);

      if (!untargetedMsg) {
        session.sendLine(colors.error(`The ${this.name} emote requires a target.`));
        return;
      }

      // Message to actor
      session.sendLine('');
      session.sendLine(colors.emote(untargetedMsg));
      session.sendLine('');

      // Message to room
      const untargetedRoomMsg = this._getMessage('untargetedRoom', player, entityManager);
      if (untargetedRoomMsg) {
        const roomMsg = untargetedRoomMsg.replace('{actor}', getDisplayName(player));
        entityManager.notifyRoom(room.id, colors.emote(roomMsg), player.id);
      }
    }

    // Update state for rotating messages
    this._updateState(player, entityManager);

    // Call afterExecute hook if defined
    if (this.afterExecute && typeof this.afterExecute === 'function') {
      this.afterExecute(session, args, entityManager, colors);
    }
  }
};
