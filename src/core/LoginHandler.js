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
      currentRoom: 'test_room', // TODO: Change to sesame_street_south when Sesame Street content is ported
      inventory: [],
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
   * Complete the login process and enter game
   */
  completeLogin(session, player) {
    session.player = player;
    session.state = 'playing';
    delete session.tempPassword;

    // Register session for heartbeat notifications
    this.entityManager.registerSession(player.id, session);

    session.sendLine('');
    session.sendLine(this.colors.success('='.repeat(60)));
    session.sendLine(this.colors.highlight('     Welcome to The Wumpy and Grift'));
    session.sendLine(this.colors.success('='.repeat(60)));
    session.sendLine('');
    session.sendLine(`Welcome back, ${player.name}!`);
    session.sendLine(this.colors.hint('Type "help" for a list of commands.'));
    session.sendLine('');
  }
}

module.exports = LoginHandler;
