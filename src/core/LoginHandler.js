/**
 * LoginHandler - Manages player authentication and creation
 * Part of the vibeMUD core infrastructure
 */
const { hashPassword, verifyPassword } = require('../utils/password');

class LoginHandler {
  constructor(entityManager, colors) {
    this.entityManager = entityManager;
    this.colors = colors;
  }

  /**
   * Handle login state machine
   */
  handleLoginInput(session, input) {
    input = input.trim();

    switch (session.state) {
      case 'login_name':
        this.handleLoginName(session, input);
        break;
      case 'login_password':
        this.handleLoginPassword(session, input);
        break;
      case 'new_password':
        this.handleNewPassword(session, input);
        break;
      case 'confirm_password':
        this.handleConfirmPassword(session, input);
        break;
      case 'multi_login_choice':
        this.handleMultiLoginChoice(session, input);
        break;
    }
  }

  /**
   * Handle character name entry
   */
  handleLoginName(session, input) {
    if (!input) {
      session.send('Enter your character name: ');
      return;
    }

    const playerName = input.toLowerCase();
    session.loginName = playerName;

    // Try to find existing player
    const existingPlayer = this.entityManager.getByType('player').find(p => p.id === playerName);

    if (existingPlayer) {
      // Existing player - ask for password
      session.state = 'login_password';
      session.send('Password: ');
    } else {
      // New player - ask for new password
      session.state = 'new_password';
      session.sendLine('');
      session.sendLine(this.colors.info('Creating new character!'));
      session.sendLine('');
      session.send('Choose a password: ');
    }
  }

  /**
   * Handle password verification for existing player
   */
  handleLoginPassword(session, input) {
    if (!input) {
      session.send('Password: ');
      return;
    }

    const player = this.entityManager.get(session.loginName);

    if (!player) {
      session.sendLine(this.colors.error('Error: Player not found.'));
      session.state = 'login_name';
      session.send('Enter your character name: ');
      return;
    }

    // Verify password
    if (!player.passwordHash || verifyPassword(input, player.passwordHash)) {
      // Check if player is already logged in
      const existingSession = this.entityManager.sessions.get(player.id);

      if (existingSession && existingSession !== session) {
        // Player is already logged in - present options
        session.existingSession = existingSession;
        session.state = 'multi_login_choice';

        session.sendLine('');
        session.sendLine(this.colors.warning('='.repeat(60)));
        session.sendLine(this.colors.warning('  Your character is already logged in!'));
        session.sendLine(this.colors.warning('='.repeat(60)));
        session.sendLine('');

        if (player.combat) {
          session.sendLine(this.colors.error('  ⚔️  Your character is IN COMBAT'));
          session.sendLine('');
        }

        session.sendLine('Options:');
        session.sendLine('  [1] Reconnect (take over your session)');
        session.sendLine('  [2] Force Respawn (die and respawn at fountain)');
        session.sendLine('  [3] Cancel');
        session.sendLine('');
        session.send('Choice: ');
        return;
      }

      // Success! Complete login
      this.completeLogin(session, player);
    } else {
      // Wrong password
      session.sendLine('');
      session.sendLine(this.colors.error('Incorrect password.'));
      session.sendLine('');
      session.state = 'login_name';
      session.send('Enter your character name: ');
    }
  }

  /**
   * Handle new password entry
   */
  handleNewPassword(session, input) {
    if (!input || input.length < 3) {
      session.sendLine('Password must be at least 3 characters.');
      session.send('Choose a password: ');
      return;
    }

    session.tempPassword = input;
    session.state = 'confirm_password';
    session.send('Confirm password: ');
  }

  /**
   * Handle password confirmation and create new player
   */
  handleConfirmPassword(session, input) {
    if (input !== session.tempPassword) {
      session.sendLine('');
      session.sendLine(this.colors.error('Passwords do not match.'));
      session.sendLine('');
      session.state = 'new_password';
      session.send('Choose a password: ');
      return;
    }

    // Create new player
    const newPlayer = {
      id: session.loginName,
      type: 'player',
      name: session.loginName.charAt(0).toUpperCase() + session.loginName.slice(1),
      passwordHash: hashPassword(input),
      hp: 100,
      maxHp: 100,
      level: 1,
      // D&D 5E ability scores (default 10 = average human)
      strength: 10,      // Melee damage, physical power
      dexterity: 10,     // AC, initiative, ranged attacks
      constitution: 10,  // HP, endurance
      intelligence: 10,  // Arcane magic, knowledge
      wisdom: 10,        // Divine magic, perception, insight
      charisma: 10,      // Social interactions, some magic
      currentRoom: 'test_room', // TODO: Change to sesame_street_south when Sesame Street content is ported
      inventory: [],
      equipped: {},      // Equipment slots (mainHand, offHand, chest, head, etc.)
      chatEnabled: true, // New property for chat functionality
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };

    try {
      this.entityManager.register(newPlayer);
      session.sendLine('');
      session.sendLine(this.colors.success('Character created successfully!'));
      this.completeLogin(session, newPlayer);
    } catch (error) {
      session.sendLine('');
      session.sendLine(this.colors.error(`Error creating character: ${error.message}`));
      session.sendLine('');
      session.state = 'login_name';
      session.send('Enter your character name: ');
    }
  }

