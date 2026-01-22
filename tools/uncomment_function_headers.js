const fs = require('fs');
const path = require('path');

const root = path.resolve('c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src');

function fixFile(full) {
  let s = fs.readFileSync(full, 'utf8');
  const orig = s;

  // uncomment lines that were commented as '// function name(' when body remains
  s = s.replace(/\/\/\s*function\s+([A-Za-z_$][\w$]*)\s*\(/g, 'function $1(');

  if (s !== orig) {
    fs.writeFileSync(full, s, 'utf8');
    console.log('uncommented function headers in', path.relative(root, full));
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js')) fixFile(full);
  }
}

walk(root);
console.log('done');
