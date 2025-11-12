/**
 * Healing Room Definition
 * Room with magical healing properties
 */

module.exports = {
  type: 'room',
  name: 'Healing Fountain',
  description: 'A magical fountain bubbles with healing waters.',
  exits: {},
  items: [],
  healsPlayers: true,
  healAmount: 5,

  /**
   * Healing fountain heartbeat - regenerates HP for players in the room
   * This function is inherited by all healing room instances
   */
  heartbeat: function(entityManager) {
    const players = Array.from(entityManager.objects.values()).filter(obj =>
      obj.type === 'player' && obj.currentRoom === this.id
    );

    for (const player of players) {
      if (player.hp < player.maxHp) {
        const healAmount = this.healAmount || 5;
        const oldHp = player.hp;
        player.hp = Math.min(player.hp + healAmount, player.maxHp);
        const actualHeal = player.hp - oldHp;

        if (actualHeal > 0) {
          entityManager.markDirty(player.id);
          entityManager.notifyPlayer(player.id,
            `\x1b[32mThe magical fountain heals you for ${actualHeal} HP. (${player.hp}/${player.maxHp})\x1b[0m`);
        }
      }
    }
  }
};
