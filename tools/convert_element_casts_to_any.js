const fs = require('fs');
const path = require('path');

const root = path.resolve('c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src');

function fixFile(full) {
  let s = fs.readFileSync(full, 'utf8');
  const orig = s;

  s = s.replace(/\(\s*([^\)]+)\s+as\s+HTMLElement\s*\)\.(querySelector(All)?)/g, '($1 as any).$2');
  s = s.replace(/\(\s*([^\)]+)\s+as\s+HTMLElement\s*\)\.(innerHTML|outerHTML|getAttribute|remove)\b/g, '($1 as any).$2');

  if (s !== orig) {
    fs.writeFileSync(full, s, 'utf8');
    console.log('converted HTMLElement casts to any in', path.relative(root, full));
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
