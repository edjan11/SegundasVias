const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');

function fixFile(full) {
  let src = fs.readFileSync(full, 'utf8');
  const orig = src;

  // Replace identifier.property where property is one of these DOM props
  src = src.replace(/\b([A-Za-z_$][\w$]*)\.(value|checked|disabled|style|type|returnValue)\b/g, (m, id, prop) => {
    if (id === 'document' || id === 'window' || id === 'JSON') return m;
    // avoid touching already cast expressions
    const before = src.slice(0, src.indexOf(m));
    if (before.endsWith('as any') || before.endsWith('as unknown') || before.includes(' as HTML')) return m;
    return `(${id} as any).${prop}`;
  });

  if (src !== orig) {
    fs.writeFileSync(full, src, 'utf8');
    console.log('applied property casts in', path.relative(root, full));
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
