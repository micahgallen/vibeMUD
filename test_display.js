/**
 * Test script for display utilities
 * Verifies that display functions work correctly with capnames
 */

const display = require('./src/utils/display');
const { stripColors, parseColorTags } = require('./src/core/colors');

console.log('=== Testing Display Utilities ===\n');

// Create test player with capname
const testPlayer = {
  id: 'testplayer',
  type: 'player',
  name: 'Testplayer',
  capname: '\x1b[31mT\x1b[1mE\x1b[0m\x1b[33mS\x1b[1mT\x1b[32mP\x1b[0m\x1b[32mL\x1b[36m\x1b[1mA\x1b[0m\x1b[36mY\x1b[34m\x1b[1mE\x1b[0m\x1b[34mR\x1b[0m'
};

// Create test player without capname
const plainPlayer = {
  id: 'plainplayer',
  type: 'player',
  name: 'Bob'
};

// Test 1: getDisplayName
console.log('Test 1: getDisplayName()');
console.log('  With capname:', display.getDisplayName(testPlayer));
console.log('  Without capname:', display.getDisplayName(plainPlayer));
console.log('  Expected: Colored TESTPLAYER vs plain Bob');
console.log('');

// Test 2: getPlainName
console.log('Test 2: getPlainName()');
console.log('  With capname:', display.getPlainName(testPlayer));
console.log('  Without capname:', display.getPlainName(plainPlayer));
console.log('  Expected: "Testplayer" and "Bob" (no colors)');
console.log('');

// Test 3: getSearchName
console.log('Test 3: getSearchName()');
console.log('  With capname:', display.getSearchName(testPlayer));
console.log('  Without capname:', display.getSearchName(plainPlayer));
console.log('  Expected: "testplayer" and "bob" (lowercase, no colors)');
console.log('');

// Test 4: matchesName
console.log('Test 4: matchesName()');
console.log('  matchesName("test", testPlayer):', display.matchesName('test', testPlayer));
console.log('  matchesName("Test", testPlayer):', display.matchesName('Test', testPlayer));
console.log('  matchesName("testplayer", testPlayer):', display.matchesName('testplayer', testPlayer));
console.log('  matchesName("bob", testPlayer):', display.matchesName('bob', testPlayer));
console.log('  matchesName("bo", plainPlayer):', display.matchesName('bo', plainPlayer));
console.log('  Expected: true, true, true, false, true');
console.log('');

// Test 5: ensureReset
console.log('Test 5: ensureReset()');
const coloredText = '\x1b[31mRed Text';
const resetText = '\x1b[31mRed Text\x1b[0m';
console.log('  Without reset:', JSON.stringify(display.ensureReset(coloredText)));
console.log('  With reset:', JSON.stringify(display.ensureReset(resetText)));
console.log('  Expected: Both should end with \\x1b[0m');
console.log('');

// Test 6: stripColors
console.log('Test 6: stripColors()');
const capnameDisplay = display.getDisplayName(testPlayer);
console.log('  Colored:', capnameDisplay);
console.log('  Stripped:', display.stripColors(capnameDisplay));
console.log('  Expected: "Testplayer" (plain text)');
console.log('');

// Test 7: visibleLength
console.log('Test 7: visibleLength()');
console.log('  Colored text length:', display.visibleLength(capnameDisplay));
console.log('  Plain text length:', display.visibleLength('Testplayer'));
console.log('  Expected: Both should be 10');
console.log('');

// Test 8: Display in context (simulating say command)
console.log('Test 8: Simulating say command output');
const speakerName = display.getDisplayName(testPlayer);
const message = `${speakerName} says, 'Hello everyone!'`;
console.log('  ', message);
console.log('  Expected: Colored TESTPLAYER in the message');
console.log('');

console.log('=== All Tests Complete ===');
