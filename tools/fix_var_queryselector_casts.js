const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');

function fixFile(full) {
  let src = fs.readFileSync(full, 'utf8');
  const orig = src;

  src = src.replace(/\b([A-Za-z_$][\w$]*)\.querySelector/g, (m, id, offset) => {
    if (id === 'document' || id === 'window') return m;
    // avoid double-casting if already has 'as' shortly before
    const before = src.slice(Math.max(0, offset - 40), offset);
    if (/as\s+HTML/.test(before)) return m;
    return `(${id} as HTMLElement).querySelector`;
  });

  if (src !== orig) {
    fs.writeFileSync(full, src, 'utf8');
    console.log('fixed var.querySelector casts in', path.relative(root, full));
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js')) {
      try { fixFile(full); } catch (err) { console.error('err', full, err.message); }
    }
  }
}

if (fs.existsSync(root)) walk(root);
console.log('done');
