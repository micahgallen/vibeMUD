/**
 * vibeMUD - Main Server
 * "The Wumpy and Grift" MUD
 *
 * Orchestrates the core components following LPmud-inspired architecture:
 * - NetworkDriver: Pure socket/I/O layer (the "driver")
 * - EntityManager: Object lifecycle and world state
 * - CommandDispatcher: Command loading and routing
 * - LoginHandler: Authentication and player creation
 */
const EntityManager = require('./EntityManager');
const NetworkDriver = require('./NetworkDriver');
const CommandDispatcher = require('./CommandDispatcher');
const LoginHandler = require('./LoginHandler');
const colors = require('./colors');
const { getBanner } = require('../banner');
const leveling = require('../systems/leveling');
const magic = require('../systems/magic');
const mana = require('../systems/mana');
const loot = require('../systems/loot');
const path = require('path');

const PORT = 4000;

// Initialize core systems
const entityManager = new EntityManager();
const networkDriver = new NetworkDriver(PORT);
const commandDispatcher = new CommandDispatcher();
const loginHandler = new LoginHandler(entityManager, colors);

// Make commandDispatcher globally accessible for hotloading
global.commandDispatcher = commandDispatcher;

/**
 * Initialize the game world
 */
async function init() {
  // Load commands
  commandDispatcher.loadCommands();

  // Load emotes (social commands)
  commandDispatcher.loadEmotes();

  // Load spells
  console.log('Loading spells...');
  const spellsPath = path.join(__dirname, '../../data/guilds/global');
  magic.loadSpells(spellsPath);

  // Load all game objects
  console.log('Loading entities...');
  entityManager.loadAll();
  console.log(`Loaded ${entityManager.objects.size} entities`);

  // Initialize loot system (index items by tags)
  loot.initialize(entityManager);

  // Initialize XP for existing players (migration)
  console.log('Initializing player stats...');
  let playersInitialized = 0;
  for (const player of entityManager.getByType('player')) {
    let updated = false;

    if (typeof player.xp !== 'number') {
      player.xp = 0;
      updated = true;
    }

    // Ensure all stats are present (backwards compatibility)
    const stats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    for (const stat of stats) {
      if (typeof player[stat] !== 'number') {
        player[stat] = 10;
        updated = true;
      }
    }

    // Initialize mana pool if not present
    if (typeof player.maxMp !== 'number') {
      mana.initializeMana(player, null, entityManager);
      updated = true;
    }

    if (updated) {
      entityManager.markDirty(player.id);
      playersInitialized++;
    }
  }

  if (playersInitialized > 0) {
    console.log(`Initialized ${playersInitialized} players with XP and stats`);
    entityManager.saveDirty();
  }

  // Validate world consistency
  const isValid = entityManager.validate();
  if (!isValid) {
    console.error('Validation errors found!');
  } else {
    console.log('All entities validated successfully');
  }

  // Initialize heartbeats
  entityManager.initializeHeartbeats();
}

/**
 * Handle player input
 */
function handleInput(session, input) {
  if (session.state !== 'playing') {
    // Handle login flow
    loginHandler.handleLoginInput(session, input);
  } else {
    // Dispatch command
    commandDispatcher.dispatch(input, session, entityManager, colors);
  }
}

/**
 * Auto-look when player enters game
 */
function autoLookOnLogin(session) {
  const lookCommand = commandDispatcher.getCommand('look');
  if (lookCommand) {
    lookCommand.execute(session, '', entityManager, colors);
  }
  session.prompt();
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('\n\n🛑 Shutting down server...');

  // Save all dirty objects
  const dirtyCount = entityManager.dirtyObjects.size;
  if (dirtyCount > 0) {
    console.log(`💾 Saving ${dirtyCount} modified objects...`);
    entityManager.saveDirty();
  }

  // Notify and close all player connections
  console.log('👋 Closing all player connections...');
  for (const session of networkDriver.getSessions()) {
    if (session.player) {
      session.sendLine('\n\n' + colors.bright + colors.yellow + 'Server is shutting down. Goodbye!' + colors.reset + '\n');
    }
  }

  // Close network driver
  await networkDriver.shutdown();

  console.log('✅ Server shut down gracefully\n');
  process.exit(0);
}

/**
 * Wire up network callbacks
 */
