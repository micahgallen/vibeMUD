/**
 * Test script for the leveling system
 */

const leveling = require('./src/systems/leveling');

console.log('\n=== Testing Leveling System ===\n');

// Test 1: XP calculations
console.log('Test 1: XP Required for Levels');
console.log('-------------------------------');
for (let level = 1; level <= 5; level++) {
  const xpNeeded = leveling.getXPForLevel(level);
  const xpToNext = leveling.getXPToNextLevel(level);
  console.log(`Level ${level}: ${xpNeeded} total XP, ${xpToNext} to reach next level`);
}
console.log('');

// Test 2: XP Reward calculation
console.log('Test 2: XP Rewards from NPCs');
console.log('----------------------------');
const testNPCs = [
  { name: 'Rat', level: 1 },
  { name: 'Arena Champion', level: 6 },
  { name: 'Dragon', level: 20 }
];

for (const npc of testNPCs) {
  const reward = leveling.calculateXPReward(npc);
  console.log(`${npc.name} (level ${npc.level}): ${reward} XP`);
}
console.log('');

// Test 3: Mock player leveling simulation
console.log('Test 3: Leveling Simulation');
console.log('---------------------------');

// Create mock entity manager
const mockEntityManager = {
  objects: new Map(),
  dirtyObjects: new Set(),

  get: function(id) {
    return this.objects.get(id);
  },

  markDirty: function(id) {
    this.dirtyObjects.add(id);
  },

  notifyPlayer: function(playerId, message) {
    // Strip ANSI codes for cleaner output
    const clean = message.replace(/\x1b\[[0-9;]*m/g, '');
    console.log(`  → ${clean}`);
  },

  notifyRoom: function(roomId, message, excludeId) {
    // Not needed for this test
  }
};

// Create mock player
const mockPlayer = {
  id: 'testplayer',
  type: 'player',
  name: 'Test Player',
  level: 1,
  xp: 0,
  hp: 100,
  maxHp: 100,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  currentRoom: 'test_room'
};

mockEntityManager.objects.set('testplayer', mockPlayer);

// Simulate killing NPCs and leveling up
console.log(`Starting: Level ${mockPlayer.level}, XP ${mockPlayer.xp}`);
console.log('');

// Kill 2 level 1 rats (50 XP each = 100 XP total, should level to 2)
console.log('Killing 2 level 1 rats...');
leveling.awardXP('testplayer', 50, mockEntityManager);
leveling.awardXP('testplayer', 50, mockEntityManager);
console.log(`Current: Level ${mockPlayer.level}, XP ${mockPlayer.xp}, HP ${mockPlayer.hp}/${mockPlayer.maxHp}`);
console.log('');

// Kill 6 more rats (300 XP more = 400 total, should level to 3)
console.log('Killing 6 more level 1 rats...');
for (let i = 0; i < 6; i++) {
  leveling.awardXP('testplayer', 50, mockEntityManager);
}
console.log(`Current: Level ${mockPlayer.level}, XP ${mockPlayer.xp}, HP ${mockPlayer.hp}/${mockPlayer.maxHp}`);
console.log('');

// Test 4: XP Progress display
console.log('Test 4: XP Progress Info');
console.log('-----------------------');
const progress = leveling.getXPProgress(mockPlayer);
console.log(`Level: ${progress.currentLevel}`);
console.log(`Current XP: ${progress.currentXP}`);
console.log(`XP for next level: ${progress.xpForNextLevel}`);
console.log(`Progress in current level: ${progress.xpIntoLevel} / ${progress.xpNeededForLevel} (${progress.percentToNext}%)`);
console.log('');

// Test 5: Stat increases at level 4
console.log('Test 5: Stat Increases at Level 4');
console.log('---------------------------------');
console.log('Killing enemies to reach level 4 (need 500 more XP)...');
for (let i = 0; i < 10; i++) {
  leveling.awardXP('testplayer', 50, mockEntityManager);
}
console.log(`Current: Level ${mockPlayer.level}`);
console.log(`Stats: STR ${mockPlayer.strength}, DEX ${mockPlayer.dexterity}, CON ${mockPlayer.constitution}, INT ${mockPlayer.intelligence}, WIS ${mockPlayer.wisdom}, CHA ${mockPlayer.charisma}`);
console.log('');

console.log('=== All Tests Complete ===\n');
