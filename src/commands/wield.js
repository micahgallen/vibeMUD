/**
 * wield command
 * Equip a weapon to your main hand or off hand
 */

module.exports = {
  id: "wield",
  name: "wield",
  aliases: ["equip", "eq"],
  category: "items",
  description: "Equip a weapon to use in combat",
  usage: "wield <item> [main|off]",
  help: "Equips a weapon from your inventory to your main hand or off hand. If no hand is specified, defaults to main hand. Examples: 'wield sword', 'wield dagger off'",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    if (!args || args.trim() === '') {
      session.sendLine(colors.error('Wield what?'));
      session.sendLine(colors.hint('Usage: wield <item> [main|off]'));
      return;
    }

    // Parse arguments
    const parts = args.trim().toLowerCase().split(/\s+/);
    const itemName = parts.slice(0, -1).join(' ') || parts[0];
    const lastPart = parts[parts.length - 1];

    // Determine which hand
    let hand = 'mainHand';
    if (lastPart === 'off' || lastPart === 'offhand') {
      hand = 'offHand';
    } else if (lastPart === 'main' || lastPart === 'mainhand') {
      hand = 'mainHand';
    }

    // If user specified hand, remove it from item name
    const searchName = (lastPart === 'off' || lastPart === 'offhand' || lastPart === 'main' || lastPart === 'mainhand')
      ? parts.slice(0, -1).join(' ')
      : itemName;

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
    let foundItem = null;
    for (const itemId of player.inventory) {
      const item = entityManager.get(itemId);
      if (!item) continue;

      const itemDisplayName = item.getDisplayName ? item.getDisplayName() : item.name;
      if (itemDisplayName.toLowerCase().includes(searchName)) {
        foundItem = item;
        break;
      }
    }

    if (!foundItem) {
      session.sendLine(colors.error(`You don't have '${searchName}' in your inventory.`));
      return;
    }

    // Check if it's a weapon
    if (foundItem.itemType !== 'weapon') {
      session.sendLine(colors.error(`You can't wield ${foundItem.name} - it's not a weapon!`));
      session.sendLine(colors.hint(`Use 'wear' to equip armor.`));
      return;
    }

    // Check if weapon is broken
    if (foundItem.broken) {
      session.sendLine(colors.error(`${foundItem.name} is broken and cannot be wielded!`));
      return;
    }

    // Unequip previous weapon in this hand if any
    const previousWeaponId = player.equipped[hand];
    if (previousWeaponId) {
      const previousWeapon = entityManager.get(previousWeaponId);
      if (previousWeapon) {
        session.sendLine(colors.info(`You unwield ${previousWeapon.name}.`));
      }
    }

    // Equip the new weapon
    player.equipped[hand] = foundItem.id;
    entityManager.markDirty(player.id);

    // Notify player
    const handName = hand === 'mainHand' ? 'main hand' : 'off hand';
    session.sendLine(colors.success(`You wield ${foundItem.name} in your ${handName}.`));

    // Notify room
    const room = entityManager.get(player.currentRoom);
    if (room) {
      entityManager.notifyRoom(room.id,
        colors.action(`${(player.capname || player.name)} wields ${foundItem.name}.`),
        player.id);
    }

    // Show weapon info
    if (foundItem.damage) {
      session.sendLine(colors.dim(`Damage: ${foundItem.damage}`));
    }
    if (foundItem.durability !== undefined && foundItem.maxDurability !== undefined) {
      const condition = foundItem.getCondition ? foundItem.getCondition() : 'unknown';
      session.sendLine(colors.dim(`Condition: ${condition}`));
    }
  }
};
