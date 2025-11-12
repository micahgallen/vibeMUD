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

const PORT = 4000;

// Initialize core systems
const entityManager = new EntityManager();
const networkDriver = new NetworkDriver(PORT);
const commandDispatcher = new CommandDispatcher();
const loginHandler = new LoginHandler(entityManager, colors);

/**
 * Initialize the game world
 */
async function init() {
  // Load commands
  commandDispatcher.loadCommands();

  // Load emotes (social commands)
  commandDispatcher.loadEmotes();

  // Load all game objects
  console.log('Loading entities...');
  entityManager.loadAll();
  console.log(`Loaded ${entityManager.objects.size} entities`);

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
      entityManager.unregisterSession(session.player.id);
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
