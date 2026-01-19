const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  'src/shared/validators/date.js',
  'src/shared/validators/date.ts',
  'ui/ts/shared/validators/date.ts',
  'ui/ts/shared/validators/date.js',
  'tools/replace_requires_fixed.js'
].map(p => path.join(root, p));

let changed = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  s = s.replace(/\\\//g, '/');
  s = s.replace(/\\\-/g, '-');
  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    console.log('fixed escapes in', path.relative(root, file));
    changed++;
  }
}
console.log('done. files changed:', changed);
