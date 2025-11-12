# Sesame Street Layout

## Overview
Sesame Street is a north-south thoroughfare connecting Reality Street (the darker entrance to the MUD) to various cheerful locations in The Wumpy and Grift world.

## Map

```
                    Reality Street
                   (test_room / Oscar)
                   [Dark Alleyway]
                           |
                        (south)
                           ↓
                    [North End]---------(east)--------[Teleport Booth]
                 (sesame_street_north)
                    (green wumpy)
                           |
                        (south)
                           ↓
                     [Mid-North]-------(west)------[Hotel Lobby]---(west)---[Hotel Room 01]
                 (sesame_street_03)
                   (yellow wumpy)
                           |
                        (south)
                           ↓
                  [Central Plaza]------(east)------[General Store]
                 (sesame_street_01)                (Hooper's/shopkeeper)
                    (Big Bird)
                           |
                        (west)
                           ↓
                   [Furry Arms]------(south)------[Arena Lounge]---(south)---[Arena Main]
                      (bar)                                                   (Champion)
                 (bartender, purple)
                           |
                        (east)
                           ↓
                  [Central Plaza]
                           |
                        (south)
                           ↓
                    [Mid-South]-------(east)-------[Count's Fountain]
                 (sesame_street_02)                 (healing room)
                   (blue wumpy)
                           |
                        (south)
                           ↓
                    [South End]
                (sesame_street_south)
                    (red wumpy)
                   [DEAD END]
```

## Room Connections

### Main Street (North to South)
1. **Reality Street** (test_room) - The dark alleyway entrance with Oscar the Grouch
   - Exits: south to sesame_street_north

2. **Northern End** (sesame_street_north) - Terminus with teleport booth access
   - Exits: south to sesame_street_03, north to test_room, east to teleport_booth
   - NPCs: Green Wumpy

3. **Mid-North** (sesame_street_03) - Wholesome peak of the street
   - Exits: north to sesame_street_north, south to sesame_street_01, west to hotel_lobby
   - NPCs: Yellow Wumpy

4. **Central Plaza** (sesame_street_01) - Heart of Sesame Street with shop and bar
   - Exits: north to sesame_street_03, south to sesame_street_02, east to general_store, west to bar
   - NPCs: Big Bird

5. **Mid-South** (sesame_street_02) - Pleasant boulevard with fountain access
   - Exits: north to sesame_street_01, south to sesame_street_south, east to counts_fountain
   - NPCs: Blue Wumpy

6. **Southern End** (sesame_street_south) - Welcome sign terminus
   - Exits: north to sesame_street_02
   - NPCs: Red Wumpy

### Branch Locations

#### East Branches
- **General Store** (general_store) - Hooper's shop
  - Exits: west to sesame_street_01
  - NPCs: Shopkeeper

- **Count's Fountain** (counts_fountain) - Healing room with counting waters
  - Exits: west to sesame_street_02
  - Type: healing_room (restores 5 HP every 5 seconds)

- **Teleport Booth** (teleport_booth) - Dimensional travel hub
  - Exits: south to sesame_street_north

#### West Branches
- **Furry Arms Tavern** (bar) - Sticky tables and liquid courage
  - Exits: east to sesame_street_01, south to arena_lounge
  - NPCs: Bartender, Purple Wumpy

- **Hotel Lobby** (hotel_lobby) - The Snuggly Sleeper
  - Exits: east to sesame_street_03, west to hotel_room_01

- **Hotel Room 01** (hotel_room_01) - Guest accommodations
  - Exits: east to hotel_lobby

#### South of Bar
- **Arena Lounge** (arena_lounge) - Pre-combat gathering space
  - Exits: north to bar, south to arena_main

- **Arena Main** (arena_main) - Combat arena
  - Exits: north to arena_lounge
  - NPCs: Arena Champion

## Key Features

### Entry Points
- **Primary Entry**: Reality Street (test_room) connects south to Northern End of Sesame Street
- **Alternative Travel**: Teleport Booth (future functionality for quest-based travel)

### Special Rooms
- **Count's Fountain**: Healing room that automatically restores HP over time
- **General Store**: Functional shop with merchant system
- **Arena**: Combat practice area (future PvP functionality)
- **Hotel**: Rest and recovery area (future functionality)

### NPCs
- **Wumpies**: One in each main street room (red, blue, yellow, green, purple)
- **Big Bird**: Central Plaza greeter
- **Oscar the Grouch**: Reality Street guardian
- **Shopkeeper**: Hooper's General Store merchant
- **Bartender**: Furry Arms Tavern keeper
- **Arena Champion**: Combat trainer/opponent

## Design Notes

### Corrected Issues (2025-11-12)
- **Problem**: Count's Fountain was blocking the northern end, preventing connection to Reality Street
- **Solution**: Moved Count's Fountain to an eastern branch off sesame_street_02 (Mid-South)
- **Benefit**: Maintains healing room accessibility while opening proper north-south thoroughfare

### Layout Philosophy
- **Main Street**: Clear north-south progression from dark (Reality Street) to light (South End)
- **Branches**: Important facilities branch off main street (shops east, social west)
- **Special Areas**: Healing and teleportation accessible but not blocking main flow
- **Dead Ends**: Appropriate for terminal locations (South End, Hotel Room, Arena, Fountain)

### Future Expansion
- Additional hotel rooms can branch west from hotel_lobby
- More arena rooms for tournaments/ranked matches
- Teleport booth connections to other realms
- Additional shops or services branching from main street
