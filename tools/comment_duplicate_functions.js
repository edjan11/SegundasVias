const fs = require('fs');
const path = require('path');

const root = path.resolve('c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src');

function processFile(full) {
  let s = fs.readFileSync(full, 'utf8');
  const names = {};
  const funcRe = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = funcRe.exec(s))) {
    const name = m[1];
    if (!names[name]) names[name] = [];
    names[name].push(m.index);
  }
  let changed = false;
  for (const [name, arr] of Object.entries(names)) {
    if (arr.length > 1) {
      // comment out occurrences after the first
      for (let i = 1; i < arr.length; i++) {
        const idx = arr[i];
        // replace 'function name(' with '// function name(' at that index
        s = s.slice(0, idx) + s.slice(idx).replace(new RegExp('function\\s+' + name + '\\s*\\('), '// function ' + name + '(');
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(full, s, 'utf8');
    console.log('commented duplicates in', path.relative(root, full));
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js')) processFile(full);
  }
}

walk(root);
console.log('done');
