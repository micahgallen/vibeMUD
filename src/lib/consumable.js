/**
 * Consumable Item Definition
 * For food, potions, scrolls, and other consumable items
 *
 * Inherits from: item.js
 * Inherited by: Templates like apple_001.json, potion_001.json
 */

const item = require('./item');

module.exports = Object.create(item, {
  // Override stackable for consumables - they should stack by default
  stackable: {
    value: true,
    writable: true,
    enumerable: true,
    configurable: true
  },

  itemType: {
    value: 'consumable',
    writable: false,
    enumerable: true,
    configurable: false
  },

  isConsumable: {
    value: true,
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Consume this item
   * @param {Object} consumer - The entity consuming (usually a player)
   * @param {Object} entityManager - The entity manager
   * @returns {Object} Result with success, message, and effects
   */
  consume: {
    value: function(consumer, entityManager) {
      const messages = [];
      let healed = 0;
      let manaRestored = 0;

      // Apply healing
      if (this.healAmount && consumer.hp !== undefined && consumer.maxHp !== undefined) {
        healed = Math.min(this.healAmount, consumer.maxHp - consumer.hp);
        consumer.hp += healed;
        entityManager.markDirty(consumer.id);

        if (healed > 0) {
          messages.push(`You heal ${healed} HP.`);
        }
      }

      // Apply mana restoration
      if (this.manaAmount && consumer.mana !== undefined && consumer.maxMana !== undefined) {
        manaRestored = Math.min(this.manaAmount, consumer.maxMana - consumer.mana);
        consumer.mana += manaRestored;
        entityManager.markDirty(consumer.id);

        if (manaRestored > 0) {
          messages.push(`You restore ${manaRestored} mana.`);
        }
      }

      // Handle alcoholic drinks
      if (this.alcoholic) {
        this.applyDrunkEffect(consumer, entityManager);
        messages.push('You feel a warm buzz spreading through you...');
      }

      // Apply status effects
      if (this.effects && Array.isArray(this.effects)) {
        this.applyEffects(consumer, entityManager);
        messages.push('You feel strange effects...');
      }

      // Handle stacking or destruction
      if (this.quantity && this.quantity > 1) {
        this.quantity--;
        entityManager.markDirty(this.id);
      } else {
        // Destroy the item instance
        entityManager.destroy(this.id);
      }

      const baseMessage = `You consume ${this.name}.`;
      const fullMessage = messages.length > 0
        ? `${baseMessage} ${messages.join(' ')}`
        : baseMessage;

      return {
        success: true,
        message: fullMessage,
        healed,
        manaRestored
      };
    },
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Apply status effects from consuming this item
   * @param {Object} consumer - The entity
   * @param {Object} entityManager - The entity manager
   */
  applyEffects: {
    value: function(consumer, entityManager) {
      if (!this.effects || !Array.isArray(this.effects)) {
        return;
      }

      // Apply each effect
      for (const effect of this.effects) {
        switch (effect.type) {
          case 'poison':
            // TODO: Implement poison system
            console.log(`Applied poison to ${consumer.id}`);
            break;

          case 'buff':
            // TODO: Implement buff system
            console.log(`Applied buff ${effect.name} to ${consumer.id}`);
            break;

          case 'debuff':
            // TODO: Implement debuff system
            console.log(`Applied debuff ${effect.name} to ${consumer.id}`);
            break;

          case 'instant_damage':
            if (effect.amount && consumer.hp !== undefined) {
              consumer.hp = Math.max(0, consumer.hp - effect.amount);
              entityManager.markDirty(consumer.id);
            }
            break;

          default:
            console.warn(`Unknown effect type: ${effect.type}`);
        }
      }
    },
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Apply drunk effect from consuming alcoholic beverages
   * @param {Object} consumer - The entity (usually a player)
   * @param {Object} entityManager - The entity manager
   */
  applyDrunkEffect: {
    value: function(consumer, entityManager) {
      if (!consumer.drunkState) {
        // Initialize drunk state
        consumer.drunkState = {
          level: 0,
          buffedStr: 0,
          buffedEnd: 0,
          nerfedInt: 0,
          nerfedWis: 0,
          startTime: Date.now(),
          lastEmote: 0,
          emoteCount: 0
        };
      }

      const alcoholStrength = this.alcoholStrength || 1;
      const state = consumer.drunkState;

      // Increase drunk level
      state.level += alcoholStrength;
      state.startTime = Date.now(); // Reset timer with each drink

      // Remove old buffs/nerfs before applying new ones
      if (consumer.strength !== undefined) {
        consumer.strength -= state.buffedStr;
      }
      if (consumer.constitution !== undefined) {
        consumer.constitution -= state.buffedEnd;
      }
      if (consumer.intelligence !== undefined) {
        consumer.intelligence += state.nerfedInt;
      }
      if (consumer.wisdom !== undefined) {
        consumer.wisdom += state.nerfedWis;
      }

      // Calculate new buffs/nerfs based on drunk level
      state.buffedStr = Math.min(Math.floor(state.level * 1.5), 5);
      state.buffedEnd = Math.min(Math.floor(state.level * 1.5), 5);
      state.nerfedInt = Math.min(Math.floor(state.level * 2), 6);
      state.nerfedWis = Math.min(Math.floor(state.level * 2), 6);

      // Apply new buffs/nerfs
      if (consumer.strength !== undefined) {
        consumer.strength += state.buffedStr;
      }
      if (consumer.constitution !== undefined) {
        consumer.constitution += state.buffedEnd;
      }
      if (consumer.intelligence !== undefined) {
        consumer.intelligence = Math.max(3, consumer.intelligence - state.nerfedInt);
      }
      if (consumer.wisdom !== undefined) {
        consumer.wisdom = Math.max(3, consumer.wisdom - state.nerfedWis);
      }

      // Set up drunk heartbeat if not already present
      if (!consumer.drunkHeartbeat) {
        consumer.drunkHeartbeat = true;
        this.startDrunkHeartbeat(consumer, entityManager);
      }

      entityManager.markDirty(consumer.id);
    },
    writable: false,
    enumerable: true,
    configurable: false
  },

  /**
   * Start the drunk heartbeat for a player
   * @param {Object} consumer - The player
   * @param {Object} entityManager - The entity manager
   */
  startDrunkHeartbeat: {
    value: function(consumer, entityManager) {
      // Drunk heartbeat - fires every ~10 seconds
      const drunkHandler = function() {
        const player = entityManager.get(consumer.id);
        if (!player || !player.drunkState) {
          // Player is gone or sobered up
          return;
        }

        const state = player.drunkState;
        const now = Date.now();
        const timeSinceDrink = (now - state.startTime) / 1000;

        // Drunk effect lasts 60 seconds
        if (timeSinceDrink >= 60) {
          // Sober up
          if (player.strength !== undefined) {
            player.strength -= state.buffedStr;
          }
          if (player.constitution !== undefined) {
            player.constitution -= state.buffedEnd;
          }
          if (player.intelligence !== undefined) {
            player.intelligence += state.nerfedInt;
          }
          if (player.wisdom !== undefined) {
            player.wisdom += state.nerfedWis;
          }

          delete player.drunkState;
          delete player.drunkHeartbeat;

          entityManager.notifyPlayer(player.id, "\x1b[33mYou feel the buzz wearing off. Your head clears.\x1b[0m");
          entityManager.markDirty(player.id);
          return; // Stop the heartbeat
        }

        // Random drunk emotes
        const timeSinceLastEmote = (now - state.lastEmote) / 1000;
        if (timeSinceLastEmote >= 8 && Math.random() < 0.6) {
          const drunkEmotes = [
            "*hic* You let out a loud burp!",
            "You stumble slightly and catch yourself on... wait, what were you leaning on?",
            "You feel the urge to tell everyone how much you love them. You resist. Barely.",
            "*hic!*",
            "You sway back and forth like a palm tree in a hurricane.",
            "Everything is just SO FUNNY right now. You giggle uncontrollably.",
            "You try to focus but your vision swims pleasantly.",
            "You feel invincible! Also possibly immortal. Definitely both.",
            "*BURRRP* Excuse you!",
            "You philosophically contemplate the nature of... uh... what was it again?",
            "Your coordination ain't what it used to be. (It was 30 seconds ago.)",
            "You briefly consider challenging someone to a fight. Then consider maybe another drink instead.",
            "You announce to no one in particular that you're 'totally fine.'",
            "*hic* You lean against something stable. You hope it's stable.",
            "Words are hard. Thinking is harder. Another drink? Perfect solution!"
          ];

          const emote = drunkEmotes[Math.floor(Math.random() * drunkEmotes.length)];
          entityManager.notifyPlayer(player.id, `\x1b[35m${emote}\x1b[0m`);

          // Also notify the room
          if (player.currentRoom) {
            const roomEmotes = [
              `${player.name} hiccups loudly.`,
              `${player.name} stumbles about with a goofy grin.`,
              `${player.name} burps magnificently.`,
              `${player.name} sways dangerously.`,
              `${player.name} giggles at something only they find funny.`,
              `${player.name} looks like they're having a GREAT time.`
            ];
            const roomEmote = roomEmotes[Math.floor(Math.random() * roomEmotes.length)];
            entityManager.notifyRoom(player.currentRoom, `\x1b[33m${roomEmote}\x1b[0m`, player.id);
          }

          state.lastEmote = now;
          state.emoteCount++;
        }

        // Schedule next heartbeat in 10 seconds
        setTimeout(drunkHandler, 10000);
      };

      // Start the first heartbeat
      setTimeout(drunkHandler, 10000);
    },
    writable: false,
    enumerable: true,
    configurable: false
  }
});
