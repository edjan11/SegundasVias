const fs = require('fs');
const p = 'c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src/acts/obito/obito.ts';
let s = fs.readFileSync(p, 'utf8');
if (!/function\s+updateActionButtons\s*\(/.test(s)) {
  const stub = `\n// auto-inserted stub to forward to updateTipoButtons when present\nfunction updateActionButtons() {\n  if (typeof (globalThis as any).updateTipoButtons === 'function') {\n    try { return (globalThis as any).updateTipoButtons(); } catch (e) { /* ignore */ }\n  }\n}\n\n`;
  // insert near top after first imports or at file start
  const insertAt = s.search(/\n/)+1;
  s = stub + s;
  fs.writeFileSync(p, s, 'utf8');
  console.log('inserted updateActionButtons stub');
} else console.log('updateActionButtons already present');
