/**
 * Loot System
 * Manages item drops from monsters, including:
 * - Tag-based item indexing
 * - Level-based loot tier selection
 * - Weighted random loot generation
 * - Equipment drop chances
 * - Domain-aware loot filtering
 */

// Level to tier mapping
const LEVEL_TIER_MAP = {
  1: ['trash', 'poor'],
  2: ['trash', 'poor'],
  3: ['poor', 'good'],
  4: ['poor', 'good'],
  5: ['poor', 'good'],
  6: ['good', 'amazing'],
  7: ['good', 'amazing'],
  8: ['good', 'amazing'],
  9: ['amazing', 'epic'],
  10: ['amazing', 'epic'],
  11: ['amazing', 'epic'],
  12: ['epic', 'legendary'],
  13: ['epic', 'legendary']
  // 14+: all tiers available
};

module.exports = {
  // Loot indexes built during initialization
  lootIndex: {
    byDomain: {},      // { "newbie_realm": [itemIds...] }
    bySubdomain: {},   // { "forest": [itemIds...] }
    byTier: {},        // { "trash": [itemIds...], "poor": [...] }
    byCategory: {}     // { "weapon": [itemIds...] }
  },

  /**
   * Initialize the loot system by scanning all items and building indexes
   * @param {object} entityManager - The entity manager
   */
  initialize(entityManager) {
    console.log('  📦 Initializing loot system...');

    // Reset indexes
    this.lootIndex = {
      byDomain: {},
      bySubdomain: {},
      byTier: {},
      byCategory: {}
    };

    let indexed = 0;

    // Scan all items for loot tags
    for (const [id, obj] of entityManager.objects.entries()) {
      if (obj.type === 'item' && obj.lootTags) {
        this._indexItem(id, obj.lootTags);
        indexed++;
      }
    }

    console.log(`  ✅ Indexed ${indexed} items for loot generation`);
    console.log(`     Domains: ${Object.keys(this.lootIndex.byDomain).length}`);
    console.log(`     Tiers: ${Object.keys(this.lootIndex.byTier).length}`);
    console.log(`     Categories: ${Object.keys(this.lootIndex.byCategory).length}`);
  },

  /**
   * Index an item by its loot tags
   * @private
   */
  _indexItem(itemId, tags) {
    // Index by domain
    if (tags.domain) {
      if (!this.lootIndex.byDomain[tags.domain]) {
        this.lootIndex.byDomain[tags.domain] = [];
      }
      this.lootIndex.byDomain[tags.domain].push(itemId);
    }

    // Index by subdomain
    if (tags.subdomain) {
      if (!this.lootIndex.bySubdomain[tags.subdomain]) {
        this.lootIndex.bySubdomain[tags.subdomain] = [];
      }
      this.lootIndex.bySubdomain[tags.subdomain].push(itemId);
    }

    // Index by tier
    if (tags.tier) {
      if (!this.lootIndex.byTier[tags.tier]) {
        this.lootIndex.byTier[tags.tier] = [];
      }
      this.lootIndex.byTier[tags.tier].push(itemId);
    }

    // Index by categories
    if (tags.categories && Array.isArray(tags.categories)) {
      for (const category of tags.categories) {
        if (!this.lootIndex.byCategory[category]) {
          this.lootIndex.byCategory[category] = [];
        }
        this.lootIndex.byCategory[category].push(itemId);
      }
    }
  },

  /**
   * Generate all loot for a monster when it dies
   * @param {string} monsterId - The ID of the dead monster
   * @param {object} entityManager - The entity manager
   * @returns {Array<string>} - Array of item IDs to add to corpse
   */
  generateLoot(monsterId, entityManager) {
    const monster = entityManager.get(monsterId);
    if (!monster || monster.type !== 'npc') {
      return [];
    }

    const room = entityManager.get(monster.currentRoom);
    const lootConfig = monster.loot || {};
    const generatedLoot = [];

    console.log(`  💎 Generating loot for ${monster.name} (level ${monster.level || 1})`);

    // 1. Guaranteed drops
    if (lootConfig.guaranteedDrops && lootConfig.guaranteedDrops.length > 0) {
      for (const itemTemplateId of lootConfig.guaranteedDrops) {
        const itemId = this._createLootItem(itemTemplateId, entityManager);
        if (itemId) {
          generatedLoot.push(itemId);
          console.log(`    ✓ Guaranteed: ${itemTemplateId}`);
        }
      }
    }

    // 2. Equipped items (with drop chance)
    if (monster.equipped) {
      const baseDropChance = lootConfig.equippedDropChance || 0.25;

      for (const slot in monster.equipped) {
        const itemId = monster.equipped[slot];
        if (!itemId) continue;

        const item = entityManager.get(itemId);
        if (!item) continue;

        // Use item-specific drop chance or fall back to base chance
        const dropChance = item.lootTags?.presetDropChance || baseDropChance;
        const roll = Math.random();

        if (roll < dropChance) {
          generatedLoot.push(itemId); // Item already exists, just add its ID
          console.log(`    ✓ Equipped (${Math.floor(dropChance * 100)}%): ${item.name} from ${slot}`);
        } else {
          console.log(`    ✗ Equipped failed (${Math.floor(dropChance * 100)}%): ${item.name} from ${slot}`);
        }
      }
    }

    // 3. Items in inventory (always drop)
    if (monster.inventory && monster.inventory.length > 0) {
      for (const itemId of monster.inventory) {
        generatedLoot.push(itemId);
        const item = entityManager.get(itemId);
        console.log(`    ✓ Inventory: ${item ? item.name : itemId}`);
      }
    }

    // 4. Random loot table rolls
    if (lootConfig.randomLoot?.enabled) {
      const rolls = lootConfig.randomLoot.rolls || 1;
      const tierOverride = lootConfig.randomLoot.tierOverride;
      const domainOverride = lootConfig.randomLoot.domainOverride;
      const domain = domainOverride || room?.domain || 'newbie_realm';
      const level = monster.level || 1;

      for (let i = 0; i < rolls; i++) {
        const itemId = this._rollRandomLoot(domain, tierOverride, level, entityManager);
        if (itemId) {
          generatedLoot.push(itemId);
          const item = entityManager.get(itemId);
          console.log(`    ✓ Random roll ${i + 1}: ${item ? item.name : itemId}`);
        } else {
          console.log(`    ✗ Random roll ${i + 1}: no item generated`);
        }
      }

      // TODO: Bonus tables (Phase 2 enhancement)
      if (lootConfig.randomLoot.bonusTables && lootConfig.randomLoot.bonusTables.length > 0) {
        console.log(`    ⚠️  Bonus tables not yet implemented`);
      }
    }

    console.log(`  💎 Generated ${generatedLoot.length} total loot items`);
    return generatedLoot;
  },

  /**
   * Roll for random loot based on domain and tier
   * @private
   */
  _rollRandomLoot(domain, tierOverride, level, entityManager) {
    // Determine tiers to pull from
    const tiers = tierOverride ? (Array.isArray(tierOverride) ? tierOverride : [tierOverride]) : this._getTiersForLevel(level);

    // Find items matching domain AND tier
    const candidates = [];

    for (const tier of tiers) {
      const tierItems = this.lootIndex.byTier[tier] || [];
      const domainItems = this.lootIndex.byDomain[domain] || [];

      // Intersection: items that are both in this tier AND this domain
      for (const itemId of tierItems) {
        if (domainItems.includes(itemId) && !candidates.includes(itemId)) {
          candidates.push(itemId);
        }
      }
    }

    if (candidates.length === 0) {
      console.log(`    ⚠️  No items found for domain: ${domain}, tiers: ${tiers.join(', ')}`);
      return null;
    }

    // Weighted random selection
    return this._weightedRandomItem(candidates, entityManager);
  },

  /**
   * Select an item using weighted random selection
   * @private
   */
  _weightedRandomItem(itemIds, entityManager) {
    // Build weighted list
    const items = itemIds.map(id => {
      const item = entityManager.get(id);
      return {
        id,
        weight: item?.lootTags?.dropWeight || 10
      };
    });

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

    if (totalWeight === 0) {
      // All items have 0 weight, pick randomly
      const randomIndex = Math.floor(Math.random() * items.length);
      return this._createLootItem(items[randomIndex].id, entityManager);
    }

    // Weighted random roll
    let roll = Math.random() * totalWeight;

    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) {
        return this._createLootItem(item.id, entityManager);
      }
    }

    // Fallback (shouldn't happen)
    return this._createLootItem(items[0].id, entityManager);
  },

  /**
   * Create a unique loot item instance from a template
   * @private
   */
  _createLootItem(templateId, entityManager) {
    const template = entityManager.get(templateId);

    if (!template) {
      console.warn(`  ⚠️  Template not found: ${templateId}`);
      return null;
    }

    // Generate unique instance ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const instanceId = `${templateId}_loot_${timestamp}_${random}`;

    // Create instance with prototypal inheritance
    const instance = Object.create(template);
    Object.assign(instance, {
      id: instanceId,
      isInstance: true,
      location: null // Will be set when added to corpse
    });

    // Register instance
    entityManager.objects.set(instanceId, instance);

    return instanceId;
  },

  /**
   * Get appropriate loot tiers for a given monster level
   * @private
   */
  _getTiersForLevel(level) {
    if (level >= 14) {
      // High-level monsters can drop anything
      return ['trash', 'poor', 'good', 'amazing', 'epic', 'legendary'];
    }

    return LEVEL_TIER_MAP[level] || ['good'];
  }
};
