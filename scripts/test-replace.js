const tpl = '<Genitores/>';
const gen = '<Genitores></Genitores>';
const re = new RegExp(`<Genitores(?=\\s|/|>)[^>]*>\\s*<\\/Genitores>`, 'g');
console.log('match?', re.test(gen));
const replaced = gen.replace(re, (m) => {
  const open = m.match(/(<Genitores[^>]*>)/);
  return open ? open[1].replace(/>\s*$/, '/>') : '<Genitores/>';
});
console.log('replaced', replaced);
