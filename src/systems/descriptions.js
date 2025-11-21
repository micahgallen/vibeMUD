/**
 * Player Description System
 *
 * Generates rich, flavorful descriptions for player characters in the style of
 * "The Wumpy and Grift" MUD. Combines base descriptions, level-based flavor,
 * health status, equipment display, guild affiliation, and special states.
 *
 * Architecture: SYSTEMS layer (game-wide rules)
 * Used by: examine command, who command, etc.
 */

/**
 * Base descriptions for lewns (looney beings)
 * 10 variations for variety, randomly selected based on player ID hash
 */
const LEWN_BASE_DESCRIPTIONS = [
  // Classic looney
  "This lewn appears to have been drawn by an animator having a particularly good day. Their proportions are enthusiastically optimistic about the laws of physics, with features that suggest someone tried to make a person but got distracted halfway through and just went with it. The overall effect is endearing in that 'might spontaneously burst into a musical number' sort of way.",

  // Cartoonish realist
  "A lewn of indeterminate origin stands here, looking like they stepped out of a Saturday morning cartoon and immediately regretted it. Their outline is just crisp enough to suggest solidity, but vague enough to imply they might squash flat if a sufficiently large mallet were applied. The universe hasn't quite decided if they're a protagonist or comic relief, so it hedged its bets.",

  // Existentially aware
  "This lewn has the appearance of someone who exists in technicolor while everyone else is in sepia tone. They seem perpetually surprised to have mass and volume, as if expecting at any moment to be erased by a cosmic animator's correction fluid. Despite this, they project an air of determined three-dimensionality, however temporary it might be.",

  // Optimistically constructed
  "A lewn of remarkably looney construction occupies this space with the confidence of someone who has never encountered a mirror and doesn't plan to start now. Their features have been assembled with what can only be described as 'enthusiastic approximation' - close enough to humanoid to be relatable, strange enough to make you wonder what the reference material was.",

  // Post-modern toon
  "This lewn looks like they were designed by committee, then redesigned by a different committee that disagreed with the first committee, then given up on and sent to production anyway. The result is charmingly incoherent - a being that exists in flagrant disregard of conventional anatomy, held together by optimism and possibly cartoon physics.",

  // Stylistically questionable
  "A lewn stands here with the unmistakable quality of something that shouldn't work but does. Their proportions flirt with impossibility, their movements suggest a skeleton made of rubber bands and wishful thinking, and their overall vibe screams 'I'm not quite sure what I am, but I'm committed to the bit.' It's working for them.",

  // Cheerfully absurd
  "This lewn appears to have been assembled from spare cartoon parts after all the good ones were taken. What remains is a delightful hodgepodge of features that somehow coalesce into a functional being. They carry themselves with the breezy confidence of someone who has never let things like 'anatomical correctness' or 'making sense' slow them down.",

  // Dimensionally flexible
  "A lewn of suspicious dimensionality occupies this general area of space-time. They seem to exist in slightly more dimensions than strictly necessary, giving them an appearance that's somehow both flat and round, abstract and concrete, here and slightly to the left of here. It's disorienting in a weirdly wholesome way.",

  // Pragmatically surreal
  "This lewn has embraced their looney nature with practical enthusiasm. Their appearance suggests someone took a normal person, put them through a cosmic cartoon filter, and decided 'eh, good enough.' The result is a being that's simultaneously relatable and impossible, ordinary and absurd - basically, they fit right in around here.",

  // Philosophically toon
  "A lewn stands before you, existing in that peculiar state between caricature and character. They look like they were drawn with broad strokes and good intentions, then animated with a budget that ran out halfway through. Nevertheless, they persist, a monument to the triumph of style over anatomical necessity."
];

/**
 * Level-based descriptions
 * Organized by percentile buckets (0-10%, 10-20%, etc.)
 * No actual numbers - just qualitative vibes
 * Single sentence format
 */
