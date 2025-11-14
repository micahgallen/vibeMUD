# Combat Persistence Plan: Hybrid Timeout System

## Problem Statement

Currently, combat is purely ephemeral - any disconnect or server restart immediately ends combat. This creates an exploit where players can quit/disconnect to escape combat with no penalty.

## Goals

1. Prevent combat-escape exploits via disconnect/quit
2. Handle brief network disconnects gracefully (60s grace period)
3. Keep implementation simple (no disk I/O for combat encounters)
4. Server restarts still clear combat (acceptable tradeoff)

## Proposed Solution: Combat Timeout System

Combat encounters remain in-memory only, but participants can disconnect and reconnect within a grace period without ending combat.

---

## Architecture Changes

### 1. Combat Encounter Object Enhancement

**Location:** `src/systems/combat.js` - `engage()` function

Add tracking for disconnected participants:

```javascript
const encounter = {
  id: combatId,
  type: 'combat_encounter',
  participants: [attackerId, defenderId],
  initiative: initiative,
  startTime: Date.now(),
  heartbeatInterval: 2,
  disconnectedParticipants: new Set(), // Track who's offline
  disconnectTimers: new Map(), // participantId -> timeout handle
  heartbeat: function(entityManager) {
    processCombatRound(this, entityManager);
  }
};
```

### 2. Disconnect Handler Modification

**Location:** `src/core/server.js` - `networkDriver.onDisconnect`

**Current behavior:**
```javascript
// Immediately disengage and save
if (session.player.combat) {
  combat.disengage(session.player.id, entityManager);
}
```