function setupNetworkCallbacks() {
  // Handle new connections
  networkDriver.onConnection = (session) => {
    // Send welcome banner
    session.send(getBanner());
    session.send('Enter your character name: ');
  };

  // Handle incoming data
  networkDriver.onData = (session, input) => {
    handleInput(session, input);
  };

  // Handle disconnections
  networkDriver.onDisconnect = (session) => {
    if (session.player) {
      const player = session.player;

      // Handle combat disconnect with grace period
      if (player.combat) {
        const combatId = player.combat.combatId;
        const encounter = entityManager.get(combatId);

        if (encounter) {
          // Mark player as disconnected
          if (!encounter.disconnectedParticipants) {
            encounter.disconnectedParticipants = new Set();
          }
          encounter.disconnectedParticipants.add(player.id);

          // Mark player entity as disconnected for display purposes
          player.isDisconnected = true;
          entityManager.markDirty(player.id);

          // Notify room of disconnect
          if (player.currentRoom) {
            entityManager.notifyRoom(player.currentRoom,
              `\x1b[90m${player.name} has lost connection.\x1b[0m`,
              player.id);
          }

          console.log(`  ⏱️  ${player.name} disconnected from combat, 120s grace period started`);

          // Determine timeout based on opponent type
          const opponent = entityManager.get(player.combat.opponent);
          const isPvE = opponent && opponent.type === 'npc';
          const graceTime = isPvE ? 120000 : 60000; // 2 min for PvE, 1 min for PvP

          // Set timeout for auto-flee
          const timeoutHandle = setTimeout(() => {
            // Check if still disconnected
            const stillOffline = !entityManager.sessions.has(player.id);

            if (stillOffline && player.combat && player.combat.combatId === combatId) {
              console.log(`  ⏱️  Combat timeout expired for ${player.name} - auto-fleeing`);

              const combat = require('../systems/combat');
              combat.disengage(player.id, entityManager);

              // Clear disconnected flag
              delete player.isDisconnected;
              entityManager.markDirty(player.id);

              // Notify opponent if online
              if (opponent) {
                entityManager.notifyPlayer(opponent.id,
                  `\x1b[33m${player.name} has disconnected and fled from combat!\x1b[0m`);
              }

              // Save after auto-flee
              entityManager.saveDirty();
            }
          }, graceTime);

          // Store timeout handle for cleanup
          if (!encounter.disconnectTimers) {
            encounter.disconnectTimers = new Map();
          }
          encounter.disconnectTimers.set(player.id, timeoutHandle);
        } else {
          // Combat already ended, just clean up reference
          delete player.combat;
          entityManager.markDirty(player.id);
        }
      }

      // Notify room of disconnect if not already notified (non-combat disconnect)
      if (!player.combat && player.currentRoom) {
        entityManager.notifyRoom(player.currentRoom,
          `\x1b[90m${player.name} has lost connection.\x1b[0m`,
          player.id);
      }

      // Unregister session (but player entity stays if in combat)
      entityManager.unregisterSession(player.id);
      entityManager.saveDirty();
    }
  };

  // Handle successful login completion
  const originalCompleteLogin = loginHandler.completeLogin.bind(loginHandler);
  loginHandler.completeLogin = (session, player) => {
    originalCompleteLogin(session, player);
    autoLookOnLogin(session);
  };
}

/**
 * Start heartbeat tick
 */
function startHeartbeat() {
  setInterval(() => {
    entityManager.tick();

    const now = Date.now();

    // Regenerate mana and clean up expired buffs/debuffs
    for (const entity of entityManager.objects.values()) {
      if (entity.type === 'player' || entity.type === 'npc') {
        // Skip ghosts - they cannot gain/lose mana or be affected by buffs/debuffs/DOTs
        if (entity.isGhost) {
          continue;
        }

        // Regenerate mana
        if (entity.maxMp && entity.mp < entity.maxMp) {
          mana.regenerateMana(entity.id, entityManager);
        }

        // Clean up expired buffs
        if (entity.activeBuffs && entity.activeBuffs.length > 0) {
          const expiredBuffs = entity.activeBuffs.filter(b => b.endTime <= now);
          if (expiredBuffs.length > 0) {
            for (const buff of expiredBuffs) {
              magic.removeBuff(entity.id, buff.id, entityManager);
            }
          }
        }

        // Clean up expired debuffs
        if (entity.activeDebuffs && entity.activeDebuffs.length > 0) {
          const expiredDebuffs = entity.activeDebuffs.filter(d => d.endTime <= now);
          if (expiredDebuffs.length > 0) {
            for (const debuff of expiredDebuffs) {
              magic.removeDebuff(entity.id, debuff.id, entityManager);
            }
          }
        }

        // Process DOT ticks (delegated to magic system)
        magic.processDotTicks(entity, entityManager);
      }
    }
  }, 1000);
}

/**
 * Start auto-save
 */
function startAutoSave() {
  setInterval(() => {
    const count = entityManager.dirtyObjects.size;
    if (count > 0) {
      entityManager.saveDirty();
      console.log(`💾 Auto-save: ${count} objects saved`);
    }
  }, 60000);
}

/**
 * Handle shutdown signals
 */
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * Start the server
 */
async function start() {
  try {
    // Initialize game world
    await init();

    // Wire up components
    setupNetworkCallbacks();

    // Start network driver
    await networkDriver.start();

    console.log('');
    console.log('='.repeat(60));
    console.log(`  vibeMUD Server running on port ${PORT}`);
    console.log(`  "The Wumpy and Grift" MUD`);
    console.log(`  Connect with: telnet localhost ${PORT}`);
    console.log('='.repeat(60));
    console.log('');

    // Start heartbeat and auto-save
    startHeartbeat();
    startAutoSave();

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
start();
