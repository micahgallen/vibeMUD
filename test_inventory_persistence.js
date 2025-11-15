/**
 * Test script for inventory persistence
 */

const EntityManager = require('./src/core/EntityManager');
const fs = require('fs');
const path = require('path');

console.log('\n=== Testing Inventory Persistence ===\n');

// Create entity manager
const em = new EntityManager();

// Load all entities
console.log('Step 1: Loading game world...');
em.loadAll();
console.log('');

// Get a test player
const player = em.get('testplayer');
if (!player) {
  console.error('❌ Test player not found!');
  process.exit(1);
}

console.log(`Player: ${player.name}`);
console.log(`Current inventory: ${player.inventory.length} items`);
console.log('');

// Clone some items into player's inventory
console.log('Step 2: Adding items to player inventory...');

// Clone a sword
const sword = em.clone('sword_001', {
  location: { type: 'inventory', owner: player.id }
});
console.log(`  ✓ Added ${sword.name} (${sword.id})`);

// Clone leather armor
const armor = em.clone('leather_armor_001', {
  location: { type: 'inventory', owner: player.id }
});
console.log(`  ✓ Added ${armor.name} (${armor.id})`);

// Clone an apple
const apple = em.clone('apple_001', {
  location: { type: 'inventory', owner: player.id }
});
console.log(`  ✓ Added ${apple.name} (${apple.id})`);

em.markDirty(player.id);

console.log('');
console.log(`Player now has ${player.inventory.length} items in inventory`);
console.log('');

// Save everything
console.log('Step 3: Saving player and instances...');
em.saveDirty();
console.log('');

// Verify instance file was created
const instanceFile = path.join(__dirname, 'src/data/instances', `${player.id}.json`);
if (fs.existsSync(instanceFile)) {
  const instanceData = JSON.parse(fs.readFileSync(instanceFile, 'utf8'));
  console.log(`✓ Instance file created with ${instanceData.length} items`);
  console.log('');
} else {
  console.error('❌ Instance file was not created!');
  process.exit(1);
}

// Simulate server restart by creating a new EntityManager
console.log('Step 4: Simulating server restart...');
const em2 = new EntityManager();
em2.loadAll();
console.log('');

// Get the player again
const player2 = em2.get('testplayer');
console.log(`Step 5: Verifying inventory after restart...`);
console.log(`Player inventory: ${player2.inventory.length} items`);

if (player2.inventory.length === 3) {
  console.log('✅ SUCCESS! All 3 items persisted across restart');

  // Verify the items exist
  for (const itemId of player2.inventory) {
    const item = em2.get(itemId);
    if (item) {
      console.log(`  ✓ ${item.name} (${itemId})`);
    } else {
      console.log(`  ❌ Item ${itemId} not found!`);
    }
  }
} else {
  console.log(`❌ FAILURE! Expected 3 items, found ${player2.inventory.length}`);
  process.exit(1);
}

console.log('');
console.log('=== All Tests Passed! ===\n');
