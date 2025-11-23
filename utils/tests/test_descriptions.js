#!/usr/bin/env node
/**
 * Test script for the player description system
 * Demonstrates all description types with various player states
 */

const descSystem = require('./src/systems/descriptions');
const colorUtils = require('./src/core/colors');

console.log('\n' + '='.repeat(80));
console.log('PLAYER DESCRIPTION SYSTEM TEST');
console.log('='.repeat(80) + '\n');

// Test player with various states
const testPlayers = [
  {
    id: 'newbie_001',
    name: 'Newbie',
    race: 'lewn',
    level: 1,
    hp: 100,
    maxHp: 100,
    guild: undefined
  },
  {
    id: 'veteran_001',
    name: 'Veteran',
    race: 'lewn',
    level: 75,
    hp: 800,
    maxHp: 1000,
    guild: undefined
  },
  {
    id: 'legend_001',
    name: 'Legend',
    race: 'lewn',
    level: 99,
    hp: 50,
    maxHp: 2000,
    guild: undefined,
    isGhost: false
  },
  {
    id: 'ghost_001',
    name: 'Ghost',
    race: 'lewn',
    level: 50,
    hp: 1,
    maxHp: 500,
    guild: undefined,
    isGhost: true
  }
];

// Mock entityManager for testing
const mockEntityManager = {
  objects: new Map(),
  get: function(id) { return null; }
};

// Test each player
testPlayers.forEach((player, index) => {
  console.log(colorUtils.highlight(`TEST ${index + 1}: ${player.name.toUpperCase()}`));
  console.log(colorUtils.dim('Level: ' + player.level + ', HP: ' + player.hp + '/' + player.maxHp + (player.isGhost ? ', GHOST' : '')));
  console.log('-'.repeat(80) + '\n');

  const desc = descSystem.generateCompletePlayerDescription(player, mockEntityManager, colorUtils);

  console.log(colorUtils.playerName(player.name));
  console.log(desc.base);
  console.log();
  console.log(desc.level);
  console.log(desc.health);

  if (desc.equipment) {
    console.log();
    console.log(desc.equipment);
  }

  console.log();
  console.log(desc.guild);

  if (desc.ghost) {
    console.log();
    console.log(desc.ghost);
  }

  console.log('\n' + '='.repeat(80) + '\n');
});

// Test consistency - same player should get same base description
console.log(colorUtils.highlight('CONSISTENCY TEST'));
console.log(colorUtils.dim('Same player ID should always get the same base description'));
console.log('-'.repeat(80) + '\n');

const consistentPlayer = {
  id: 'consistent_test',
  race: 'lewn',
  level: 1,
  hp: 100,
  maxHp: 100
};

console.log('First generation:');
console.log(descSystem.generatePlayerDescription(consistentPlayer));
console.log();

console.log('Second generation (should be identical):');
console.log(descSystem.generatePlayerDescription(consistentPlayer));
console.log();

console.log('Third generation (should be identical):');
console.log(descSystem.generatePlayerDescription(consistentPlayer));
console.log('\n' + '='.repeat(80) + '\n');

// Test variety - different players should get different descriptions
console.log(colorUtils.highlight('VARIETY TEST'));
console.log(colorUtils.dim('Different player IDs should get different base descriptions'));
console.log('-'.repeat(80) + '\n');

for (let i = 0; i < 5; i++) {
  const variedPlayer = {
    id: `player_${i}`,
    race: 'lewn',
    level: 1,
    hp: 100,
    maxHp: 100
  };
  console.log(`Player ${i + 1}:`);
  console.log(descSystem.generatePlayerDescription(variedPlayer));
  console.log();
}

console.log('='.repeat(80) + '\n');

// Test all level descriptions
console.log(colorUtils.highlight('LEVEL DESCRIPTIONS TEST'));
console.log(colorUtils.dim('All 10 percentile buckets'));
console.log('-'.repeat(80) + '\n');

const levels = [1, 15, 25, 35, 50, 60, 70, 80, 90, 99];
levels.forEach((level, index) => {
  console.log(colorUtils.cyan(`Level ${level} (bucket ${index}):`));
  console.log(descSystem.getLevelDescription(level));
  console.log();
});

console.log('='.repeat(80) + '\n');

// Test all health descriptions
console.log(colorUtils.highlight('HEALTH DESCRIPTIONS TEST'));
console.log(colorUtils.dim('All 4 health quarters'));
console.log('-'.repeat(80) + '\n');

const healthStates = [
  { hp: 100, maxHp: 100, label: '100% (Healthy)' },
  { hp: 60, maxHp: 100, label: '60% (Roughed up)' },
  { hp: 30, maxHp: 100, label: '30% (Hurting)' },
  { hp: 10, maxHp: 100, label: '10% (Critical)' }
];

healthStates.forEach(state => {
  console.log(colorUtils.cyan(state.label + ':'));
  console.log(descSystem.getHealthDescription(state.hp, state.maxHp));
  console.log();
});

console.log('='.repeat(80) + '\n');

// Test guild descriptions
console.log(colorUtils.highlight('GUILD DESCRIPTIONS TEST'));
console.log(colorUtils.dim('Guildless variations'));
console.log('-'.repeat(80) + '\n');

for (let i = 0; i < 5; i++) {
  const guildedPlayer = {
    id: `guilded_${i}`,
    guild: undefined
  };
  console.log(`Guildless variation ${i + 1}:`);
  console.log(descSystem.getGuildDescription(guildedPlayer, colorUtils));
  console.log();
}

console.log('='.repeat(80) + '\n');

// Test unknown guild
console.log(colorUtils.highlight('UNKNOWN GUILD TEST'));
console.log('-'.repeat(80) + '\n');

const weirdGuildPlayer = {
  id: 'weird_001',
  guild: 'super_secret_assassins'
};

console.log('Unknown guild:');
console.log(descSystem.getGuildDescription(weirdGuildPlayer, colorUtils));
console.log('\n' + '='.repeat(80) + '\n');

// Display statistics
console.log(colorUtils.highlight('SYSTEM STATISTICS'));
console.log('-'.repeat(80) + '\n');

console.log(`Base lewn descriptions: ${descSystem.LEWN_BASE_DESCRIPTIONS.length}`);
console.log(`Level descriptions: ${descSystem.LEVEL_DESCRIPTIONS.length}`);
console.log(`Health descriptions: ${descSystem.HEALTH_DESCRIPTIONS.length}`);
console.log(`Guildless descriptions: ${descSystem.GUILD_DESCRIPTIONS.guildless.length}`);
console.log();

const avgLewnLength = descSystem.LEWN_BASE_DESCRIPTIONS.reduce((sum, desc) => sum + desc.length, 0) / descSystem.LEWN_BASE_DESCRIPTIONS.length;
const avgLevelLength = descSystem.LEVEL_DESCRIPTIONS.reduce((sum, desc) => sum + desc.length, 0) / descSystem.LEVEL_DESCRIPTIONS.length;
const avgHealthLength = descSystem.HEALTH_DESCRIPTIONS.reduce((sum, desc) => sum + desc.length, 0) / descSystem.HEALTH_DESCRIPTIONS.length;

console.log(`Average lewn description length: ${Math.round(avgLewnLength)} characters`);
console.log(`Average level description length: ${Math.round(avgLevelLength)} characters`);
console.log(`Average health description length: ${Math.round(avgHealthLength)} characters`);

console.log('\n' + '='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80) + '\n');