  /**
   * Handle multi-login choice (reconnect vs force respawn)
   */
  handleMultiLoginChoice(session, input) {
    const choice = input.trim();
    const player = this.entityManager.get(session.loginName);
    const oldSession = session.existingSession;

    if (choice === '1') {
      // Option 1: Reconnect (boot old session)
      session.sendLine('');
      session.sendLine(this.colors.info('Reconnecting to your character...'));

      // Boot the old session
      if (oldSession && oldSession.socket) {
        oldSession.sendLine('');
        oldSession.sendLine(this.colors.warning('='.repeat(60)));
        oldSession.sendLine(this.colors.warning('  You have been disconnected'));
        oldSession.sendLine(this.colors.warning('  (login from another location)'));
        oldSession.sendLine(this.colors.warning('='.repeat(60)));
        oldSession.socket.end();
      }

      // Complete login with new session
      this.completeLogin(session, player);

    } else if (choice === '2') {
      // Option 2: Force Respawn (die and respawn)
      session.sendLine('');
      session.sendLine(this.colors.warning('Force respawning...'));
      session.sendLine('');

      // Boot old session first
      if (oldSession && oldSession.socket) {
        oldSession.sendLine('');
        oldSession.sendLine(this.colors.error('You have died and been forcibly respawned.'));
        oldSession.socket.end();
      }

      // Kill the player if they're not already dead
      if (!player.isDead && !player.isGhost) {
        const combat = require('../systems/combat');

        // If in combat, disengage first
        if (player.combat) {
          combat.disengage(player.id, this.entityManager);
        }

        // Create corpse at current location
        const currentRoom = player.currentRoom;
        combat.handleDeath(player.id, null, this.entityManager);

        // Immediately respawn (don't wait for normal timer)
        const respawnRoom = 'counts_fountain';
        delete player.isGhost;
        delete player.isDead;
        player.hp = player.maxHp;
        player.currentRoom = respawnRoom;
        this.entityManager.markDirty(player.id);

        console.log(`  ✨ ${player.name} force-respawned at ${respawnRoom}`);
      } else if (player.isGhost || player.isDead) {
        // Already dead/ghost - just respawn
        const respawnRoom = 'counts_fountain';
        delete player.isGhost;
        delete player.isDead;
        player.hp = player.maxHp;
        player.currentRoom = respawnRoom;
        this.entityManager.markDirty(player.id);
      }

      // Complete login immediately
      this.completeLogin(session, player);

    } else if (choice === '3') {
      // Option 3: Cancel
      session.sendLine('');
      session.sendLine('Login cancelled.');
      session.sendLine('');
      session.state = 'login_name';
      delete session.existingSession;
      session.send('Enter your character name: ');

    } else {
      // Invalid choice
      session.sendLine(this.colors.error('Invalid choice. Please enter 1, 2, or 3.'));
      session.send('Choice: ');
    }
  }

  /**
   * Complete the login process and enter game
   */
  completeLogin(session, player) {
    session.player = player;
    session.state = 'playing';
    delete session.tempPassword;

    // Handle combat state on reconnect
    // Combat encounters are ephemeral and don't persist across restarts
    // If player has combat state but the encounter doesn't exist, clear it
    if (player.combat) {
      const combatId = player.combat.combatId;
      const encounter = this.entityManager.get(combatId);

      if (encounter) {
        // Reconnected during grace period - resume combat!

        // Remove from disconnected set
        if (encounter.disconnectedParticipants) {
          encounter.disconnectedParticipants.delete(player.id);
        }

        // Cancel the auto-flee timeout
        if (encounter.disconnectTimers && encounter.disconnectTimers.has(player.id)) {
          clearTimeout(encounter.disconnectTimers.get(player.id));
          encounter.disconnectTimers.delete(player.id);
          console.log(`  ♻️  ${player.name} reconnected to combat (${combatId})`);
        }

        // Clear disconnected flag
        delete player.isDisconnected;
        this.entityManager.markDirty(player.id);

        // Register session before notifying
        this.entityManager.registerSession(player.id, session);

        // Notify player
        session.sendLine('');
        session.sendLine(this.colors.warning('='.repeat(60)));
        session.sendLine(this.colors.warning('  You are still in combat!'));
        session.sendLine(this.colors.warning('='.repeat(60)));
        session.sendLine('');

        // Notify opponent
        const opponentId = player.combat.opponent;
        this.entityManager.notifyPlayer(opponentId,
          `\x1b[36m${player.name} has reconnected to combat!\x1b[0m`);

      } else {
        // Combat ended while offline - clean up
        console.log(`  🧹 Clearing stale combat state for ${player.name} (combat ended)`);

        // Provide context if it was PvE
        const opponentId = player.combat.opponent;
        const opponent = this.entityManager.get(opponentId);

        if (opponent && opponent.type === 'npc') {
          session.pendingMessage = `Your combat with ${opponent.name} was interrupted.`;
        }

        delete player.combat;
        delete player.isDisconnected;
        this.entityManager.markDirty(player.id);

        // Register session
        this.entityManager.registerSession(player.id, session);
      }
    } else {
      // No combat state - normal login
      this.entityManager.registerSession(player.id, session);
    }

    // Notify room of arrival (unless reconnecting to combat)
    if (player.currentRoom && !player.combat) {
      this.entityManager.notifyRoom(player.currentRoom,
        `\x1b[36m${player.name} has entered the game.\x1b[0m`,
        player.id);
    }

    session.sendLine('');
    session.sendLine(this.colors.success('='.repeat(60)));
    session.sendLine(this.colors.highlight('     Welcome to The Wumpy and Grift'));
    session.sendLine(this.colors.success('='.repeat(60)));
    session.sendLine('');

    // Show pending message if any
    if (session.pendingMessage) {
      session.sendLine(this.colors.warning(session.pendingMessage));
      delete session.pendingMessage;
      session.sendLine('');
    }

    session.sendLine(`Welcome back, ${player.name}!`);
    session.sendLine(this.colors.hint('Type "help" for a list of commands.'));
    session.sendLine('');
  }
}

module.exports = LoginHandler;
