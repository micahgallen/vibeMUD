/**
 * Quick test for keyword colorization
 */

const colorization = require('./src/systems/colorization');

// Test text with global keywords
const text1 = "The warm fire crackles. A cold wind blows through the door.";
console.log("\nOriginal text:");
console.log(text1);

console.log("\nWith global keyword colorization:");
const colored1 = colorization.processText(text1, 'global');
console.log(colored1);

// Test with room description context (includes both global and context keywords)
const text2 = "A warm room with a wooden door and a treasure chest. The cold air seeps in.";
console.log("\n\nRoom description:");
console.log(text2);

console.log("\nWith room_description context colorization:");
const colored2 = colorization.processText(text2, 'room_description');
console.log(colored2);

console.log("\n");
