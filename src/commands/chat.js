const { getDisplayName } = require('../utils/playerDisplay');
const { ANSI, MUD_COLORS, colorize } = require('../colors');
const fs = require('fs');
const path = require('path');

const CHAT_LOG_FILE = path.join(__dirname, '../../src/data/chat.log');
const MAX_REPLAY_MESSAGES = 10;

// Helper function to log chat messages
function logChatMessage(playerName, message) {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const logEntry = `[${timestamp}] ${playerName}: ${message}\n`;
    fs.appendFileSync(CHAT_LOG_FILE, logEntry, { encoding: 'utf8' });
}

module.exports = {
    id: 'chat',
    name: 'chat',
    aliases: ['c'],
    category: 'Communication',
    description: 'Sends a global chat message, or toggles chat on/off, or replays recent chat messages.',
    usage: 'chat <message> | chat on | chat off | chat replay',
    requiresLogin: true,
    execute: function(session, args, entityManager, colors) {
        const player = session.player;
        const capName = getDisplayName(player);

        if (!args || args.trim().length === 0) {
            session.sendLine(`Usage: ${this.usage}`);
            return;
        }

        const parts = args.trim().split(' ');
        const subCommand = parts[0].toLowerCase();

        if (subCommand === 'on') {
            player.chatEnabled = true;
            session.sendLine(colorize('Chat is now enabled.', MUD_COLORS.SUCCESS));
            // Mark player as dirty to save the state
            entityManager.markDirty(player.id); // Use player.id here
            return;
        }

        if (subCommand === 'off') {
            player.chatEnabled = false;
            session.sendLine(colorize('Chat is now disabled. You will not receive global chat messages.', MUD_COLORS.ERROR));
            // Mark player as dirty to save the state
            entityManager.markDirty(player.id); // Use player.id here
            return;
        }

        if (subCommand === 'replay') {
            try {
                if (!fs.existsSync(CHAT_LOG_FILE)) {
                    session.sendLine(colorize('No chat messages logged yet.', MUD_COLORS.WARNING));
                    return;
                }
                const logContent = fs.readFileSync(CHAT_LOG_FILE, 'utf8');
                const lines = logContent.split('\n').filter(line => line.trim() !== '');
                const lastMessages = lines.slice(-MAX_REPLAY_MESSAGES);

                if (lastMessages.length === 0) {
                    session.sendLine(colorize('No chat messages to replay.', MUD_COLORS.WARNING));
                    return;
                }

                session.sendLine(`${ANSI.BOLD}${ANSI.BLUE}--- Last Chat Messages ---${ANSI.RESET}`);
                lastMessages.forEach(msg => {
                    const match = msg.match(/^\[.*?\]\s*(.*)$/);
                    if (match && match[1]) {
                        session.sendLine(match[1]);
                    } else {
                        session.sendLine(msg); // Fallback if parsing fails
                    }
                });
                session.sendLine(`${ANSI.BOLD}${ANSI.BLUE}--------------------------${ANSI.RESET}`);

            } catch (error) {
                session.sendLine(colorize(`Error reading chat log: ${error.message}`, MUD_COLORS.ERROR));
            }
            return;
        }

        // If not a sub-command, it's a chat message
        const message = args.trim();
        const formattedMessage = `${ANSI.BOLD}${ANSI.BLUE}[${ANSI.MAGENTA}CHAT${ANSI.BLUE}]${ANSI.RESET} ${capName}: ${message}`;

        // Log the message
        logChatMessage(capName, message);

        // Broadcast to all active sessions
        for (const s of entityManager.sessions.values()) {
            // Only send to players who have chat enabled and are in 'playing' state
            if (s.player && s.state === 'playing' && s.player.chatEnabled !== false) { // Default is true if not set
                s.sendLine(formattedMessage); // Use sendLine for consistency
            }
        }
    }
};