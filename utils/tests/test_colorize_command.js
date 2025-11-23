/**
 * Test the colorize command functionality
 */

const colorization = require('./src/systems/colorization');

console.log('\n=== Testing Keyword Colorization Command ===\n');

// Simulate adding keywords (what the command does)
console.log('1. Adding keyword "magic" with color "bright_magenta"');
colorization.addGlobalKeyword('magic', 'bright_magenta');

console.log('2. Adding keyword "treasure" with color "bright_yellow"');
colorization.addGlobalKeyword('treasure', 'bright_yellow');

console.log('3. Adding keyword "danger" with color "bright_red"');
colorization.addGlobalKeyword('danger', 'bright_red');

// Test the colorization
console.log('\n--- Testing colorization ---\n');

const testText = "The magic treasure room contains danger and warm fires.";
console.log('Original text:');
console.log(testText);

console.log('\nColorized text:');
const colorized = colorization.processText(testText, 'global');
console.log(colorized);

// Show what keywords are active
console.log('\n--- Active Keywords ---');
const keywords = colorization.GLOBAL_KEYWORDS;
console.log(`Total keywords: ${Object.keys(keywords).length}`);
for (const [word, color] of Object.entries(keywords)) {
  console.log(`  "${word}" → ${color}`);
}

console.log('\n');
