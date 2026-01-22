const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      let s = fs.readFileSync(full, 'utf8');
      const orig = s;
      s = s.replace(/:\s*any(\b|\s)/g, ': unknown$1');
      s = s.replace(/\s+as\s+any\b/g, ' as unknown');
      if (s !== orig) {
        fs.writeFileSync(full, s, 'utf8');
        console.log('converted any->unknown:', path.relative(root, full));
      }
    }
  }
}

if (fs.existsSync(root)) walk(root);
console.log('done');