**New behavior:**
```javascript
if (session.player.combat) {
  const combatId = session.player.combat.combatId;
  const encounter = entityManager.get(combatId);
  
  if (encounter) {
    // Mark as disconnected
    encounter.disconnectedParticipants.add(session.player.id);
    
    console.log(`⏱️  ${session.player.name} disconnected from combat, 60s grace period started`);
    
    // Set timeout for auto-flee
    const timeoutHandle = setTimeout(() => {
      // Check if still disconnected
      const stillOffline = !entityManager.sessions.has(session.player.id);
      
      if (stillOffline) {
        console.log(`⏱️  Combat timeout expired for ${session.player.name} - auto-fleeing`);
        
        const combat = require('../systems/combat');
        combat.disengage(session.player.id, entityManager);
        
        // Notify opponent if online
        const opponent = entityManager.get(session.player.combat?.opponent);
        if (opponent) {
          entityManager.notifyPlayer(opponent.id, 
            `\x1b[33m${session.player.name} has disconnected and fled from combat!\x1b[0m`);
        }
      }
    }, 60000); // 60 second grace period
    
    // Store timeout handle for cleanup
    encounter.disconnectTimers.set(session.player.id, timeoutHandle);
  } else {
    // Combat already ended, just clean up reference
    delete session.player.combat;
  }
}

// Always unregister and save
entityManager.unregisterSession(session.player.id);
entityManager.saveDirty();
```

### 3. LoginHandler Reconnect Logic

**Location:** `src/core/LoginHandler.js` - `completeLogin()` function

**Current behavior:**
```javascript
if (player.combat) {
  const encounter = this.entityManager.get(combatId);
  if (!encounter) {
    // Clean up stale combat
    delete player.combat;
  }
}
```

**New behavior:**
```javascript
if (player.combat) {
  const combatId = player.combat.combatId;
  const encounter = this.entityManager.get(combatId);

  if (encounter) {
    // Reconnected during grace period - resume combat!
    
    // Remove from disconnected set
    if (encounter.disconnectedParticipants) {
      encounter.disconnectedParticipants.delete(player.id);
    }
    
    // Cancel the auto-flee timeout
    if (encounter.disconnectTimers && encounter.disconnectTimers.has(player.id)) {
      clearTimeout(encounter.disconnectTimers.get(player.id));
      encounter.disconnectTimers.delete(player.id);
      console.log(`♻️  ${player.name} reconnected to combat (${combatId})`);
    }
    
    // Notify player
    session.sendLine('');
    session.sendLine(this.colors.warning('='.repeat(60)));
    session.sendLine(this.colors.warning('  You are still in combat!'));
    session.sendLine(this.colors.warning('='.repeat(60)));
    session.sendLine('');
    
    // Notify opponent
    const opponentId = player.combat.opponent;
    this.entityManager.notifyPlayer(opponentId, 
      `\x1b[36m${player.name} has reconnected to combat!\x1b[0m`);
      
  } else {
    // Combat ended while offline - clean up
    console.log(`  🧹 Clearing stale combat state for ${player.name} (combat ended)`);
    delete player.combat;
    this.entityManager.markDirty(player.id);
  }
}
```

### 4. Combat Round Processing Update

**Location:** `src/systems/combat.js` - `processCombatRound()` function

Handle disconnected participants during combat rounds:

```javascript
function processCombatRound(encounter, entityManager) {
  // Check if combat should continue
  if (!shouldContinueCombat(encounter, entityManager)) {
    // Clean up timers before deleting
    if (encounter.disconnectTimers) {
      for (const timeout of encounter.disconnectTimers.values()) {
        clearTimeout(timeout);
      }
    }
    entityManager.disableHeartbeat(encounter.id);
    entityManager.objects.delete(encounter.id);
    return;
  }

  // Process attacks in initiative order
  for (const attackerId of encounter.initiative) {
    const attacker = entityManager.get(attackerId);
    
    // Skip turn if attacker is disconnected
    if (encounter.disconnectedParticipants?.has(attackerId)) {
      console.log(`  ⏸️  ${attacker?.name || attackerId} skipped turn (disconnected)`);
      continue;
    }

    // ... rest of attack processing
  }
}
```

### 5. Combat Validation Update

**Location:** `src/systems/combat.js` - `shouldContinueCombat()` function

Allow combat to continue with disconnected participants:

```javascript
function shouldContinueCombat(encounter, entityManager) {
  let onlineCount = 0;
  
  for (const participantId of encounter.participants) {
    const participant = entityManager.get(participantId);

    // Participant doesn't exist or is dead
    if (!participant || participant.isDead) {
      return false;
    }
    
    // Participant not in this combat anymore
    if (!participant.combat || participant.combat.combatId !== encounter.id) {
      return false;
    }

    // Count online participants
    if (!encounter.disconnectedParticipants?.has(participantId)) {
      onlineCount++;
      
      // Check opponent still exists
      const opponentId = participant.combat.opponent;
      const opponent = entityManager.get(opponentId);
      
      if (!opponent || opponent.isDead) {
        return false;
      }
      
      // Check both in same room (unless one is disconnected)
      if (participant.currentRoom !== opponent.currentRoom) {
        const opponentOffline = encounter.disconnectedParticipants?.has(opponentId);
        if (!opponentOffline) {
          return false; // Both online but different rooms
        }
      }
    }
  }

  // Combat continues as long as at least one participant is online
  return onlineCount > 0;
}
```

### 6. Disengage Cleanup

**Location:** `src/systems/combat.js` - `disengage()` function

Clean up disconnect timers when combat ends normally:

```javascript
function disengage(participantId, entityManager) {
  const participant = entityManager.get(participantId);
  if (!participant || !participant.combat) {
    return;
  }

  const combatId = participant.combat.combatId;
  const encounter = entityManager.get(combatId);
  
  // Clear any pending disconnect timers
  if (encounter?.disconnectTimers) {
    for (const [pid, timeout] of encounter.disconnectTimers) {
      clearTimeout(timeout);
    }
  }

  // ... rest of existing disengage logic
}
```

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Player A DCs → reconnects in 30s | Combat resumes, no penalty |
| Player A DCs → timeout expires | Player A auto-flees, opponent wins |
| Both players DC | Combat continues with both skipping turns until one reconnects or both timeout |
| Player A DCs, Player B kills them | Combat ends normally, death processed |
| Player A DCs, Player B flees | Combat ends, Player A's timeout still running but harmless |
| Server restart during DC | All combat lost, LoginHandler cleans up references (acceptable) |
| Player uses `quit` command | Same as disconnect - 60s grace period |

---

## Testing Checklist

- [ ] Player disconnects and reconnects within 60s - combat resumes
- [ ] Player disconnects and timeout expires - auto-flee triggers
- [ ] Both players disconnect - combat pauses
- [ ] Disconnected player is killed by online player - death processes correctly
- [ ] Online player flees while opponent is DC'd - combat ends cleanly
- [ ] Multiple disconnects/reconnects in same combat
- [ ] Quit command triggers same timeout as disconnect
- [ ] Server restart clears all combat and timers

---

## PvE-Specific Design Considerations

Since the game is primarily PvE (Player vs Environment/NPCs), there are important behavioral differences from PvP:

### 1. NPC Behavior During Player Disconnect

**Question:** What should NPCs do when the player disconnects?

**Options:**

**Option A: NPC Pauses (Recommended for now)**
- NPC skips turns while player is disconnected
- Combat "freezes" from NPC perspective
- Player returns to exact same state

```javascript
// In processCombatRound()
if (encounter.disconnectedParticipants?.has(attackerId)) {
  console.log(`  ⏸️  ${attacker?.name || attackerId} skipped turn (disconnected)`);
  continue;
}
```

**Pros:**
- Fair to players (network issues don't cause death)
- Simple to implement
- No surprise deaths while offline

**Cons:**
- Unrealistic (monster just stands there?)
- Could be exploited (DC to pause when low HP and think)

**Option B: NPC Continues Attacking**
- NPC gets free attacks on disconnected player
- More realistic and dangerous
- Player could die while offline

**Pros:**
- Realistic behavior
- Prevents DC-to-pause exploit
- Higher stakes combat

**Cons:**
- Frustrating for players with bad connections
- Could lose character to network issues
- Need death recap system ("You were killed while offline")

**Option C: NPC Behavior Depends on Type**
- Aggressive NPCs continue attacking
- Neutral/Passive NPCs pause or disengage
- Boss fights continue, trash mobs pause

**Recommendation:** Start with **Option A** (pause) for better player experience, especially during early development when server/network stability might be lower. Can add Option C later as a sophistication.

### 2. NPC State Persistence

**Question:** Should NPC combat state be saved?

**Current:** NPCs are not saved to disk (only players are). NPC state is reconstructed from definitions on server restart.

**Implications:**
- If player DCs during combat, NPC combat state is in memory
- On server restart, NPC loses combat reference but player keeps it
- LoginHandler cleanup will clear player's stale combat reference

**Enhancement Needed:**
When player reconnects after server restart and combat is gone:

```javascript
// In LoginHandler completeLogin()
if (!encounter) {
  // Combat ended while offline - clean up
  console.log(`  🧹 Clearing stale combat state for ${player.name} (combat ended)`);
  
  // Provide context if it was PvE
  const opponentId = player.combat.opponent;
  const opponent = this.entityManager.get(opponentId);
  
  if (opponent && opponent.type === 'npc') {
    session.pendingMessage = `Your combat with ${opponent.name} was interrupted by server maintenance.`;
  }
  
  delete player.combat;
  this.entityManager.markDirty(player.id);
}
```

### 3. Timeout Duration for PvE

**Question:** Should PvE have a different timeout than PvP?

**Consideration:** In PvE, the NPC isn't another human waiting. A longer grace period is more forgiving:

- **PvP (future):** 30-60 seconds (respect other player's time)
- **PvE (current):** 120 seconds (more forgiving for network issues)

**Implementation:**
```javascript
// In disconnect handler
const opponent = entityManager.get(session.player.combat.opponent);
const isPvE = opponent && opponent.type === 'npc';
const graceTime = isPvE ? 120000 : 60000; // 2 min for PvE, 1 min for PvP

const timeoutHandle = setTimeout(() => {
  // ... auto-flee logic
}, graceTime);
```

### 4. NPC Respawn and Combat State

**Question:** What if NPC dies while player is disconnected?

**Scenario:**
1. Player fights NPC, player disconnects
2. Another player kills that NPC
3. NPC respawns (after 5 minutes per current system)
4. Original player reconnects

**Current behavior:** `shouldContinueCombat()` checks if opponent exists and returns false if not, ending combat.

**Enhancement:**
```javascript
if (!opponent || opponent.isDead) {
  // Notify reconnecting player what happened
  if (!opponent) {
    console.log(`  ℹ️  Combat ended - opponent no longer exists`);
  } else if (opponent.isDead) {
    console.log(`  ℹ️  Combat ended - opponent was slain`);
  }
  return false;
}
```

### 5. Multiple Players Fighting Same NPC

**Current limitation:** Combat is 1v1 only. NPC can only fight one player at a time.

**Design consideration:**
```javascript
// In engage(), check if defender is already in combat
if (defender.combat) {
  entityManager.notifyPlayer(attackerId, `${defender.name} is already in combat!`);
  return;
}
```

**Future enhancement:** Support N-player vs 1-NPC combat, but out of scope for persistence plan.

### 6. Flee Mechanics in PvE

**Question:** Should NPCs be able to flee?

**Current:** Only players can call `disengage()` via the flee command.

**Design consideration for future:**
- Weak NPCs could flee at low HP
- Boss NPCs never flee
- Fleeing NPC returns to spawn point

**Related to disconnect:** If player DCs and timeout expires (auto-flee), should NPC:
- Return to spawn/patrol point? 
- Stay in current location?
- Return to full HP?

**Recommendation:** NPC stays at current HP/location until its own heartbeat triggers behavior (current system handles this naturally).

### 7. Combat Logging for PvE

**Consideration:** With NPCs continuing or pausing during DC, players might want to know what happened:

```javascript
// Track combat events in encounter object
encounter.combatLog = [];

// During processCombatRound()
encounter.combatLog.push({
  round: encounter.roundNumber,
  attacker: attackerId,
  defender: defenderId,
  damage: damage,
  hit: true,
  timestamp: Date.now()
});

// On reconnect, show summary if player was offline
if (wasDisconnected && encounter.combatLog.length > 0) {
  session.sendLine('\x1b[90mWhile you were disconnected:\x1b[0m');
  // Show last few log entries
}
```

**Status:** Future enhancement, not required for initial implementation.

---

## Future Enhancements (Out of Scope)

1. **Configurable timeout** - Make grace period a config value per combat type
2. **Death penalty for timeout** - Apply HP loss if combat timeout expires
3. **PvP vs PvE timeout differences** - Shorter timeout for PvP, longer for PvE (see design considerations above)
4. **Combat summary on reconnect** - Show what happened while offline (combat log)
5. **Full persistence** - Save combat encounters to disk for server restart survival
6. **NPC behavior AI** - Smart fleeing, pursuit, different aggression levels
7. **Multi-combatant support** - N players vs 1 NPC, or group combat

---

## Migration Notes

No database migration needed - this is purely runtime behavior changes. Existing player data with `combat` references will be handled by the updated LoginHandler logic.

## Performance Impact

- Minimal: One setTimeout per disconnected combatant (max 2 per combat)
- Timeouts are cleaned up when combat ends or player reconnects
- No additional disk I/O
