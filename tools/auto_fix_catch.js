const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exts = new Set(['.js', '.ts', '.jsx', '.tsx']);

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'ui/js') continue;
      walk(full, cb);
    } else if (e.isFile()) {
      if (exts.has(path.extname(e.name))) cb(full);
    }
  }
}

let changedFiles = 0;
walk(root, (file) => {
  try {
    const s = fs.readFileSync(file, 'utf8');
    // replace catch without param (avoid touching catch(...))
    const newS = s.replace(/catch(?!\s*\()\s*\{/g, 'catch (e) { void e;');
    if (newS !== s) {
      fs.writeFileSync(file, newS, 'utf8');
      console.log('fixed:', path.relative(root, file));
      changedFiles++;
    }
  } catch (err) {
    console.error('err', file, err && err.message);
  }
});
console.log('done. files changed:', changedFiles);
