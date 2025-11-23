#!/bin/bash
# Restart vibeMUD Server (port 4000)
# Kills any existing server on port 4000 and restarts it in the background

PORT=4000
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$PROJECT_DIR/server.log"

echo "🔍 Checking for server on port $PORT..."

# Find process using port 4000
PID=$(lsof -ti:$PORT 2>/dev/null)

if [ ! -z "$PID" ]; then
  echo "🛑 Killing existing server (PID: $PID)..."
  kill -9 $PID
  sleep 1
  echo "✅ Server stopped"
else
  echo "ℹ️  No server running on port $PORT"
fi

# Start new server in background
echo "🚀 Starting server on port $PORT..."
cd "$PROJECT_DIR"
nohup node src/core/server.js >> "$LOG_FILE" 2>&1 &
NEW_PID=$!

# Wait a moment and check if it started
sleep 2

if ps -p $NEW_PID > /dev/null; then
  echo "✅ Server started successfully (PID: $NEW_PID)"
  echo "📝 Logs: $LOG_FILE"
  echo "🔌 Connect: telnet localhost $PORT"
else
  echo "❌ Server failed to start. Check $LOG_FILE for errors"
  exit 1
fi
