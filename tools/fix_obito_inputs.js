const fs = require('fs');
const p = 'c:/Users/Usuario/Desktop/PROJETOS/segundas-vias/src/acts/obito/obito.ts';
let s = fs.readFileSync(p, 'utf8');
const orig = s;

s = s.replace(/document\.querySelector\((['"])input([^'"]*)\1\)/g, (m, q, rest) => {
  return `(document.querySelector(${q}input${rest}${q}) as HTMLInputElement | null)`;
});

s = s.replace(/document\.querySelector\((['"])select([^'"]*)\1\)/g, (m, q, rest) => {
  return `(document.querySelector(${q}select${rest}${q}) as HTMLSelectElement | null)`;
});

s = s.replace(/document\.querySelector\((['"])textarea([^'"]*)\1\)/g, (m, q, rest) => {
  return `(document.querySelector(${q}textarea${rest}${q}) as HTMLTextAreaElement | null)`;
});

if (s !== orig) {
  fs.writeFileSync(p, s, 'utf8');
  console.log('fixed obito input/select/textarea casts');
} else {
  console.log('no changes');
}
