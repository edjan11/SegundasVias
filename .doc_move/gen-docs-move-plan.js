const fs = require('fs');
const path = require('path');
const inFile = path.join(__dirname, 'md-files-report.txt');
const outFile = path.join(__dirname, 'docs-move-plan.json');
const { execSync } = require('child_process');
let files;
try {
  files = execSync("git ls-files", { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean).filter(f => f.toLowerCase().endsWith('.md'));
} catch (e) {
  console.error('git ls-files failed', e);
  process.exit(1);
}
const items = [];
for (const file of files) {
  if (file.startsWith('.github/')) continue;
  if (file.startsWith('docs/')) continue; // leave docs/ files alone
  let lastCommit = null;
  let obsolete = false;
  try {
    const epoch = execSync(`git log -1 --format=%ct -- "${file.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
    if (epoch) {
      const d = new Date(Number(epoch) * 1000);
      lastCommit = d.toISOString();
      obsolete = (Date.now() - d.getTime()) > (2 * 365 * 24 * 60 * 60 * 1000);
    }
  } catch (e) {
    // no commits or error
    lastCommit = null;
    obsolete = false;
  }
  const dest = file.split('/').join('/');
  items.push({ path: file, lastCommit, dest: `docs/${dest}`, obsolete });
}
fs.writeFileSync(outFile, JSON.stringify(items, null, 2), 'utf8');
console.log('Wrote', outFile, 'with', items.length, 'entries');
