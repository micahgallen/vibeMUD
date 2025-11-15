
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const jsonFiles = glob.sync('src/**/*.json', { cwd: process.cwd() });

let errorFound = false;

for (const filePath of jsonFiles) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    JSON.parse(data);
  } catch (error) {
    console.error(`Error parsing JSON file: ${filePath}`);
    console.error(error);
    errorFound = true;
  }
}

if (!errorFound) {
  console.log('All JSON files are valid.');
}
