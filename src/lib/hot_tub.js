/**
 * Hot Tub
 *
 * A physical hot tub object that appears in a room.
 * Players can enter it to access the shared hot tub room.
 * Multiple players can be in the hot tub simultaneously.
 */

module.exports = {
  type: 'hot_tub',
  name: 'hot tub',
  aliases: ['hottub', 'tub', 'jacuzzi'],

  // Short description when seen in a room
  short: 'a steaming hot tub',

  // Long description when examined from outside
  description: "A luxurious hot tub large enough for several people, its water bubbling " +
               "invitingly at a perfect 104 degrees. Steam rises in lazy spirals, carrying " +
               "the scent of chlorine and relaxation. The tub's interior is lined with comfortable " +
               "seating and what appears to be an elaborate control panel of buttons. " +
               "Chromotherapy lights glow beneath the surface, cycling through soothing colors.\n" +
               "You could enter it if you're ready to relax.",

  /**
   * Enter the hot tub
   * Called by the enter command
   * @param {Object} player - Player object
   * @param {Object} entityManager - EntityManager instance
   * @returns {Object} {success: boolean, message: string, destination: string}
   */
  enter(player, entityManager) {
    // Get the hot tub room
    const hotTubRoom = entityManager.get('hot_tub_room');
    if (!hotTubRoom) {
      return {
        success: false,
        message: "Error: The hot tub is currently out of order."
      };
    }

    // Get the current room (where this hot tub is)
    const currentRoomId = this.location?.room;
    if (!currentRoomId) {
      return {
        success: false,
        message: "Error: Hot tub location not found."
      };
    }

    // Update hot tub room's exit to point back here
    hotTubRoom.exits = hotTubRoom.exits || {};
    hotTubRoom.exits.out = currentRoomId;
    entityManager.markDirty('hot_tub_room');

    return {
      success: true,
      destination: 'hot_tub_room',
      enterMessage: "You ease yourself into the steaming water with a contented sigh.",
      roomMessage: `${(player.capname || player.name)} climbs into the hot tub.`
    };
  }
};
