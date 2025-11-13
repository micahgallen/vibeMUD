// Validation script for Reality Street connections
const fs = require('fs');
const path = require('path');

const roomsDir = '/home/micah/entity-manager-prototype/src/world/reality_street/rooms';

// Load all rooms
const rooms = new Map();
const files = fs.readdirSync(roomsDir);

files.forEach(file => {
  if (file.endsWith('.json')) {
    const content = fs.readFileSync(path.join(roomsDir, file), 'utf8');
    const room = JSON.parse(content);
    rooms.set(room.id, room);
  }
});

console.log(`Loaded ${rooms.size} rooms\n`);

// Track all issues
const issues = {
  brokenExits: [],
  onewayExits: [],
  directionalMismatches: [],
  deadEnds: []
};

// Opposite directions
const opposites = {
  'north': 'south',
  'south': 'north',
  'east': 'west',
  'west': 'east',
  'northeast': 'southwest',
  'southwest': 'northeast',
  'northwest': 'southeast',
  'southeast': 'northwest',
  'up': 'down',
  'down': 'up'
};

// Validate each room
rooms.forEach((room, roomId) => {
  if (!room.exits || Object.keys(room.exits).length === 0) {
    issues.deadEnds.push({
      room: roomId,
      type: 'no_exits',
      message: `Room has no exits at all`
    });
    return;
  }

  // Check if room has only one exit
  if (Object.keys(room.exits).length === 1) {
    issues.deadEnds.push({
      room: roomId,
      type: 'single_exit',
      direction: Object.keys(room.exits)[0],
      target: Object.values(room.exits)[0],
      message: `Room has only one exit (${Object.keys(room.exits)[0]})`
    });
  }

  // Check each exit
  Object.entries(room.exits).forEach(([direction, targetId]) => {
    // Check if target room exists
    const targetRoom = rooms.get(targetId);

    if (!targetRoom) {
      issues.brokenExits.push({
        from: roomId,
        direction,
        target: targetId,
        message: `Exit ${direction} points to non-existent room: ${targetId}`
      });
      return;
    }

    // Check for return exit
    const oppositeDir = opposites[direction];
    if (!oppositeDir) {
      console.log(`Warning: Unknown direction "${direction}" in ${roomId}`);
      return;
    }

    const returnExit = targetRoom.exits?.[oppositeDir];

    if (!returnExit) {
      issues.onewayExits.push({
        from: roomId,
        direction,
        target: targetId,
        expectedReturn: oppositeDir,
        message: `One-way exit: ${roomId} goes ${direction} to ${targetId}, but ${targetId} has no ${oppositeDir} exit back`
      });
    } else if (returnExit !== roomId) {
      issues.directionalMismatches.push({
        from: roomId,
        direction,
        target: targetId,
        expectedReturn: oppositeDir,
        actualReturn: returnExit,
        message: `Directional mismatch: ${roomId} goes ${direction} to ${targetId}, but ${targetId} goes ${oppositeDir} to ${returnExit} (not back to ${roomId})`
      });
    }
  });
});

// Report findings
console.log('=== VALIDATION RESULTS ===\n');

if (issues.brokenExits.length > 0) {
  console.log(`BROKEN EXITS (${issues.brokenExits.length}):`);
  issues.brokenExits.forEach(issue => {
    console.log(`  [CRITICAL] ${issue.message}`);
  });
  console.log();
}

if (issues.onewayExits.length > 0) {
  console.log(`ONE-WAY EXITS (${issues.onewayExits.length}):`);
  issues.onewayExits.forEach(issue => {
    console.log(`  [WARNING] ${issue.message}`);
  });
  console.log();
}

if (issues.directionalMismatches.length > 0) {
  console.log(`DIRECTIONAL MISMATCHES (${issues.directionalMismatches.length}):`);
  issues.directionalMismatches.forEach(issue => {
    console.log(`  [ERROR] ${issue.message}`);
  });
  console.log();
}

if (issues.deadEnds.length > 0) {
  console.log(`DEAD ENDS (${issues.deadEnds.length}):`);
  issues.deadEnds.forEach(issue => {
    console.log(`  [INFO] ${issue.room}: ${issue.message}`);
  });
  console.log();
}

const totalIssues = issues.brokenExits.length + issues.onewayExits.length +
                    issues.directionalMismatches.length;

if (totalIssues === 0) {
  console.log('SUCCESS: All connections are valid!\n');
} else {
  console.log(`TOTAL ISSUES: ${totalIssues}\n`);
}

// Export for further analysis
module.exports = { rooms, issues };
