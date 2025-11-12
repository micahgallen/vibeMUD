#!/usr/bin/env node

/**
 * EntityManager Demo Script
 *
 * Demonstrates the core concept:
 * - Load all objects
 * - Move items between locations
 * - Validate consistency
 * - Save changes
 */

const EntityManager = require('./src/core/EntityManager');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   EntityManager Prototype Demo                            ║');
console.log('║   Simple Object Architecture (LPmud-inspired)             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Create EntityManager (uses default src/data path)
const em = new EntityManager();

// ========================================
// STEP 1: Load all objects
// ========================================
console.log('═══ STEP 1: Load All Objects ═══\n');
em.loadAll();

// ========================================
// STEP 2: Show initial state
// ========================================
console.log('═══ STEP 2: Initial State ═══\n');
em.printAll();
em.printInventory('alice');
em.printInventory('chest_001');

// ========================================
// STEP 3: Validate initial consistency
// ========================================
console.log('═══ STEP 3: Validate Initial State ═══\n');
em.validate();

// ========================================
// STEP 4: Move sword from Alice to chest
// ========================================
console.log('═══ STEP 4: Move Sword (alice → chest) ═══\n');

em.move('sword_001', {
  type: 'container',
  owner: 'chest_001'
});

// ========================================
// STEP 5: Show state after first move
// ========================================
console.log('═══ STEP 5: State After First Move ═══\n');
em.printInventory('alice');
em.printInventory('chest_001');

// ========================================
// STEP 6: Move gem from room to Alice
// ========================================
console.log('═══ STEP 6: Move Gem (room → alice) ═══\n');

em.move('gem_001', {
  type: 'inventory',
  owner: 'alice'
});

// ========================================
// STEP 7: Show state after second move
// ========================================
console.log('═══ STEP 7: State After Second Move ═══\n');
em.printInventory('alice');
em.printInventory('chest_001');

const room = em.get('test_room');
console.log(`\n🏠 test_room items: ${room.items.length > 0 ? room.items.join(', ') : '(empty)'}`);

// ========================================
// STEP 8: Move potion from Alice to chest
// ========================================
console.log('\n═══ STEP 8: Move Potion (alice → chest) ═══\n');

em.move('potion_001', {
  type: 'container',
  owner: 'chest_001'
});

// ========================================
// STEP 9: Final state
// ========================================
console.log('═══ STEP 9: Final State ═══\n');
em.printAll();
em.printInventory('alice');
em.printInventory('chest_001');

// ========================================
// STEP 10: Validate final consistency
// ========================================
console.log('═══ STEP 10: Validate Final Consistency ═══\n');
const isValid = em.validate();

if (isValid) {
  console.log('✅ All items accounted for');
  console.log('✅ No duplication detected');
  console.log('✅ All references valid\n');
}

// ========================================
// STEP 11: Save changes
// ========================================
console.log('═══ STEP 11: Save Changes ═══\n');
em.saveDirty();

// ========================================
// STEP 12: Summary
// ========================================
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Demo Complete!                                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('What just happened:');
console.log('  1. ✓ Loaded all objects from JSON files');
console.log('  2. ✓ Moved sword from Alice to chest');
console.log('  3. ✓ Moved gem from room to Alice');
console.log('  4. ✓ Moved potion from Alice to chest');
console.log('  5. ✓ Validated no duplication bugs');
console.log('  6. ✓ Saved all changes back to JSON files');
console.log('');
console.log('Key insight:');
console.log('  • ONE move() function handled all location changes');
console.log('  • Automatically updated all references');
console.log('  • Guaranteed consistency (no duplication possible)');
console.log('  • Simple, elegant, understandable');
console.log('');
console.log('Check src/data/players/ to see the updated player files!');
console.log('');
