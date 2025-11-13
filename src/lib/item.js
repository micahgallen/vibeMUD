/**
 * Base Item Definition
 * Universal item behavior inherited by ALL items (weapons, consumables, armor, etc.)
 *
 * Inheritance chain:
 * item.js (this) → weapon.js/consumable.js/armor.js → template.json → instance
 */

module.exports = {
  type: 'item',

  // Lifecycle flags
  isInstance: false,
  stackable: false,
  quantity: 1,

  // Display methods
  getDisplayName: function() {
    if (this.stackable && this.quantity > 1) {
      return `${this.name} (${this.quantity})`;
    }
    return this.name || this.id;
  },

  getDescription: function() {
    return this.description || 'An ordinary item.';
  },

  // Property accessors
  getWeight: function() {
    const baseWeight = this.weight || 0.1;
    return this.stackable ? baseWeight * this.quantity : baseWeight;
  },

  getValue: function() {
    const baseValue = this.value || 0;
    return this.stackable ? baseValue * this.quantity : baseValue;
  },

  // Stacking behavior
  canStackWith: function(otherItem) {
    if (!otherItem) return false;
    if (this.id === otherItem.id) return false; // Same instance
    if (!this.stackable) return false; // Not stackable

    // Check if they share the same prototype (same template)
    return this.__proto__ === otherItem.__proto__;
  },

  stackWith: function(otherItem, entityManager) {
    if (!this.canStackWith(otherItem)) {
      return false;
    }

    // Combine quantities
    this.quantity += (otherItem.quantity || 1);

    // Destroy the other item
    entityManager.destroy(otherItem.id);

    // Mark this item dirty
    entityManager.markDirty(this.id);

    return true;
  },

  // Split a stack
  split: function(amount, entityManager) {
    if (!this.stackable) {
      return null;
    }

    if (amount >= this.quantity) {
      return null; // Can't split entire stack
    }

    if (amount < 1) {
      return null; // Invalid amount
    }

    // Reduce this stack
    this.quantity -= amount;
    entityManager.markDirty(this.id);

    // Create new stack with the split amount
    const newStack = entityManager.clone(this.__proto__.id, {
      quantity: amount,
      location: this.location
    });

    return newStack;
  },

  // Saving (only instances in certain locations get saved)
  shouldSave: function() {
    if (!this.isInstance) return false; // Templates never save
    if (!this.location) return false; // Locationless items don't save

    // Only save items in player inventory or special containers
    return this.location.type === 'inventory' ||
           (this.location.type === 'container' && this.location.persistent);
  },

  // Serialize for saving (only save own properties, not inherited)
  toJSON: function() {
    const data = { id: this.id };

    // Only save properties that belong to this instance, not inherited ones
    for (const key in this) {
      if (this.hasOwnProperty(key) && key !== '__proto__') {
        data[key] = this[key];
      }
    }

    // Store template reference for reconstruction
    if (this.__proto__ && this.__proto__.id) {
      data.templateId = this.__proto__.id;
    }

    return data;
  },

  // Examine item (for detailed look)
  examine: function() {
    let text = this.getDescription();

    if (this.durability !== undefined && this.maxDurability !== undefined) {
      const percent = Math.floor((this.durability / this.maxDurability) * 100);
      if (percent >= 90) {
        text += '\nIt is in excellent condition.';
      } else if (percent >= 70) {
        text += '\nIt shows some wear.';
      } else if (percent >= 40) {
        text += '\nIt is somewhat damaged.';
      } else if (percent > 0) {
        text += '\nIt is heavily damaged.';
      } else {
        text += '\nIt is broken beyond use.';
      }
    }

    if (this.weight) {
      text += `\nIt weighs ${this.weight} lbs.`;
    }

    if (this.value) {
      text += `\nIt is worth approximately ${this.value} copper.`;
    }

    return text;
  }
};
