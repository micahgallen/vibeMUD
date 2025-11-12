/**
 * NetworkDriver - Pure network/socket layer (the "driver")
 * Handles TCP connections, I/O, and connection lifecycle
 * No game logic - just plumbing
 */
const net = require('net');
const Session = require('./Session');

class NetworkDriver {
  constructor(port = 4000) {
    this.port = port;
    this.server = null;
    this.sessions = new Map(); // socket -> session
    this.onConnection = null;
    this.onData = null;
    this.onDisconnect = null;
  }

  /**
   * Start the network server
   */
  start() {
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Handle new connection
   */
  handleConnection(socket) {
    const session = new Session(socket);
    this.sessions.set(socket, session);

    console.log('New connection from', socket.remoteAddress);

    // Notify callback
    if (this.onConnection) {
      this.onConnection(session, socket);
    }

    // Handle incoming data
    socket.on('data', (data) => {
      const input = data.toString().replace(/\r?\n/g, '');
      if (this.onData) {
        this.onData(session, input);
      }
    });

    // Handle disconnect
    socket.on('end', () => {
      console.log('Connection closed from', socket.remoteAddress);
      if (this.onDisconnect) {
        this.onDisconnect(session);
      }
      this.sessions.delete(socket);
    });

    // Handle errors
    socket.on('error', (err) => {
      console.error('Socket error:', err.message);
      this.sessions.delete(socket);
    });
  }

  /**
   * Close all connections and shutdown server
   */
  shutdown() {
    return new Promise((resolve) => {
      // Close all sessions
      for (const [socket, session] of this.sessions) {
        socket.destroy();
      }
      this.sessions.clear();

      // Close server
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get all active sessions
   */
  getSessions() {
    return Array.from(this.sessions.values());
  }
}

module.exports = NetworkDriver;
