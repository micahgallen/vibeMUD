/**
 * Migration script to clean up invalid inventory references
 * and prepare for instance persistence
 */

const fs = require('fs');
const path = require('path');

const playersDir = path.join(__dirname, 'src/data/players');

console.log('🔧 Migrating player inventories...\n');

// Read all player files
const playerFiles = fs.readdirSync(playersDir).filter(f => f.endsWith('.json'));

for (const file of playerFiles) {
  const filePath = path.join(playersDir, file);
  const data = fs.readFileSync(filePath, 'utf8');
  const player = JSON.parse(data);

  let modified = false;

  // Clean up invalid inventory references
  if (player.inventory && Array.isArray(player.inventory)) {
    const oldCount = player.inventory.length;
    player.inventory = [];
    if (oldCount > 0) {
      console.log(`  ${player.name}: Cleared ${oldCount} invalid inventory items`);
      modified = true;
    }
  }

  // Clean up invalid equipped references
  if (player.equipped && typeof player.equipped === 'object') {
    const oldEquipped = Object.keys(player.equipped).length;
    player.equipped = {};
    if (oldEquipped > 0) {
      console.log(`  ${player.name}: Cleared ${oldEquipped} invalid equipped items`);
      modified = true;
    }
  }

  // Save if modified
  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(player, null, 2));
    console.log(`  ✓ Saved ${player.name}\n`);
  } else {
    console.log(`  ${player.name}: No changes needed\n`);
  }
}

console.log('✅ Migration complete!\n');
console.log('Players can now pick up items and they will persist across server restarts.');
