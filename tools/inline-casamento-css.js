const fs = require('fs');
const path = require('path');
(async function(){
  const outHtml = path.join(__dirname, '..', 'out', 'casamento-sample.html');
  // Try multiple candidate locations for the CSS (repo-root public or project public)
  const candidates = [
    path.join(__dirname, '..', 'public', 'assets', 'pdfElementsCasamento', 'pdf-casamento.css'),
    path.join(__dirname, '..', '..', 'public', 'assets', 'pdfElementsCasamento', 'pdf-casamento.css'),
  ];

  if (!fs.existsSync(outHtml)) { console.error('Sample HTML not found:', outHtml); process.exit(1); }

  let cssPath = null;
  for (const c of candidates) if (fs.existsSync(c)) { cssPath = c; break; }
  if (!cssPath) {
    console.error('CSS not found in any candidate location:', candidates.join(' | '));
    process.exit(1);
  }

  const html = fs.readFileSync(outHtml, 'utf-8');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Replace the first occurrence of the link to CSS with an inline style tag
  let newHtml = html;
  const linkRegex = /<link[^>]*href=["'][^"']*pdf-casamento\.css["'][^>]*>/i;
  if (linkRegex.test(html)) {
    newHtml = html.replace(linkRegex, `<style>\n${css}\n</style>`);
  } else {
    // fallback: insert <style> before </head>
    newHtml = html.replace(/<\/head>/i, `<style>\n${css}\n</style>\n</head>`);
  }

  const outPath = path.join(__dirname, '..', 'out', 'casamento-sample-inline.html');
  fs.writeFileSync(outPath, newHtml, 'utf-8');
  console.log('Wrote inlined sample to', outPath);
})();