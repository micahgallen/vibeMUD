/**
 * cast command
 * Cast a spell on yourself or a target
 */

const magic = require('../systems/magic');
const mana = require('../systems/mana');
const combat = require('../systems/combat');

module.exports = {
  id: "cast",
  name: "cast",
  aliases: ["c", "spell"],
  category: "magic",
  description: "Cast a magical spell",
  usage: "cast <spell name> [target]",
  help: "Cast a spell by name. Some spells require a target, others affect yourself or the room. Examples:\n  cast magic missile goblin\n  cast heal\n  cast shield bob\n  cast weaken troll",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Check if player has mana pool
    if (!player.maxMp) {
      session.sendLine(colors.error('You have no magical ability!'));
      return;
    }

    // Parse arguments: spell name and optional target
    if (!args || args.trim().length === 0) {
      session.sendLine(colors.error('Cast what? Usage: cast <spell name> [target]'));
      session.sendLine(colors.dim('Example: cast magic missile goblin'));
      return;
    }

    // Split args into spell name and target
    const parts = args.trim().split(/\s+/);
    let spellName = '';
    let targetName = '';

    // Parse spell name (can be multi-word)
    // Strategy: try longest match first, then progressively shorter
    let spell = null;
    for (let i = parts.length; i >= 1; i--) {
      const testName = parts.slice(0, i).join(' ');
      spell = magic.findSpellByName(testName);
      if (spell) {
        spellName = testName;
        targetName = parts.slice(i).join(' ');
        break;
      }
    }

    if (!spell) {
      session.sendLine(colors.error(`Unknown spell: ${args}`));
      return;
    }

    // Get target entity (if specified)
    let targetId = null;

    if (targetName) {
      // Find target in current room
      const room = entityManager.get(player.currentRoom);

      if (!room) {
        session.sendLine(colors.error('You are nowhere!'));
        return;
      }

      // Search for target
      targetId = findTarget(targetName, player, room, entityManager);

      if (!targetId) {
        session.sendLine(colors.error(`You don't see "${targetName}" here.`));
        return;
      }
    }

    // Cast the spell
    const result = magic.cast(player.id, spell.id, targetId, entityManager);

    // Display result
    if (!result.success) {
      session.sendLine(colors.error(result.message));
      return;
    }

    // Success messages are sent by the magic system via notifyPlayer
    // Also show mana cost
    session.sendLine(colors.dim(`[${spell.manaCost} MP] ${mana.getManaStatus(player)}`));

    // Check if spell is aggressive and should start combat
    const target = entityManager.get(targetId);
    if (target && target.type === 'npc' && !player.combat && !target.combat) {
      // Check if spell has aggressive effects (damage, debuff, or dot)
      const hasAggressiveEffect = result.effects?.some(effect =>
        effect.type === 'damage' || effect.type === 'debuff' || effect.type === 'dot'
      );

      if (hasAggressiveEffect) {
        // Start combat
        combat.engage(player.id, targetId, entityManager);
      }
    }

    // Check for special effects
    if (result.effects) {
      for (const effect of result.effects) {
        if (effect.type === 'damage' && effect.targetDied) {
          if (target) {
            // Handle death through combat system
            // If spell destroys corpse, pass options to skip corpse creation
            if (spell.destroyCorpse) {
              combat.handleDeath(targetId, player.id, entityManager, {
                skipCorpse: true,
                annihilationMessage: colors.dim('The cosmic energy disintegrates even the remains - nothing is left.')
              });
              console.log(`  💀 ${target.name} annihilated by ${spell.name} - no corpse created`);
            } else {
              combat.handleDeath(targetId, player.id, entityManager);
            }
          }
        }
      }
    }
  }
};

/**
 * Find a target entity in the room
 * @param {string} targetName - Name to search for
 * @param {object} player - The player searching
 * @param {object} room - The current room
 * @param {object} entityManager - The entity manager
 * @returns {string|null} - Target entity ID or null
 */
function findTarget(targetName, player, room, entityManager) {
  const searchName = targetName.toLowerCase();

  // Check for "me" or "self"
  if (searchName === 'me' || searchName === 'self') {
    return player.id;
  }

  // Get all entities in the room
  const entitiesInRoom = [];

  // Add players in room
  for (const obj of entityManager.objects.values()) {
    if (obj.type === 'player' && obj.currentRoom === room.id) {
      entitiesInRoom.push(obj);
    }
  }

  // Add NPCs in room
  for (const obj of entityManager.objects.values()) {
    if (obj.type === 'npc' && obj.currentRoom === room.id) {
      entitiesInRoom.push(obj);
    }
  }

  // Search for exact name match first
  for (const entity of entitiesInRoom) {
    if (entity.name.toLowerCase() === searchName) {
      return entity.id;
    }
  }

  // Then try partial match
  for (const entity of entitiesInRoom) {
    if (entity.name.toLowerCase().includes(searchName)) {
      return entity.id;
    }
  }

  return null;
}
