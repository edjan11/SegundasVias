const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exts = ['.ts', '.js', '.tsx', '.jsx'];

function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'ui/js'].includes(e.name)) continue;
      walk(full, cb);
    } else if (exts.includes(path.extname(e.name))) cb(full);
  }
}

let changed = 0;
walk(root, (file) => {
  try {
    let s = fs.readFileSync(file, 'utf8');
    const orig = s;
    // replace patterns like `) { /* empty */ }` or `) {\n}` with a short comment
    s = s.replace(/\)\s*\{\s*\}/g, ') { /* empty */ }');
    s = s.replace(/\)\s*\{\s*\n\s*\}/g, ') { /* empty */ }');
    if (s !== orig) {
      fs.writeFileSync(file, s, 'utf8');
      console.log('fixed empty block in', path.relative(root, file));
      changed++;
    }
  } catch (err) {
    // ignore
  }
});
console.log('done. files changed:', changed);
