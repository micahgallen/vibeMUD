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
    this.socket.write(message + '\r\n');
  }

  prompt() {
    if (this.player) {
      this.socket.write('> ');
    }
  }
}

module.exports = Session;