const LEVEL_DESCRIPTIONS = [
  // 0-10%: Total newbie
  "They have the slightly bewildered look of someone who just figured out which end of the sword to hold and is unreasonably proud of this accomplishment.",

  // 10-20%: Gaining confidence
  "They carry themselves with the tentative confidence of someone who has survived their first few encounters with the world and lived to tell about it.",

  // 20-30%: Getting the hang of it
  "A certain competence shows through the rough edges, suggesting they've been around long enough to stop asking where the bathroom is.",

  // 30-40%: Solidly middling
  "They project the aura of someone who knows what they're doing about 60 percent of the time, which frankly is better than most.",

  // 40-50%: Halfway decent
  "They have that 'been there, done that, got the commemorative t-shirt' vibe of someone who's past the point where every challenge feels like a personal attack.",

  // 50-60%: Above average
  "They move with the purposeful gravitas that comes from surviving long enough to develop strong opinions about optimal combat strategies.",

  // 60-70%: Quite experienced
  "Experience clings to them like a well-worn cloak, comfortable and familiar, earned through having seen some things and lived to awkwardly recount them.",

  // 70-80%: Veteran status
  "A seasoned veteran aura surrounds them like an invisible force field of 'I've dealt with worse than you.'",

  // 80-90%: Seriously powerful
  "They radiate the kind of casual competence that makes you want to either challenge them or hide behind them, depending on your relationship to self-preservation.",

  // 90-100%: Living legend
  "This lewn has transcended mere 'experience' and entered the realm of 'walking cautionary tale,' moving with the effortless grace that only comes from surviving things that would make lesser beings file insurance claims."
];

/**
 * Health descriptions
 * Four quarters: 75-100%, 50-75%, 25-50%, 0-25%
 * Qualitative and flavorful, no numbers
 * Single sentence format
 */
const HEALTH_DESCRIPTIONS = [
  // 75-100%: Healthy
  "They look healthy and hale, with the robust vigor of someone whose hit points are more 'hit' than 'point.'",

  // 50-75%: Roughed up
  "They're looking a bit worse for wear with some scuffs and bruises, still functional but in that 'I should probably find a healer soon' sort of way.",

  // 25-50%: Hurting
  "They appear to be held together by determination and possibly some improvised bandaging, the kind of battered that makes you wonder what they fought and whether it was worth it.",

  // 0-25%: Critical
  "They look like they're one stiff breeze away from becoming a cautionary tale, battered and bruised and held together by sheer stubborn refusal to admit defeat."
];

/**
 * Guild descriptions
 * Covers guildless state and placeholder for future guilds
 */
const GUILD_DESCRIPTIONS = {
  guildless: [
    "They bear no guild markings, wandering the world as a free agent of chaos and questionable decision-making. Some call it independence. Others call it 'not having gotten around to joining yet.'",

    "Guildless and proud of it - or possibly just procrastinating on the paperwork. Either way, they answer to no one except possibly their own poor life choices.",

    "They wear the invisible badge of the unguilded with either dignified independence or stubborn indecision. The jury is still out on which.",

    "No guild colors mar their appearance, suggesting either a fiercely independent spirit or someone who keeps missing the recruitment fairs. Both are equally valid lifestyle choices.",

    "They project the unmistakable aura of someone who reads all the guild brochures but never quite gets around to filling out the application. Freedom, or commitment issues? You decide."
  ],

  // Placeholder for future guilds
  // When guilds are implemented, add entries like:
  // warriors: "They bear the proud colors of the Warriors' Guild...",
  // mages: "Arcane symbols mark them as a member of the Mages' Guild...",
  // etc.
};

/**
 * Generate equipment description based on what the player is wearing/wielding
 * @param {object} player - The player object
 * @param {object} entityManager - EntityManager instance
 * @param {object} colors - Color utility object
 * @returns {string} Equipment description or null if no equipment
 */
function getEquipmentDescription(player, entityManager, colors) {
  if (!player.equipped || Object.keys(player.equipped).length === 0) {
    return null;
  }

  const weapons = [];
  const armor = [];

  // Check weapons
  if (player.equipped.mainHand) {
    const weapon = entityManager.get(player.equipped.mainHand);
    if (weapon) {
      const weaponName = weapon.getDisplayName ? weapon.getDisplayName() : weapon.name;
      weapons.push(`${colors.objectName(weaponName)} in their main hand`);
    }
  }

  if (player.equipped.offHand) {
    const weapon = entityManager.get(player.equipped.offHand);
    if (weapon) {
      const weaponName = weapon.getDisplayName ? weapon.getDisplayName() : weapon.name;
      weapons.push(`${colors.objectName(weaponName)} in their off hand`);
    }
  }

  // Check armor slots
  const armorSlots = [
    { key: 'head', label: 'on their head' },
    { key: 'chest', label: 'on their chest' },
    { key: 'legs', label: 'on their legs' },
    { key: 'hands', label: 'on their hands' },
    { key: 'feet', label: 'on their feet' },
    { key: 'shield', label: 'as a shield' }
  ];

  for (const slot of armorSlots) {
    if (player.equipped[slot.key]) {
      const item = entityManager.get(player.equipped[slot.key]);
      if (item) {
        const itemName = item.getDisplayName ? item.getDisplayName() : item.name;
        armor.push(`${colors.objectName(itemName)} ${slot.label}`);
      }
    }
  }

  // Build the description
  const parts = [];

  if (weapons.length > 0) {
    parts.push(`They are wielding ${weapons.join(' and ')}`);
  }

  if (armor.length > 0) {
    if (armor.length === 1) {
      parts.push(`wearing ${armor[0]}`);
    } else if (armor.length === 2) {
      parts.push(`wearing ${armor.join(' and ')}`);
    } else {
      const lastArmor = armor.pop();
      parts.push(`wearing ${armor.join(', ')}, and ${lastArmor}`);
    }
  }

  if (parts.length === 0) {
    return null;
  }

  // Join parts appropriately
  if (parts.length === 1) {
    return parts[0] + '.';
  } else {
    return parts.join(', ') + '.';
  }
}

