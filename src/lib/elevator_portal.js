/**
 * Elevator Portal
 *
 * A physical elevator object that appears in a room.
 * Players can enter it to access the shared elevator room.
 */

module.exports = {
  type: 'elevator_portal',
  name: 'elevator',
  aliases: ['elevator', 'lift'],

  // Short description when seen in a room
  short: 'a gleaming elevator',

  // Long description when examined from outside
  description: "A gleaming elevator with polished brass doors that have seen better days. " +
               "The doors are slightly ajar, revealing a surprisingly spacious interior. " +
               "A small placard reads 'The Snuggly Sleeper Express - All Floors'.\n" +
               "You could enter it if you're feeling adventurous.",

  /**
   * Enter the elevator portal
   * Called by the enter command
   * @param {Object} player - Player object
   * @param {Object} entityManager - EntityManager instance
   * @returns {Object} {success: boolean, message: string, destination: string}
   */
  enter(player, entityManager) {
    // Get the elevator room
    const elevatorRoom = entityManager.get('elevator_room');
    if (!elevatorRoom) {
      return {
        success: false,
        message: "Error: The elevator is currently out of service."
      };
    }

    // Get the current room (where this portal is)
    const currentRoomId = this.location?.room;
    if (!currentRoomId) {
      return {
        success: false,
        message: "Error: Elevator location not found."
      };
    }

    // Update elevator room's exit to point back here
    elevatorRoom.exits = elevatorRoom.exits || {};
    elevatorRoom.exits.out = currentRoomId;
    entityManager.markDirty('elevator_room');

    return {
      success: true,
      destination: 'elevator_room',
      enterMessage: "The brass doors slide open with a dignified wheeze, and you step inside.",
      roomMessage: `${player.name} enters the elevator.`
    };
  }
};
