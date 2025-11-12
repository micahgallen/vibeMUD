/**
 * Room Definition
 * Base definition for all rooms
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  type: 'room',
  name: 'A Room',
  description: 'You are in a room.',
  exits: {},
  items: [],

  /**
   * Room heartbeat - respawns NPCs that have despawned
   * Checks the room's 'npcs' array and respawns any missing NPCs
   */
  heartbeat: function(entityManager) {
    // Only process if this room has NPCs assigned
    if (!this.npcs || this.npcs.length === 0) return;

    for (const npcId of this.npcs) {
      // Check if NPC exists in the entity manager
      const existingNpc = entityManager.get(npcId);

      if (!existingNpc) {
        // NPC is missing, respawn it
        this._respawnNpc(npcId, entityManager);
      }
    }
  },

  /**
   * Respawn an NPC by loading it from disk and re-registering
   */
  _respawnNpc: function(npcId, entityManager) {
    try {
      // Try to find the NPC file in world directories
      const searchPaths = [
        path.join(__dirname, '../world/sesame_street/npcs', `${npcId}.json`),
        path.join(__dirname, '../world/newbie_realm/npcs', `${npcId}.json`)
      ];

      let npcFilePath = null;
      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          npcFilePath = searchPath;
          break;
        }
      }

      if (!npcFilePath) {
        console.warn(`  ⚠️  Cannot respawn ${npcId}: file not found`);
        return;
      }

      // Load the NPC data from disk
      const data = fs.readFileSync(npcFilePath, 'utf8');
      const instanceData = JSON.parse(data);

      // Handle definition-based NPCs (prototypal inheritance)
      let npc;
      if (instanceData.definition) {
        const definition = entityManager.loadDefinition(instanceData.definition);
        if (definition) {
          npc = Object.create(definition);
          Object.assign(npc, instanceData);
        } else {
          npc = instanceData;
        }
      } else {
        npc = instanceData;
      }

      // Re-register with entity manager
      entityManager.objects.set(npc.id, npc);

      // Re-enable heartbeat if the NPC has one
      if (npc.heartbeatInterval) {
        entityManager.enableHeartbeat(npc.id, npc.heartbeatInterval);
      }

      console.log(`  ♻️  Respawned ${npc.name} (${npc.id}) in ${this.name}`);

      // Optionally notify players in the room
      entityManager.notifyRoom(this.id, `\x1b[36m${npc.name} appears.\x1b[0m`);

    } catch (error) {
      console.error(`  ❌ Error respawning ${npcId}:`, error.message);
    }
  }
};
