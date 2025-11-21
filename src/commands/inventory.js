/**
 * inventory command
 * Check your inventory
 */

module.exports = {
  id: "inventory",
  name: "inventory",
  aliases: ["i"],
  category: "basic",
  description: "Check your inventory",
  usage: "inventory",
  help: "Displays a list of all items you are currently carrying.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;
    const items = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'item' &&
      obj.location?.type === 'inventory' &&
      obj.location?.owner === player.id
    );

    // Header
    session.sendLine('');
    session.sendLine(colors.highlight('═'.repeat(60)));
    session.sendLine(colors.highlight('  Inventory'));
    session.sendLine(colors.highlight('═'.repeat(60)));
    session.sendLine('');

    if (items.length === 0) {
      session.sendLine(colors.dim('  Your pack is empty. Time to go shopping?'));
      session.sendLine('');
      session.sendLine(colors.highlight('═'.repeat(60)));
      session.sendLine('');
      return;
    }

    // Group items by type
    const weapons = items.filter(i => i.itemType === 'weapon');
    const armor = items.filter(i => i.itemType === 'armor');
    const consumables = items.filter(i => i.itemType === 'consumable');
    const other = items.filter(i => !['weapon', 'armor', 'consumable'].includes(i.itemType));

    // Helper function to check if item is equipped
    const isEquipped = (itemId) => {
      if (!player.equipped) return false;
      return Object.values(player.equipped).includes(itemId);
    };

    // Helper function to format item line
    const formatItem = (item) => {
      let line = '  ';

      // Item name with color
      const itemName = item.getDisplayName ? item.getDisplayName() : item.name;
      line += colors.objectName(itemName);

      // Quantity for stackable items
      if (item.quantity && item.quantity > 1) {
        line += colors.dim(` (x${item.quantity})`);
      }

      // Equipped indicator
      if (isEquipped(item.id)) {
        line += colors.success(' [equipped]');
      }

      // Weapon damage
      if (item.itemType === 'weapon' && item.damage) {
        line += colors.dim(` - ${item.damage} damage`);
      }

      // Armor AC
      if (item.itemType === 'armor' && item.baseAC !== undefined) {
        const ac = item.getAC ? item.getAC(player.dexterity || 10) : item.baseAC;
        line += colors.dim(` - ${ac} AC`);
      }

      // Condition for weapons/armor
      if ((item.itemType === 'weapon' || item.itemType === 'armor') && item.getCondition) {
        const condition = item.getCondition();
        if (condition === 'broken') {
          line += colors.error(' [BROKEN]');
        } else if (condition === 'terrible' || condition === 'poor') {
          line += colors.warning(` [${condition}]`);
        }
      }

      return line;
    };

    // Display weapons
    if (weapons.length > 0) {
      session.sendLine(colors.info('⚔️  Weapons:'));
      session.sendLine(colors.dim('─'.repeat(60)));
      weapons.forEach(item => session.sendLine(formatItem(item)));
      session.sendLine('');
    }

    // Display armor
    if (armor.length > 0) {
      session.sendLine(colors.info('🛡️  Armor:'));
      session.sendLine(colors.dim('─'.repeat(60)));
      armor.forEach(item => session.sendLine(formatItem(item)));
      session.sendLine('');
    }

    // Display consumables
    if (consumables.length > 0) {
      session.sendLine(colors.info('🍎 Consumables:'));
      session.sendLine(colors.dim('─'.repeat(60)));
      consumables.forEach(item => session.sendLine(formatItem(item)));
      session.sendLine('');
    }

    // Display other items
    if (other.length > 0) {
      session.sendLine(colors.info('📦 Items:'));
      session.sendLine(colors.dim('─'.repeat(60)));
      other.forEach(item => session.sendLine(formatItem(item)));
      session.sendLine('');
    }

    // Summary footer
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalWeight = items.reduce((sum, item) => sum + ((item.weight || 0) * (item.quantity || 1)), 0);

    session.sendLine(colors.dim('─'.repeat(60)));
    session.sendLine(colors.dim(`  Total: ${totalItems} item${totalItems !== 1 ? 's' : ''}`) +
                     (totalWeight > 0 ? colors.dim(` | Weight: ${totalWeight.toFixed(1)} lbs`) : ''));
    session.sendLine('');
    session.sendLine(colors.highlight('═'.repeat(60)));
    session.sendLine('');
  }
};
