/**
 * spells command
 * List available spells and their details
 */

const magic = require('../systems/magic');
const mana = require('../systems/mana');

module.exports = {
  id: "spells",
  name: "spells",
  aliases: ["spell", "magic"],
  category: "magic",
  description: "List available spells",
  usage: "spells [spell name]",
  help: "Lists all spells you can cast. Specify a spell name for detailed information.\nExamples:\n  spells\n  spells magic missile",
  requiresLogin: true,

  execute: function(session, args, entityManager, colors) {
    const player = session.player;

    // Check if player has mana pool
    if (!player.maxMp) {
      session.sendLine(colors.error('You have no magical ability!'));
      return;
    }

    // If args provided, show details for a specific spell
    if (args && args.trim().length > 0) {
      const spellName = args.trim();
      const spell = magic.findSpellByName(spellName);

      if (!spell) {
        session.sendLine(colors.error(`Unknown spell: ${spellName}`));
        return;
      }

      // Display detailed spell information
      session.sendLine('');
      session.sendLine(colors.highlight(`${spell.name}`));
      session.sendLine(colors.dim('='.repeat(spell.name.length)));
      session.sendLine('');
      session.sendLine(spell.description);
      session.sendLine('');
      session.sendLine(colors.dim(`Mana Cost: ${spell.manaCost} MP`));

      if (spell.minLevel) {
        session.sendLine(colors.dim(`Level Requirement: ${spell.minLevel}`));
      }

      if (spell.adminOnly) {
        session.sendLine(colors.warning('⚠️  ADMIN ONLY - Requires administrator privileges'));
      }

      session.sendLine(colors.dim(`Target Type: ${spell.targetType}`));

      if (spell.effects && spell.effects.length > 0) {
        session.sendLine('');
        session.sendLine(colors.dim('Effects:'));
        for (const effect of spell.effects) {
          let effectDesc = `  - ${effect.type}`;
          if (effect.amount) effectDesc += ` (${effect.amount}`;
          if (effect.levelScale) effectDesc += ` + ${effect.levelScale}/level`;
          if (effect.amount) effectDesc += ')';
          if (effect.duration) effectDesc += ` for ${effect.duration}s`;
          session.sendLine(colors.dim(effectDesc));
        }
      }

      session.sendLine('');

      // Check if player can cast this spell
      const castCheck = magic.canCast(player, spell);
      if (castCheck.canCast) {
        session.sendLine(colors.success('✓ You can cast this spell'));
      } else {
        session.sendLine(colors.error(`✗ ${castCheck.reason}`));
      }

      session.sendLine('');
      return;
    }

    // List all available spells
    // TODO: Filter by player's guild when guild system is implemented
    // For now, show all global spells

    const allSpells = magic.getAllSpells();

    if (allSpells.length === 0) {
      session.sendLine(colors.error('No spells available. Contact an administrator.'));
      return;
    }

    session.sendLine('');
    session.sendLine(colors.highlight('Available Spells'));
    session.sendLine(colors.dim('='.repeat(40)));
    session.sendLine('');
    session.sendLine(colors.dim(`Your Mana: ${mana.getManaStatus(player)}`));
    session.sendLine('');

    // Sort spells by mana cost
    allSpells.sort((a, b) => a.manaCost - b.manaCost);

    for (const spell of allSpells) {
      const canCastCheck = magic.canCast(player, spell);
      const prefix = canCastCheck.canCast ? colors.success('✓') : colors.dim('✗');
      const levelReq = spell.minLevel ? colors.dim(` [Lv ${spell.minLevel}]`) : '';
      const adminBadge = spell.adminOnly ? colors.warning(' [ADMIN]') : '';

      session.sendLine(`  ${prefix} ${colors.highlight(spell.name)}${adminBadge} - ${spell.description.split('.')[0]} (${spell.manaCost} MP)${levelReq}`);
    }

    session.sendLine('');
    session.sendLine(colors.dim('Use "spells <name>" for details'));
    session.sendLine(colors.dim('Use "cast <name> [target]" to cast a spell'));
    session.sendLine('');
  }
};
