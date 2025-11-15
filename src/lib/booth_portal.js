/**
 * Booth Portal
 *
 * A physical transporter booth object that appears in a room.
 * Players can enter it to access the shared booth room.
 */

module.exports = {
  type: 'booth_portal',
  name: 'transporter booth',
  aliases: ['booth', 'transporter'],

  // Short description when seen in a room
  short: 'a mysterious transporter booth',

  // Long description when examined from outside
  description: "This booth looks a lot like one of those picture-taking booths you see in " +
               "malls and at fairs. It looks very inviting.\n" +
               "Why not enter and give it a try?",

  /**
   * Enter the booth portal
   * Called by the enter command
   * @param {Object} player - Player object
   * @param {Object} entityManager - EntityManager instance
   * @returns {Object} {success: boolean, message: string, destination: string}
   */
  enter(player, entityManager) {
    // Get the booth room
    const boothRoom = entityManager.get('booth_room');
    if (!boothRoom) {
      return {
        success: false,
        message: "Error: The booth room is not available."
      };
    }

    // Get the current room (where this portal is)
    const currentRoomId = this.location?.room;
    if (!currentRoomId) {
      return {
        success: false,
        message: "Error: Portal location not found."
      };
    }

    // Update booth room's exit to point back here
    boothRoom.exits = boothRoom.exits || {};
    boothRoom.exits.out = currentRoomId;
    entityManager.markDirty('booth_room');

    return {
      success: true,
      destination: 'booth_room',
      enterMessage: "You step into the booth.",
      roomMessage: `${player.name} enters the booth.`
    };
  }
};
