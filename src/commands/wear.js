/**
 * wear command
 * Equip armor to your equipment slots
 */

module.exports = {
  id: "wear",
  name: "wear",
  aliases: ["equip_armor", "don"],
  category: "items",
  description: "Equip armor to protect yourself in combat",
  usage: "wear <armor>",
  help: "Equips armor from your inventory to the appropriate slot (head, chest, legs, hands, feet, shield). Example: 'wear leather armor'",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    if (!args || args.trim() === '') {
      session.sendLine(colors.error('Wear what?'));
      session.sendLine(colors.hint('Usage: wear <armor>'));
      return;
    }

    const armorName = args.trim().toLowerCase();

    // Initialize equipped object if it doesn't exist
    if (!player.equipped) {
      player.equipped = {};
      entityManager.markDirty(player.id);
    }

    // Find the item in inventory
    if (!player.inventory || player.inventory.length === 0) {
      session.sendLine(colors.error('You have nothing in your inventory.'));
      return;
    }

    // Search inventory for matching item
    let foundArmor = null;
    for (const itemId of player.inventory) {
      const item = entityManager.get(itemId);
      if (!item) continue;

      const itemDisplayName = item.getDisplayName ? item.getDisplayName() : item.name;
      if (itemDisplayName.toLowerCase().includes(armorName)) {
        foundArmor = item;
        break;
      }
    }

    if (!foundArmor) {
      session.sendLine(colors.error(`You don't have '${armorName}' in your inventory.`));
      return;
    }

    // Check if it's armor
    if (foundArmor.itemType !== 'armor') {
      session.sendLine(colors.error(`You can't wear ${foundArmor.name} - it's not armor!`));
      if (foundArmor.itemType === 'weapon') {
        session.sendLine(colors.hint(`Use 'wield' to equip weapons.`));
      }
      return;
    }

    // Check if armor is broken
    if (foundArmor.broken) {
      session.sendLine(colors.error(`${foundArmor.name} is broken and cannot be worn!`));
      return;
    }

    // Determine the slot (default to 'chest' if not specified)
    const slot = foundArmor.slot || 'chest';

    // Unequip previous armor in this slot if any
    const previousArmorId = player.equipped[slot];
    if (previousArmorId) {
      const previousArmor = entityManager.get(previousArmorId);
      if (previousArmor) {
        session.sendLine(colors.info(`You remove ${previousArmor.name}.`));
      }
    }

    // Equip the new armor
    player.equipped[slot] = foundArmor.id;
    entityManager.markDirty(player.id);

    // Notify player
    session.sendLine(colors.success(`You wear ${foundArmor.name}.`));

    // Notify room
    const room = entityManager.get(player.currentRoom);
    if (room) {
      entityManager.notifyRoom(room.id,
        colors.action(`${player.name} puts on ${foundArmor.name}.`),
        player.id);
    }

    // Show armor info
    if (foundArmor.baseAC !== undefined) {
      const effectiveAC = foundArmor.getAC ? foundArmor.getAC(player.dexterity || 10) : foundArmor.baseAC;
      session.sendLine(colors.dim(`AC: ${effectiveAC}`));

      if (foundArmor.getArmorTypeDescription) {
        session.sendLine(colors.dim(`Type: ${foundArmor.getArmorTypeDescription()}`));
      }
    }
    if (foundArmor.durability !== undefined && foundArmor.maxDurability !== undefined) {
      const condition = foundArmor.getCondition ? foundArmor.getCondition() : 'unknown';
      session.sendLine(colors.dim(`Condition: ${condition}`));
    }
  }
};
