const fs = require('fs');
const assert = require('assert');

try {
  const data = fs.readFileSync('config.example.json', 'utf8');
  assert.doesNotThrow(() => JSON.parse(data), 'config.example.json contains invalid JSON');
  console.log('config.example.json is valid JSON');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
