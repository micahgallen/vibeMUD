/**
 * Test script for word templates system
 * Tests case preservation, template application, and edge cases
 */

const colorization = require('./src/systems/colorization');
const { stripColors, parseColorTags } = require('./src/core/colors');

console.log('=== Word Templates Test Suite ===\n');

// Test 1: Add templates
console.log('Test 1: Adding word templates');
colorization.addWordTemplate('fire', '<red>f<yellow>i<red>r<yellow>e</>');
colorization.addWordTemplate('ice', '<cyan>i<bright_cyan>c<cyan>e</>');
colorization.addWordTemplate('magic', '<magenta>m<bright_magenta>a<magenta>g<bright_magenta>i<magenta>c</>');
console.log('Added 3 templates: fire, ice, magic\n');

// Test 2: Case preservation - lowercase
console.log('Test 2: Case preservation - lowercase');
const tests = [
  "The fire burns bright",
  "Fire is dangerous",
  "FIRE ALARM!",
  "Ice and fire together",
  "The icy fire glows",
  "MAGIC FIRE AND ICE"
];

tests.forEach(text => {
  const processed = colorization.processGlobalTemplates(text);
  // Parse color tags to ANSI for display
  const withAnsi = parseColorTags(processed);
  const plainProcessed = stripColors(processed);

  console.log('Original: ', text);
  console.log('Processed:', withAnsi);
  console.log('Plain:    ', plainProcessed);
  console.log('');
});

// Test 3: Case transformation verification
console.log('\nTest 3: Case transformation accuracy');
const caseTests = [
  { word: 'fire', expected: 'fire' },
  { word: 'Fire', expected: 'Fire' },
  { word: 'FIRE', expected: 'FIRE' },
  { word: 'ice', expected: 'ice' },
  { word: 'Ice', expected: 'Ice' },
  { word: 'ICE', expected: 'ICE' }
];

caseTests.forEach(({ word, expected }) => {
  const processed = colorization.processGlobalTemplates(word);
  // Parse the tags to ANSI, then strip to get final plain text
  const withAnsi = parseColorTags(processed);
  const plain = stripColors(withAnsi);
  const match = plain === expected ? '✓' : '✗';
  console.log(`${match} ${word} -> ${plain} (expected: ${expected})`);
});

// Test 4: Protected regions (should not replace inside color tags)
console.log('\nTest 4: Protected regions');
const protectedTests = [
  'The <red>fire</red> burns',  // Should not replace fire inside tags
  'Say the word fire out loud'  // Should replace fire
];

protectedTests.forEach(text => {
  const processed = colorization.processGlobalTemplates(text);
  const plain = stripColors(processed);
  console.log('Original: ', text);
  console.log('Processed:', parseColorTags(processed));
  console.log('Plain:    ', plain);
  console.log('');
});

// Test 5: Edge cases
console.log('Test 5: Edge cases');
const edgeTests = [
  '',                    // Empty string
  'fire',                // Single word
  'fire fire fire',      // Multiple instances
  'fireplace',           // Word boundary test (should not match)
  'ice-cold',            // With hyphen
  'magic!',              // With punctuation
  'The firefighter has ice cream'  // Compound words
];

edgeTests.forEach(text => {
  const processed = colorization.processGlobalTemplates(text);
  const plain = stripColors(processed);
  console.log(`"${text}" -> "${plain}"`);
});

// Test 6: Template listing
console.log('\nTest 6: List all templates');
const allTemplates = colorization.getAllWordTemplates();
console.log('Templates:', allTemplates);

// Test 7: Remove template
console.log('\nTest 7: Remove template');
const removed = colorization.removeWordTemplate('ice');
console.log('Removed "ice":', removed);
const afterRemove = colorization.processGlobalTemplates('fire and ice');
console.log('After removal: "fire and ice" ->', stripColors(afterRemove));

console.log('\n=== Test Suite Complete ===');
