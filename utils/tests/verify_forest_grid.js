#!/usr/bin/env node
/**
 * Verification script for the 5x5 forest grid
 * Checks that all rooms exist and are properly connected
 */

const fs = require('fs');
const path = require('path');

const ROOM_DIR = './src/world/newbie_realm/rooms';

// Define the expected grid structure
const grid = {
  1: { 1: 'forest_1_1', 2: 'forest_1_2', 3: 'forest_1_3', 4: 'forest_1_4', 5: 'forest_1_5' },
  2: { 1: 'forest_2_1', 2: 'forest_2_2', 3: 'forest_2_3', 4: 'forest_2_4', 5: 'forest_2_5' },
  3: { 1: 'forest_3_1', 2: 'forest_3_2', 3: 'forest_3_3', 4: 'forest_3_4', 5: 'forest_3_5' },
  4: { 1: 'forest_4_1', 2: 'forest_4_2', 3: 'forest_4_3', 4: 'forest_4_4', 5: 'forest_4_5' },
  5: { 1: 'forest_5_1', 2: 'forest_5_2', 3: 'forest_5_3', 4: 'forest_5_4', 5: 'forest_5_5' }
};

// Load all rooms
const rooms = {};
let errors = 0;
let warnings = 0;

console.log('=== Forest Grid Verification ===\n');

// Load each room
for (let x = 1; x <= 5; x++) {
  for (let y = 1; y <= 5; y++) {
    const roomId = grid[x][y];
    const roomPath = path.join(ROOM_DIR, `${roomId}.json`);

    try {
      const roomData = JSON.parse(fs.readFileSync(roomPath, 'utf8'));
      rooms[roomId] = roomData;
      console.log(`✓ Loaded ${roomId}: "${roomData.name}"`);
    } catch (err) {
      console.error(`✗ ERROR: Failed to load ${roomId}: ${err.message}`);
      errors++;
    }
  }
}

console.log('\n=== Verifying Connections ===\n');

// Verify connections
for (let x = 1; x <= 5; x++) {
  for (let y = 1; y <= 5; y++) {
    const roomId = grid[x][y];
    const room = rooms[roomId];

    if (!room) continue;

    const exits = room.exits || {};

    // Check north (y - 1)
    if (y > 1) {
      const expectedNorth = grid[x][y - 1];
      if (exits.north !== expectedNorth) {
        console.log(`✗ ERROR: ${roomId} north exit should be ${expectedNorth}, got ${exits.north || 'none'}`);
        errors++;
      }
    } else if (exits.north) {
      console.log(`ℹ INFO: ${roomId} has north exit ${exits.north} (edge room)`);
    }

    // Check south (y + 1)
    if (y < 5) {
      const expectedSouth = grid[x][y + 1];
      if (exits.south !== expectedSouth) {
        console.log(`✗ ERROR: ${roomId} south exit should be ${expectedSouth}, got ${exits.south || 'none'}`);
        errors++;
      }
    } else if (exits.south) {
      console.log(`ℹ INFO: ${roomId} has south exit ${exits.south} (edge room)`);
    }

    // Check west (x - 1)
    if (x > 1) {
      const expectedWest = grid[x - 1][y];
      if (exits.west !== expectedWest) {
        console.log(`✗ ERROR: ${roomId} west exit should be ${expectedWest}, got ${exits.west || 'none'}`);
        errors++;
      }
    } else if (exits.west) {
      console.log(`ℹ INFO: ${roomId} has west exit ${exits.west} (edge room)`);
    }

    // Check east (x + 1)
    if (x < 5) {
      const expectedEast = grid[x + 1][y];
      if (exits.east !== expectedEast) {
        console.log(`✗ ERROR: ${roomId} east exit should be ${expectedEast}, got ${exits.east || 'none'}`);
        errors++;
      }
    } else if (exits.east) {
      console.log(`ℹ INFO: ${roomId} has east exit ${exits.east} (edge room)`);
    }
  }
}

console.log('\n=== Special Features ===\n');

// Check for special features
for (const [roomId, room] of Object.entries(rooms)) {
  if (room.npcs && room.npcs.length > 0) {
    console.log(`⚔ ${roomId}: NPCs: ${room.npcs.join(', ')}`);
  }
  if (room.containers && room.containers.length > 0) {
    console.log(`📦 ${roomId}: Containers: ${room.containers.join(', ')}`);
  }
  if (room.items && room.items.length > 0) {
    console.log(`🔮 ${roomId}: Items: ${room.items.join(', ')}`);
  }
}

console.log('\n=== Summary ===\n');
console.log(`Total rooms loaded: ${Object.keys(rooms).length}/25`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors === 0) {
  console.log('\n✓ All connections verified successfully!');
  process.exit(0);
} else {
  console.log('\n✗ Errors found. Please fix the issues above.');
  process.exit(1);
}
