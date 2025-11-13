/**
 * Session - Represents a player connection
 */
class Session {
  constructor(socket) {
    this.socket = socket;
    this.player = null;
    this.state = 'login_name';  // login_name, login_password, new_password, confirm_password, playing
    this.buffer = '';
    this.loginName = null;
  }

  send(message) {
    this.socket.write(message);
  }

  sendLine(message = '') {
    // Always append ANSI RESET code to prevent color bleeding between messages
    const ANSI_RESET = '\x1b[0m';
    this.socket.write(message + ANSI_RESET + '\r\n');
  }

  prompt() {
    if (this.player) {
      this.socket.write('> ');
    }
  }
}

module.exports = Session;
