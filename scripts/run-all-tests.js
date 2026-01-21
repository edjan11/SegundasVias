const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '../tests');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
for (const f of files) {
  console.log('\n---- Running', f, '----');
  try {
    require(path.join(dir, f));
  } catch (err) {
    console.error('Test', f, 'failed with error:');
    console.error(err);
    process.exitCode = 1;
  }
}
console.log('\nAll tests executed.');
