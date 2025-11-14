/**
 * equipment command
 * Display currently equipped items
 */

module.exports = {
  id: "equipment",
  name: "equipment",
  aliases: ["eq", "equipped"],
  category: "player",
  description: "View your currently equipped items",
  usage: "equipment",
  help: "Shows all items you currently have equipped, including weapons and armor.",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    let output = [];
    output.push('');
    output.push(colors.highlight('='.repeat(60)));
    output.push(colors.highlight(`  ${player.name}'s Equipment`));
    output.push(colors.highlight('='.repeat(60)));
    output.push('');

    // Check if player has any equipment
    if (!player.equipped || Object.keys(player.equipped).length === 0) {
      output.push(colors.dim('  You have nothing equipped.'));
      output.push('');
      output.push(colors.highlight('='.repeat(60)));
      output.push('');
      session.sendLine(output.join('\n'));
      return;
    }

    // Define equipment slots in display order
    const slots = [
      { key: 'head', label: 'Head' },
      { key: 'chest', label: 'Chest' },
      { key: 'legs', label: 'Legs' },
      { key: 'hands', label: 'Hands' },
      { key: 'feet', label: 'Feet' },
      { key: 'mainHand', label: 'Main Hand' },
      { key: 'offHand', label: 'Off Hand' },
      { key: 'shield', label: 'Shield' }
    ];

    let hasEquipment = false;

    // Display each slot
    for (const slot of slots) {
      const itemId = player.equipped[slot.key];

      if (itemId) {
        const item = entityManager.get(itemId);
        if (item) {
          hasEquipment = true;
          const itemName = item.getDisplayName ? item.getDisplayName() : item.name;

          // Build info string
          let info = [];

          // Show damage for weapons
          if (item.itemType === 'weapon' && item.damage) {
            info.push(`${item.damage} damage`);
          }

          // Show AC for armor
          if (item.itemType === 'armor' && item.baseAC !== undefined) {
            const effectiveAC = item.getAC ? item.getAC(player.dexterity || 10) : item.baseAC;
            info.push(`${effectiveAC} AC`);
          }

          // Show condition
          if (item.getCondition) {
            const condition = item.getCondition();
            if (condition === 'broken') {
              info.push(colors.error('BROKEN'));
            } else if (condition === 'terrible' || condition === 'poor') {
              info.push(colors.warning(condition));
            }
          }

          const infoStr = info.length > 0 ? ` ${colors.dim('(' + info.join(', ') + ')')}` : '';

          output.push(`  ${colors.info(slot.label + ':')} ${colors.objectName(itemName)}${infoStr}`);
        }
      }
    }

    if (!hasEquipment) {
      output.push(colors.dim('  You have nothing equipped.'));
    }

    output.push('');

    // Calculate and show total AC
    const totalAC = this.calculateTotalAC(player, entityManager);
    output.push(colors.info(`  Total AC: `) + colors.success(totalAC.toString()));

    output.push('');
    output.push(colors.highlight('='.repeat(60)));
    output.push('');

    session.sendLine(output.join('\n'));
  },

  /**
   * Calculate total AC from all equipped armor
   */
  calculateTotalAC: function(player, entityManager) {
    if (!player.equipped) {
      return 10; // Base AC with no armor
    }

    const playerDex = player.dexterity || 10;
    const dexMod = Math.floor((playerDex - 10) / 2);

    // Start with base AC (10 + dex modifier for unarmored)
    let totalAC = 10 + dexMod;
    let hasBodyArmor = false;

    // Check for body armor (chest slot)
    const chestArmorId = player.equipped.chest;
    if (chestArmorId) {
      const armor = entityManager.get(chestArmorId);
      if (armor && armor.itemType === 'armor' && !armor.broken) {
        totalAC = armor.getAC ? armor.getAC(playerDex) : armor.baseAC;
        hasBodyArmor = true;
      }
    }

    // Add shield bonus if equipped
    const shieldId = player.equipped.shield;
    if (shieldId) {
      const shield = entityManager.get(shieldId);
      if (shield && shield.itemType === 'armor' && !shield.broken) {
        const shieldBonus = shield.getAC ? shield.getAC(playerDex) : 2;
        totalAC += shieldBonus;
      }
    }

    return totalAC;
  }
};
