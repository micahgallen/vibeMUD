/**
 * EntityManager - Simple Object Architecture Prototype
 *
 * Everything is an object with an ID
 * One manager tracks them all
 * One move() function handles all location changes
 */

const fs = require('fs');
const path = require('path');

class EntityManager {
  constructor(dataDir = null) {
    // NEW: Separate storage for templates vs instances
    this.templates = new Map(); // id → template (static blueprints from world files)
    this.instances = new Map(); // id → instance (runtime objects, can be destroyed)
    this.players = new Map(); // id → player
    this.rooms = new Map(); // id → room
    this.definitions = new Map(); // name → definition (cached lib/*.js files)

    // LEGACY: Keep this.objects for backward compatibility during migration
    this.objects = new Map(); // id → object (will be phased out)

    this.dirtyObjects = new Set(); // IDs of objects that need saving
    // Default to src/data relative to this file's location
    this.dataDir = dataDir || path.join(__dirname, '../data');
    this.heartbeats = new Map(); // objectId → { interval, lastTick, enabled }
    this.sessions = new Map(); // playerId → session (for notifications)
  }

  // ========================================
  // Lifecycle Methods (clone/destroy)
  // ========================================

  /**
   * Clone a template to create a runtime instance
   * @param {string} templateId - ID of the template to clone
   * @param {object} overrides - Properties to set on instance (e.g., location)
   * @returns {object} The new instance
   */
  clone(templateId, overrides = {}) {
    const template = this.templates.get(templateId) || this.objects.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Generate unique instance ID
    const instanceId = `${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create instance with prototypal inheritance
    const instance = Object.create(template);
    Object.assign(instance, {
      id: instanceId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      isInstance: true,
      quantity: template.stackable ? 1 : undefined,
      ...overrides
    });

    // Register the instance in both new and legacy maps
    this.instances.set(instanceId, instance);
    this.objects.set(instanceId, instance); // Legacy compatibility

    // Add to location if specified
    if (instance.location) {
      this.addToLocation(instance);
    }

    console.log(`✨ Cloned ${templateId} → ${instanceId}`);
    return instance;
  }

  /**
   * Destroy an instance completely
   * @param {string} instanceId - ID of instance to destroy
   * @returns {boolean} True if destroyed, false if not found
   */
  destroy(instanceId) {
    const instance = this.instances.get(instanceId) || this.objects.get(instanceId);
    if (!instance) {
      console.warn(`Cannot destroy ${instanceId}: not found`);
      return false;
    }

    // Can't destroy templates (only instances)
    if (!instance.isInstance) {
      throw new Error(`Cannot destroy template ${instanceId}. Templates are immortal.`);
    }

    // Remove from current location
    this.removeFromLocation(instance);

    // Remove from all storage maps
    this.instances.delete(instanceId);
    this.objects.delete(instanceId); // Legacy compatibility

    // Remove from dirty tracking
    this.dirtyObjects.delete(instanceId);

    // Remove heartbeat if any
    if (this.heartbeats.has(instanceId)) {
      this.heartbeats.delete(instanceId);
    }

    console.log(`🗑️  Destroyed ${instanceId}`);
    return true;
  }

  /**
   * Get a template by ID
   * @param {string} templateId - Template ID
   * @returns {object|null} The template object
   */
  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  // ========================================
  // Loading
  // ========================================

  /**
   * Load a definition from src/lib/ (with caching)
   */
  loadDefinition(definitionName) {
    // Return cached definition if already loaded
    if (this.definitions.has(definitionName)) {
      return this.definitions.get(definitionName);
    }

    try {
      const defPath = path.join(__dirname, '../lib', `${definitionName}.js`);
      const definition = require(defPath);
      this.definitions.set(definitionName, definition);
      return definition;
    } catch (error) {
      console.warn(`  ⚠️  Definition '${definitionName}' not found`);
      return null;
    }
  }

  /**
   * Recursively discover all world directories
   */
  discoverWorldDirectories(dir, locations) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const fullPath = path.join(dir, entry.name);

      // Check if this directory has any content folders
      const hasContent = ['items', 'containers', 'rooms', 'npcs'].some(type =>
        fs.existsSync(path.join(fullPath, type))
      );

      if (hasContent) {
        locations.push({
          base: fullPath,
          types: ['items', 'containers', 'rooms', 'npcs']
        });
      }

      // Recursively check subdirectories
      this.discoverWorldDirectories(fullPath, locations);
    }
  }

  /**
   * Load all objects from disk
   * Supports prototypal inheritance via "definition" field
   * NEW: Separates templates (world items) from instances (player inventory)
   */
  loadAll() {
    console.log('📂 Loading all objects...');

    // Build locations list: data directory + all world directories (auto-discovered)
    const locations = [
      { base: this.dataDir, types: ['players'] } // Runtime save data (players only)
    ];

    // Auto-discover all world directories recursively
    const worldDir = path.join(__dirname, '../world');
    this.discoverWorldDirectories(worldDir, locations);

    for (const location of locations) {
      for (const type of location.types) {
        const dir = path.join(location.base, type);

        if (!fs.existsSync(dir)) {
          console.log(`  ⚠️  ${type}/ directory not found, skipping`);
          continue;
        }

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

        for (const file of files) {
          const filePath = path.join(dir, file);
          const data = fs.readFileSync(filePath, 'utf8');
          const jsonData = JSON.parse(data);

          let obj;
          if (jsonData.definition) {
            // Load definition and create object with prototypal inheritance
            const definition = this.loadDefinition(jsonData.definition);
            if (definition) {
              obj = Object.create(definition);
              Object.assign(obj, jsonData);
            } else {
              // Fallback if definition not found
              obj = jsonData;
            }
          } else {
            // No definition, use data directly
            obj = jsonData;
          }

          // Initialize purse for players and NPCs
          if (obj.type === 'player' || obj.type === 'npc') {
            this.initializePurse(obj);
          }

          // Initialize inventory and equipped for players if not present
          if (obj.type === 'player') {
            if (!obj.inventory) obj.inventory = [];
            if (!obj.equipped) obj.equipped = {};
          }

          // Store in appropriate map based on type and source
          if (type === 'players') {
            // Players go into players map
            this.players.set(obj.id, obj);
          } else if (type === 'rooms') {
            // Rooms go into rooms map
            this.rooms.set(obj.id, obj);
          } else if (type === 'items') {
            // Items from world files are TEMPLATES
            this.templates.set(obj.id, obj);
          } else if (type === 'npcs' || type === 'containers') {
            // NPCs and containers for now go in templates
            this.templates.set(obj.id, obj);
          }

          // LEGACY: Also store in objects map for backward compatibility
          this.objects.set(obj.id, obj);
        }

        console.log(`  ✓ Loaded ${files.length} ${type}`);
      }
    }

    const totalNew = this.templates.size + this.players.size + this.rooms.size + this.instances.size;
    console.log(`✅ Loaded ${this.objects.size} total objects (${this.templates.size} templates, ${this.instances.size} instances, ${this.players.size} players, ${this.rooms.size} rooms)\n`);

    // Spawn NPC starting inventories
    console.log('🎒 Spawning NPC inventories...');
    let npcInventoryCount = 0;
    for (const npc of this.objects.values()) {
      if ((npc.type === 'npc' || npc.type === 'monster') && npc.inventorySpawns) {
        this.spawnNPCInventory(npc);
        npcInventoryCount++;
      }
    }
    if (npcInventoryCount > 0) {
      console.log(`  ✓ Spawned inventory for ${npcInventoryCount} NPCs\n`);
    }

    // Spawn room fixtures
    console.log('🏛️  Spawning room fixtures...');
    let fixtureCount = 0;
    for (const room of this.rooms.values()) {
      if (room.fixtures) {
        fixtureCount += this.spawnRoomFixtures(room);
      }
    }
    if (fixtureCount > 0) {
      console.log(`  ✓ Spawned ${fixtureCount} fixtures\n`);
    }

    // Load player-owned instances
    console.log('🎒 Loading player inventories...');
    for (const player of this.players.values()) {
      this.loadPlayerInstances(player.id);
    }
  }

  /**
   * Spawn starting inventory for an NPC
   * @param {object} npc - The NPC instance
   */
  spawnNPCInventory(npc) {
    if (!npc.inventorySpawns || !Array.isArray(npc.inventorySpawns)) {
      return;
    }

    // Initialize inventory if needed
    if (!npc.inventory) {
      npc.inventory = [];
    }

    for (const spawn of npc.inventorySpawns) {
      const quantity = spawn.quantity || 1;

      for (let i = 0; i < quantity; i++) {
        // Clone item into NPC's inventory
        const item = this.clone(spawn.template, {
          location: { type: 'inventory', owner: npc.id }
        });

        // Auto-equip if specified
        if (spawn.equip) {
          if (item.definition === 'weapon' || item.__proto__.definition === 'weapon') {
            npc.equippedWeapon = item.id;
            item.isEquipped = true;
            this.markDirty(item.id);
          } else if (item.definition === 'armor' || item.__proto__.definition === 'armor') {
            if (!npc.equippedArmor) {
              npc.equippedArmor = {};
            }
            const slot = item.slot || 'body';
            npc.equippedArmor[slot] = item.id;
            item.isEquipped = true;
            this.markDirty(item.id);
          }
        }
      }
    }

    this.markDirty(npc.id);
  }

  /**
   * Spawn permanent fixtures in a room
   * @param {object} room - The room instance
   * @returns {number} Number of fixtures spawned
   */
  spawnRoomFixtures(room) {
    if (!room.fixtures || !Array.isArray(room.fixtures)) {
      return 0;
    }

    let count = 0;
    for (const templateId of room.fixtures) {
      const template = this.getTemplate(templateId);
      if (!template) {
        console.warn(`  ⚠️  Fixture template ${templateId} not found for room ${room.id}`);
        continue;
      }

      this.clone(templateId, {
        location: { type: 'room', room: room.id },
        isFixture: true,
        canTake: false
      });
      count++;
    }

    return count;
  }

  /**
   * Get all commands
   */
  getCommands() {
    return Array.from(this.objects.values())
      .filter(obj => obj.type === 'command');
  }

  /**
   * Find command by name or alias
   */
  findCommand(input) {
    const lowerInput = input.toLowerCase();
    return this.getCommands().find(cmd =>
      cmd.name === lowerInput || (cmd.aliases && cmd.aliases.includes(lowerInput))
    );
  }

  /**
   * Get any object by ID
   */
  get(id) {
    return this.objects.get(id);
  }

  /**
   * Get all objects of a type
   */
  getByType(type) {
    return Array.from(this.objects.values())
      .filter(obj => obj.type === type);
  }

  /**
   * Register a new object
   */
  register(obj) {
    if (this.objects.has(obj.id)) {
      throw new Error(`Object with id ${obj.id} already exists`);
    }
    this.objects.set(obj.id, obj);
    this.markDirty(obj.id);
  }

  // ========================================
  // THE KEY FUNCTION - Move Anything Anywhere
  // ========================================

  /**
   * Move any object to any location
   * This is the single source of truth for all location changes
   */
  move(objectId, newLocation) {
    const obj = this.get(objectId);

    if (!obj) {
      throw new Error(`Object ${objectId} not found`);
    }

    console.log(`🔄 Moving ${obj.id} (${obj.type})`);
    console.log(`   From: ${JSON.stringify(obj.location)}`);
    console.log(`   To:   ${JSON.stringify(newLocation)}`);

    // Step 1: Remove from old location
    this.removeFromLocation(obj);

    // Step 2: Update location
    obj.location = newLocation;
    obj.modifiedAt = new Date().toISOString();

    // Update currentRoom for players/NPCs when moving to a room
    if ((obj.type === 'player' || obj.type === 'npc') && newLocation.type === 'room') {
      obj.currentRoom = newLocation.room;
    }

    // Step 3: Add to new location
    this.addToLocation(obj);

    // Step 4: Mark dirty for save
    this.markDirty(obj.id);

    console.log(`   ✓ Move complete\n`);
  }

  /**
   * Remove object from its current location
   */
  removeFromLocation(obj) {
    if (!obj.location) return;

    const locType = obj.location.type;

    if (locType === 'inventory') {
      const owner = this.get(obj.location.owner);
      if (owner && owner.inventory) {
        owner.inventory = owner.inventory.filter(id => id !== obj.id);
        this.markDirty(owner.id);
        console.log(`   - Removed from ${owner.id}'s inventory`);
      }
    }
    else if (locType === 'container') {
      const container = this.get(obj.location.owner);
      if (container && container.inventory) {
        container.inventory = container.inventory.filter(id => id !== obj.id);
        this.markDirty(container.id);
        console.log(`   - Removed from container ${container.id}`);
      }
    }
    else if (locType === 'room') {
      const room = this.get(obj.location.room);
      if (room && room.items) {
        room.items = room.items.filter(id => id !== obj.id);
        this.markDirty(room.id);
        console.log(`   - Removed from room ${room.id}`);
      }
    }
  }

  /**
   * Add object to its new location
   */
  addToLocation(obj) {
    const locType = obj.location.type;

    if (locType === 'inventory') {
      const owner = this.get(obj.location.owner);
      if (owner) {
        if (!owner.inventory) owner.inventory = [];
        owner.inventory.push(obj.id);
        this.markDirty(owner.id);
        console.log(`   + Added to ${owner.id}'s inventory`);
      }
    }
    else if (locType === 'container') {
      const container = this.get(obj.location.owner);
      if (container) {
        if (!container.inventory) container.inventory = [];
        container.inventory.push(obj.id);
        this.markDirty(container.id);
        console.log(`   + Added to container ${container.id}`);
      }
    }
    else if (locType === 'room') {
      const room = this.get(obj.location.room);
      if (room) {
        if (!room.items) room.items = [];
        room.items.push(obj.id);
        this.markDirty(room.id);
        console.log(`   + Added to room ${room.id}`);
      }
    }
  }

  // ========================================
  // Dirty Tracking (Only Save What Changed)
  // ========================================

  markDirty(id) {
    this.dirtyObjects.add(id);
  }

  // ========================================
  // Validation
  // ========================================

  /**
   * Validate entire game state
   */
  validate() {
    console.log('🔍 Validating consistency...');

    let errors = 0;

    // Check 1: Every object ID is unique (should be guaranteed by Map)
    const ids = new Set();
    for (const obj of this.objects.values()) {
      if (ids.has(obj.id)) {
        console.error(`  ❌ Duplicate ID: ${obj.id}`);
        errors++;
      }
      ids.add(obj.id);
    }

    // Check 2: Every item INSTANCE appears in exactly one location
    // (Templates don't have locations, so skip them)
    const itemLocations = new Map();

    for (const obj of this.objects.values()) {
      if (obj.type === 'item' && obj.isInstance) {
        // Only validate instances, not templates
        let locationCount = 0;

        // Check if it's in its declared location
        if (obj.location) {
          if (obj.location.type === 'inventory') {
            const owner = this.get(obj.location.owner);
            if (owner && owner.inventory && owner.inventory.includes(obj.id)) {
              locationCount++;
            }
          }
          else if (obj.location.type === 'container') {
            const container = this.get(obj.location.owner);
            if (container && container.inventory && container.inventory.includes(obj.id)) {
              locationCount++;
            }
          }
          else if (obj.location.type === 'room') {
            const room = this.get(obj.location.room);
            if (room && room.items && room.items.includes(obj.id)) {
              locationCount++;
            }
          }
        }

        itemLocations.set(obj.id, locationCount);

        if (locationCount === 0 && obj.location) {
          console.error(`  ❌ Item instance ${obj.id} has location but isn't in any inventory/container/room`);
          errors++;
        }
        else if (locationCount > 1) {
          console.error(`  ❌ Item instance ${obj.id} appears in ${locationCount} locations (DUPLICATION BUG!)`);
          errors++;
        }
      }
    }

    // Check 3: Every reference is valid
    for (const obj of this.objects.values()) {
      if (obj.inventory) {
        for (const itemId of obj.inventory) {
          if (!this.objects.has(itemId)) {
            console.error(`  ❌ ${obj.id} references non-existent item ${itemId}`);
            errors++;
          }
        }
      }
    }

    if (errors === 0) {
      console.log('  ✅ All validation checks passed\n');
    } else {
      console.log(`  ⚠️  Found ${errors} validation errors\n`);
    }

    return errors === 0;
  }

  // ========================================
  // Saving
  // ========================================

  /**
   * Save all dirty objects to disk
   */
  saveDirty() {
    if (this.dirtyObjects.size === 0) {
      console.log('💾 No dirty objects to save');
      return;
    }

    console.log(`💾 Saving ${this.dirtyObjects.size} dirty objects...`);

    for (const id of this.dirtyObjects) {
      const obj = this.get(id);
      if (obj) {
        this.saveObject(obj);
      }
    }

    this.dirtyObjects.clear();

    // Also save all player-owned instances
    this.saveInstances();

    console.log('  ✅ All changes saved\n');
  }

  /**
   * Save a single object to disk
   * Only saves players - world content is static
   */
  saveObject(obj) {
    // Only save players - world content (items, rooms, npcs, containers) is static
    if (obj.type !== 'player') {
      console.log(`  ⚠️  Skipping save for ${obj.id} (type: ${obj.type}) - only players are saved`);
      return;
    }

    const dir = path.join(this.dataDir, 'players');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create a copy without inventory/equipped (those are saved separately in instances file)
    const playerData = {};
    for (const key in obj) {
      // Skip inventory and equipped - they're saved in instances file
      if (key === 'inventory' || key === 'equipped') {
        continue;
      }
      // Only save own properties
      if (obj.hasOwnProperty(key)) {
        playerData[key] = obj[key];
      }
    }

    const file = path.join(dir, `${obj.id}.json`);
    fs.writeFileSync(file, JSON.stringify(playerData, null, 2));

    console.log(`  ✓ Saved ${obj.id}`);
  }

  /**
   * Save all instances that are in player inventories or equipped
   */
  saveInstances() {
    const instancesToSave = new Map();
    const equippedSlots = new Map(); // Track which slot each item is equipped in

    // Find all instances that belong to players
    for (const instance of this.instances.values()) {
      if (!instance.location) continue;

      // Check if instance is in a player's inventory or equipped
      if (instance.location.type === 'inventory') {
        const owner = this.get(instance.location.owner);
        if (owner && owner.type === 'player') {
          if (!instancesToSave.has(owner.id)) {
            instancesToSave.set(owner.id, []);
          }
          instancesToSave.get(owner.id).push(instance);
        }
      }
    }

    // Also check equipped items and track which slot they're in
    for (const player of this.players.values()) {
      if (player.equipped) {
        if (!equippedSlots.has(player.id)) {
          equippedSlots.set(player.id, {});
        }

        for (const slot in player.equipped) {
          const itemId = player.equipped[slot];
          const item = this.get(itemId);
          if (item && item.isInstance) {
            // Track which slot this item is equipped in
            equippedSlots.get(player.id)[itemId] = slot;

            if (!instancesToSave.has(player.id)) {
              instancesToSave.set(player.id, []);
            }
            // Add if not already in the list
            if (!instancesToSave.get(player.id).some(i => i.id === itemId)) {
              instancesToSave.get(player.id).push(item);
            }
          }
        }
      }
    }

    // Save instances for each player
    const instancesDir = path.join(this.dataDir, 'instances');
    if (!fs.existsSync(instancesDir)) {
      fs.mkdirSync(instancesDir, { recursive: true });
    }

    for (const [playerId, instances] of instancesToSave.entries()) {
      const playerEquipped = equippedSlots.get(playerId) || {};

      const saveData = {
        equipped: {},  // Map of slot -> itemId
        instances: []   // Array of instance data
      };

      // Save equipped mappings (slot -> itemId)
      for (const itemId in playerEquipped) {
        const slot = playerEquipped[itemId];
        saveData.equipped[slot] = itemId;
      }

      // Save instance data
      saveData.instances = instances.map(instance => {
        // Save only own properties, not inherited ones
        const data = {};
        for (const key in instance) {
          if (instance.hasOwnProperty(key)) {
            data[key] = instance[key];
          }
        }
        // Make sure we save the template reference
        if (instance.__proto__ && instance.__proto__.id) {
          data.templateId = instance.__proto__.id;
        }
        return data;
      });

      const file = path.join(instancesDir, `${playerId}.json`);
      fs.writeFileSync(file, JSON.stringify(saveData, null, 2));
    }

    if (instancesToSave.size > 0) {
      const totalInstances = Array.from(instancesToSave.values()).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`  ✓ Saved ${totalInstances} instances for ${instancesToSave.size} players`);
    }
  }

  /**
   * Load instances for a player from disk
   * @param {string} playerId - Player ID
   */
  loadPlayerInstances(playerId) {
    const instancesDir = path.join(this.dataDir, 'instances');
    const file = path.join(instancesDir, `${playerId}.json`);

    if (!fs.existsSync(file)) {
      return; // No saved instances for this player
    }

    try {
      const data = fs.readFileSync(file, 'utf8');
      const saveData = JSON.parse(data);

      const player = this.get(playerId);

      // Clear the player's inventory and equipped slots
      // The instance file is the source of truth
      if (player) {
        player.inventory = [];
        player.equipped = {};
      }

      // Handle both old format (array) and new format (object with equipped + instances)
      const instancesData = Array.isArray(saveData) ? saveData : (saveData.instances || []);
      const equippedData = saveData.equipped || {};

      for (const instanceData of instancesData) {
        const templateId = instanceData.templateId;
        const template = this.templates.get(templateId);

        if (!template) {
          console.warn(`  ⚠️  Template ${templateId} not found for instance ${instanceData.id}`);
          continue;
        }

        // Create instance with prototypal inheritance
        const instance = Object.create(template);
        Object.assign(instance, instanceData);
        instance.isInstance = true;

        // Register instance
        this.instances.set(instance.id, instance);
        this.objects.set(instance.id, instance); // Legacy compatibility

        // Add to location if specified
        if (instance.location) {
          this.addToLocation(instance);
        }
      }

      // Restore equipped items
      if (player && equippedData) {
        for (const slot in equippedData) {
          const itemId = equippedData[slot];
          if (this.get(itemId)) {
            player.equipped[slot] = itemId;
          }
        }
      }

      console.log(`  ✓ Loaded ${instancesData.length} instances for ${playerId}`);
    } catch (error) {
      console.error(`  ⚠️  Error loading instances for ${playerId}:`, error.message);
    }
  }

  // ========================================
  // Hot Reload Methods
  // ========================================

  /**
   * Reload all NPCs from disk, updating existing ones or adding new ones
   * Preserves current location and state for existing NPCs
   */
  reloadNPCs() {
    console.log('🔄 Hot-reloading NPCs...');
    let reloaded = 0;
    let added = 0;

    const realmPaths = [
      { base: path.join(__dirname, '../world/newbie_realm/npcs'), realm: 'newbie_realm' },
      { base: path.join(__dirname, '../world/sesame_street/npcs'), realm: 'sesame_street' },
      { base: path.join(__dirname, '../world/reality_street/npcs'), realm: 'reality_street' }
    ];

    for (const { base, realm } of realmPaths) {
      if (!fs.existsSync(base)) continue;

      const files = fs.readdirSync(base).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(base, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const instanceData = JSON.parse(data);

        const existingNpc = this.get(instanceData.id);

        // Load definition if specified
        let npc;
        if (instanceData.definition) {
          // Clear cached definition to force reload
          delete require.cache[require.resolve(`../lib/${instanceData.definition}.js`)];
          const definition = this.loadDefinition(instanceData.definition);
          if (definition) {
            npc = Object.create(definition);
            Object.assign(npc, instanceData);
          } else {
            npc = instanceData;
          }
        } else {
          npc = instanceData;
        }

        if (existingNpc) {
          // Preserve current location and any runtime state
          npc.currentRoom = existingNpc.currentRoom;
          npc.hp = existingNpc.hp;
          reloaded++;
        } else {
          added++;
        }

        this.objects.set(npc.id, npc);

        // Re-enable heartbeat if needed
        if (npc.heartbeatInterval && (npc.heartbeatHandler || typeof npc.heartbeat === 'function')) {
          this.heartbeats.delete(npc.id); // Remove old heartbeat
          this.enableHeartbeat(npc.id, npc.heartbeatInterval);
        }
      }
    }

    console.log(`  ✅ Reloaded ${reloaded} NPC(s), added ${added} new NPC(s)`);
    return { reloaded, added };
  }

  /**
   * Reload all rooms from disk, updating descriptions and properties
   * Preserves items and NPCs in rooms
   */
  reloadRooms() {
    console.log('🔄 Hot-reloading rooms...');
    let reloaded = 0;
    let added = 0;

    const realmPaths = [
      { base: path.join(__dirname, '../world/newbie_realm/rooms'), realm: 'newbie_realm' },
      { base: path.join(__dirname, '../world/sesame_street/rooms'), realm: 'sesame_street' },
      { base: path.join(__dirname, '../world/reality_street/rooms'), realm: 'reality_street' }
    ];

    for (const { base, realm } of realmPaths) {
      if (!fs.existsSync(base)) continue;

      const files = fs.readdirSync(base).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(base, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const instanceData = JSON.parse(data);

        const existingRoom = this.get(instanceData.id);

        // Load definition if specified
        let room;
        if (instanceData.definition) {
          // Clear cached definition to force reload
          delete require.cache[require.resolve(`../lib/${instanceData.definition}.js`)];
          const definition = this.loadDefinition(instanceData.definition);
          if (definition) {
            room = Object.create(definition);
            Object.assign(room, instanceData);
          } else {
            room = instanceData;
          }
        } else {
          room = instanceData;
        }

        if (existingRoom) {
          // Preserve items array (things on the floor)
          room.items = existingRoom.items || [];
          reloaded++;
        } else {
          added++;
        }

        this.objects.set(room.id, room);

        // Re-enable heartbeat if needed
        if (room.heartbeatInterval && (room.heartbeatHandler || typeof room.heartbeat === 'function')) {
          this.heartbeats.delete(room.id); // Remove old heartbeat
          this.enableHeartbeat(room.id, room.heartbeatInterval);
        }
      }
    }

    console.log(`  ✅ Reloaded ${reloaded} room(s), added ${added} new room(s)`);
    return { reloaded, added };
  }

  // ========================================
  // Purse and Currency Methods
  // ========================================

  /**
   * Initialize purse for a player or NPC
   * Adds purse property and helper methods
   */
  initializePurse(entity) {
    const Currency = require('../systems/currency');

    // Initialize purse if it doesn't exist
    if (!entity.purse) {
      if (entity.type === 'player') {
        // Players get starting money (auto-converted to optimal denominations)
        const startingValue = Currency.totalValue(Currency.startingMoney);
        entity.purse = {
          coins: Currency.breakdown(startingValue)
        };
      } else {
        // NPCs start with empty purse
        entity.purse = {
          coins: Currency.empty()
        };
      }
    } else if (!entity.purse.coins) {
      // Purse exists but no coins property
      if (entity.type === 'player') {
        const startingValue = Currency.totalValue(Currency.startingMoney);
        entity.purse.coins = Currency.breakdown(startingValue);
      } else {
        entity.purse.coins = Currency.empty();
      }
    }

    // Add bank account for players
    if (entity.type === 'player' && entity.bankAccount === undefined) {
      entity.bankAccount = 0; // Bank balance in copper
    }

    // Add helper methods to entity
    entity.getCoins = function() {
      return this.purse.coins;
    };

    entity.addCoins = function(coins, entityManager) {
      this.purse.coins = Currency.add(this.purse.coins, coins);
      if (entityManager) {
        entityManager.markDirty(this.id);
      }
    };

    entity.removeCoins = function(coins, entityManager) {
      this.purse.coins = Currency.subtract(this.purse.coins, coins);
      if (entityManager) {
        entityManager.markDirty(this.id);
      }
    };

    entity.hasCoins = function(coins) {
      return Currency.hasEnough(this.purse.coins, coins);
    };

    entity.getCoinValue = function() {
      return Currency.totalValue(this.purse.coins);
    };

    entity.displayPurse = function() {
      return `Your purse contains ${Currency.format(this.purse.coins)}.`;
    };
  }

  /**
   * Find a player by name (case-insensitive)
   * Only searches online players
   */
  findPlayerByName(name) {
    const lowerName = name.toLowerCase();
    for (const session of this.sessions.values()) {
      if (session.state === 'playing' &&
          session.player &&
          session.player.name.toLowerCase() === lowerName) {
        return session.player;
      }
    }
    return null;
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Print inventory of a player or container
   */
  printInventory(ownerId) {
    const owner = this.get(ownerId);

    if (!owner) {
      console.log(`Owner ${ownerId} not found`);
      return;
    }

    console.log(`\n📦 ${owner.id}'s inventory:`);

    if (!owner.inventory || owner.inventory.length === 0) {
      console.log('  (empty)');
      return;
    }

    for (const itemId of owner.inventory) {
      const item = this.get(itemId);
      if (item) {
        console.log(`  - ${item.name || item.id} (${item.id})`);
      } else {
        console.log(`  - ??? (${itemId}) [MISSING]`);
      }
    }
  }

  /**
   * Print all objects
   */
  printAll() {
    console.log('\n📋 All Objects:');
    for (const [id, obj] of this.objects) {
      console.log(`  ${obj.type.padEnd(10)} | ${id.padEnd(20)} | location: ${JSON.stringify(obj.location)}`);
    }
    console.log();
  }

  // ========================================
  // Heartbeat System
  // ========================================

  /**
   * Register an object for heartbeat updates
   */
  enableHeartbeat(objectId, intervalSeconds = 10) {
    if (!this.objects.has(objectId)) {
      console.warn(`Cannot enable heartbeat for non-existent object: ${objectId}`);
      return;
    }

    this.heartbeats.set(objectId, {
      interval: intervalSeconds,
      lastTick: Date.now(),
      enabled: true
    });

    console.log(`  ⏱️  Heartbeat enabled: ${objectId} (every ${intervalSeconds}s)`);
  }

  /**
   * Disable heartbeat for an object
   */
  disableHeartbeat(objectId) {
    this.heartbeats.delete(objectId);
  }

  /**
   * Main game tick - called every second
   * Checks all registered heartbeats and executes them if their interval has elapsed
   */
  tick(heartbeatHandlers) {
    const now = Date.now();
    let executed = 0;

    for (const [objectId, hb] of this.heartbeats) {
      if (!hb.enabled) continue;

      // Check if enough time has passed for this object's interval
      if (now - hb.lastTick >= hb.interval * 1000) {
        const obj = this.get(objectId);

        if (!obj) {
          // Object was deleted, remove heartbeat
          this.heartbeats.delete(objectId);
          continue;
        }

        // Execute heartbeat function (new pattern - from definition)
        if (obj.heartbeat && typeof obj.heartbeat === 'function') {
          try {
            obj.heartbeat(this);
            executed++;
          } catch (error) {
            console.error(`Heartbeat error for ${objectId}:`, error);
          }
        }
        // Fallback to old handler pattern for backwards compatibility
        else if (obj.heartbeatHandler && heartbeatHandlers && heartbeatHandlers[obj.heartbeatHandler]) {
          try {
            heartbeatHandlers[obj.heartbeatHandler](obj, this);
            executed++;
          } catch (error) {
            console.error(`Heartbeat error for ${objectId}:`, error);
          }
        }

        hb.lastTick = now;
      }
    }

    return executed;
  }

  /**
   * Initialize heartbeats for all objects that have them
   */
  initializeHeartbeats() {
    console.log('\n⏱️  Initializing heartbeats...');
    let count = 0;

    for (const obj of this.objects.values()) {
      // Support both old handler pattern and new definition-based heartbeat function
      if (obj.heartbeatInterval && (obj.heartbeatHandler || typeof obj.heartbeat === 'function')) {
        this.enableHeartbeat(obj.id, obj.heartbeatInterval);
        count++;
      }
    }

    console.log(`✅ Initialized ${count} heartbeat(s)\n`);
  }

  /**
   * Register player session for notifications
   */
  registerSession(playerId, session) {
    this.sessions.set(playerId, session);
  }

  /**
   * Unregister player session
   */
  unregisterSession(playerId) {
    this.sessions.delete(playerId);
  }

  /**
   * Send message to a player if they're online
   */
  notifyPlayer(playerId, message) {
    const session = this.sessions.get(playerId);
    if (session && session.player && session.state === 'playing') {
      session.sendLine(message);
    }
  }

  /**
   * Notify all players in a room
   */
  notifyRoom(roomId, message, excludePlayerId = null) {
    const players = Array.from(this.objects.values()).filter(obj =>
      obj.type === 'player' && obj.currentRoom === roomId && obj.id !== excludePlayerId
    );

    for (const player of players) {
      this.notifyPlayer(player.id, message);
    }
  }
}

module.exports = EntityManager;
