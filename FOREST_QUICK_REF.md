# Newbie Forest - Quick Reference

## Fast Facts
- **Total Rooms**: 25 (5x5 grid)
- **Grid Range**: forest_X_Y where X=1-5 (columns), Y=1-5 (rows)
- **Theme**: Aggressively cute with creeping horror
- **Entry Point**: forest_1_1 (northwest corner)
- **Hub Room**: forest_3_3 (center, has booth portal)

## NPCs by Location
```
forest_3_1 → test_rat (Level 1)
forest_3_2 → test_goblin_warrior (Level 5)
forest_3_4 → test_knight (Level 8)
```

## Loot Containers
```
forest_5_1 → forest_chest_01 (Berry-Stained Basket)
  ├─ apple_001
  └─ potion_001

forest_3_3 → forest_chest_02 (Hollow Tree Trunk) [CENTER]
  ├─ torch_001
  ├─ dagger_001
  └─ gem_001

forest_3_4 → forest_chest_03 (Toy Box)
  ├─ leather_armor_001
  └─ wooden_shield_001
```

## Special Items
```
forest_3_3 → booth_portal_newbie (connects to booth_room)
```

## Navigation Tips

### Corner Rooms (2 exits each)
- **forest_1_1** (NW): south, east
- **forest_5_1** (NE): south, west
- **forest_1_5** (SW): north, east
- **forest_5_5** (SE): north, west

### Edge Rooms (3 exits each)
- **Row 1** (north edge): + south, east, west
- **Row 5** (south edge): + north, east, west
- **Column 1** (west edge): + north, south, east
- **Column 5** (east edge): + north, south, west

### Interior Rooms (4 exits each)
- All rooms not on edges have: north, south, east, west

## Room Atmosphere by Row

**Row 1 (Safest/Lightest)**
- Giggling Glade, Sunbeam Hollow, Whistling Grove, Dewdrop Dell, Friendly Thicket
- Cute with subtle hints of wrongness

**Row 2**
- Honeysuckle Bend, Laughing Meadow, Toadstool Circle, Butterfly Sanctuary, Rabbit Warren
- Light unease, things watching

**Row 3 (Center)**
- Singing Stones, Puddle Hollow, Heart of Happiness, Garden of Delights, Squirrel Parliament
- Bright facade, dark heart, booth portal here

**Row 4**
- Twilight Glade, Whispering Dark, Forgetting Place, Mirror Grove, Dollhouse
- Growing darkness, overt wrongness

**Row 5 (Darkest/Most Dangerous)**
- Smiling Dark, Carousel of Dreams, Lullaby, Birthday Party, Lost Things Go
- Full horror, corrupted childhood imagery

## Theme Elements

### Recurring Motifs
- **Counting**: Animals counting (rabbits, frogs)
- **Children**: Laughter, toys, nursery rhymes - never seen
- **Watching**: Everything watches with too much intelligence
- **Wrongness**: Numbers/colors/dimensions subtly off
- **Invitation**: "Stay", "Play", "Come"

### Color Palette
- Rows 1-3: Pastels, candy colors, golden light
- Rows 4-5: Darkening, sickly green, wrong ultraviolet

### Sensory Details
- **Smells**: Honey/vanilla → copper/decay → graves/formaldehyde
- **Sounds**: Birdsong → whispers → lullabies → silence
- **Touch**: Soft grass → warm spots → sticky surfaces

## Testing Commands

```bash
# Verify grid connections
node verify_forest_grid.js

# Load and check all rooms in EntityManager
# (Start server, telnet in, navigate around)

# Check specific room
less src/world/newbie_realm/rooms/forest_3_3.json
```

## File Locations

```
Rooms:       src/world/newbie_realm/rooms/forest_*.json
Containers:  src/world/newbie_realm/containers/forest_chest_*.json
Items:       src/world/newbie_realm/items/booth_portal_newbie.json
NPCs:        src/world/newbie_realm/npcs/test_*.json (existing)
```

## Expansion Ideas

### Potential Additions
1. Hidden room accessible from forest_5_5's small door
2. Forest boss NPC (The Thing That Lives Under)
3. Quest line involving the missing children
4. Seasonal variations (darker at night, blooming in spring)
5. Secret paths requiring specific items to discover

### Connection Points
- Could connect to other newbie areas at forest_1_1 (west exit)
- Could add deep forest rooms extending south from row 5
- Booth portal allows fast travel to any realm

## Writing Style Checklist

When adding to this area, remember:
- ✓ Second person perspective
- ✓ Sensory descriptions (all 5 senses)
- ✓ Dark humor and wordplay
- ✓ Things are "almost" or "nearly" right
- ✓ Accumulation of unsettling details
- ✓ Subversion of innocence
- ✓ Let wrongness build gradually

## Common Phrases Used
- "almost like", "nearly", "seems to", "might be"
- "too many", "too perfect", "too bright"
- "when you're not looking"
- "you could swear"
- "it's hard to tell"
- "something that reminds you of"

---

**Created**: 2025-11-21
**Status**: Complete and verified
**Version**: 1.0