/**
 * Get guild description for a player
 * @param {object} player - The player object
 * @param {object} colors - Color utility object
 * @returns {string} Guild description
 */
function getGuildDescription(player, colors) {
  const guild = player.guild || 'guildless';

  if (guild === 'guildless') {
    // Randomly select from guildless descriptions based on player ID hash
    const hash = hashString(player.id);
    const index = hash % GUILD_DESCRIPTIONS.guildless.length;
    return GUILD_DESCRIPTIONS.guildless[index];
  }

  // Future guild support
  if (GUILD_DESCRIPTIONS[guild]) {
    return GUILD_DESCRIPTIONS[guild];
  }

  // Fallback for unknown guilds
  return `They claim membership in the ${guild} guild, though you've never heard of it. Probably one of those trendy new organizations with a waiting list and an incomprehensible manifesto.`;
}

/**
 * Get level-based description for a player
 * @param {number} level - Player's level
 * @returns {string} Level description
 */
function getLevelDescription(level) {
  // Determine percentile bucket (assuming max level 100, adjust as needed)
  const maxLevel = 100;
  const percentile = Math.min((level / maxLevel) * 100, 100);
  const bucket = Math.min(Math.floor(percentile / 10), 9); // 0-9 for 10 buckets

  return LEVEL_DESCRIPTIONS[bucket];
}

/**
 * Get health description for a player
 * @param {number} hp - Current HP
 * @param {number} maxHp - Maximum HP
 * @returns {string} Health description
 */
function getHealthDescription(hp, maxHp) {
  const percent = (hp / maxHp) * 100;

  if (percent >= 75) return HEALTH_DESCRIPTIONS[0];
  if (percent >= 50) return HEALTH_DESCRIPTIONS[1];
  if (percent >= 25) return HEALTH_DESCRIPTIONS[2];
  return HEALTH_DESCRIPTIONS[3];
}

/**
 * Generate base description for a player's race
 * Currently only supports lewns, but structured for future race support
 * @param {object} player - The player object
 * @returns {string} Base description
 */
function generatePlayerDescription(player) {
  const race = player.race || 'lewn';

  if (race === 'lewn') {
    // Select description based on player ID hash for consistency
    const hash = hashString(player.id);
    const index = hash % LEWN_BASE_DESCRIPTIONS.length;
    return LEWN_BASE_DESCRIPTIONS[index];
  }

  // Future race support can be added here
  return `A ${race} stands before you, looking suitably ${race}-like.`;
}

/**
 * Simple string hash function for consistent pseudo-random selection
 * @param {string} str - String to hash
 * @returns {number} Hash value
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate complete player description for examine command
 * @param {object} player - The player object
 * @param {object} entityManager - EntityManager instance
 * @param {object} colors - Color utility object
 * @returns {object} Object containing all description parts
 */
function generateCompletePlayerDescription(player, entityManager, colors) {
  return {
    base: generatePlayerDescription(player),
    level: getLevelDescription(player.level || 1),
    health: getHealthDescription(player.hp || 100, player.maxHp || 100),
    equipment: getEquipmentDescription(player, entityManager, colors),
    guild: getGuildDescription(player, colors),
    ghost: player.isGhost ? colors.dim('A ghostly aura surrounds this lewn, suggesting a recent and unfortunate demise.') : null
  };
}

module.exports = {
  generatePlayerDescription,
  getLevelDescription,
  getHealthDescription,
  getEquipmentDescription,
  getGuildDescription,
  generateCompletePlayerDescription,

  // Export constants for testing or customization
  LEWN_BASE_DESCRIPTIONS,
  LEVEL_DESCRIPTIONS,
  HEALTH_DESCRIPTIONS,
  GUILD_DESCRIPTIONS
};
