const fs = require('fs');
const path = require('path');
const mapping = require('./docs-move-plan.json');
const mapByOld = new Map(mapping.map(i => [path.normalize(i.path), i]));
const updated = [];

function getAllMdFiles() {
  const { execSync } = require('child_process');
  const out = execSync('git ls-files', { encoding: 'utf8' });
  return out.split(/\r?\n/).filter(Boolean).filter(f => f.toLowerCase().endsWith('.md'));
}

function makeRel(from, to) {
  const rel = path.relative(path.dirname(from), to).split(path.sep).join('/');
  return rel === '' ? path.basename(to) : rel;
}

const files = getAllMdFiles();
for (const file of files) {
  if (file.startsWith('.github/')) continue; // do not touch .github
  const abs = path.resolve(file);
  let content = fs.readFileSync(abs, 'utf8');
  let modified = false;

  // regex for markdown links: [text](target)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  content = content.replace(linkRegex, (m, text, target) => {
    if (/^(?:https?:)?\/\//.test(target) || target.startsWith('#')) return m; // skip external or anchors
    // remove title part if present: target "title"
    const targetOnly = target.split(/\s+"/)[0];
    // resolve potential fragment
    const frag = targetOnly.includes('#') ? targetOnly.substring(targetOnly.indexOf('#')) : '';
    const targetPath = targetOnly.replace(/#.*$/, '');

    // resolve absolute path of target relative to this file
    const resolved = path.resolve(path.dirname(abs), targetPath || '.');
    // compute project-relative path
    let projRel = path.relative(process.cwd(), resolved).split(path.sep).join('/');

    // try exact match with mapping old path
    if (mapByOld.has(projRel)) {
      const entry = mapByOld.get(projRel);
      const newRel = makeRel(file, path.resolve(entry.dest));
      modified = true;
      updated.push({ file, from: target, to: `${newRel}${frag}` });
      return `[${text}](${`${newRel}${frag}`})`;
    }

    // also try matching only basename
    const base = path.basename(projRel);
    for (const [old, entry] of mapByOld.entries()) {
      if (path.basename(old) === base) {
        const newRel = makeRel(file, path.resolve(entry.dest));
        modified = true;
        updated.push({ file, from: target, to: `${newRel}${frag}` });
        return `[${text}](${`${newRel}${frag}`})`;
      }
    }

    return m; // unchanged
  });

  if (modified) {
    fs.writeFileSync(abs, content, 'utf8');
  }
}

fs.writeFileSync('.doc_move/link-updates.log', JSON.stringify(updated, null, 2), 'utf8');
console.log('Link update completed. Changes logged to .doc_move/link-updates.log');
