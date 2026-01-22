const fs = require('fs');
const path = require('path');

const root = path.resolve('c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src');

function processFile(full) {
  let s = fs.readFileSync(full, 'utf8');
  const funcRe = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  const names = {};
  let m;
  const edits = [];
  while ((m = funcRe.exec(s))) {
    const name = m[1];
    if (!names[name]) names[name] = 0;
    names[name]++;
    if (names[name] > 1) {
      // rename this occurrence by replacing at the match index
      edits.push({ idx: m.index, name, count: names[name] });
    }
  }
  if (edits.length === 0) return;
  // apply edits from end to start to preserve indices
  for (let i = edits.length - 1; i >= 0; i--) {
    const e = edits[i];
    const before = s.slice(0, e.idx);
    const after = s.slice(e.idx);
    afterReplaced = after.replace(new RegExp('function\\s+' + e.name + '\\s*\\('), 'function ' + e.name + '__dup_' + e.count + '(');
    s = before + afterReplaced;
  }
  fs.writeFileSync(full, s, 'utf8');
  console.log('renamed later duplicate functions in', path.relative(root, full));
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
