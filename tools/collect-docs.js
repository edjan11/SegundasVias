#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'raw');
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'docs', '.vscode', 'tmp', 'archive', 'logs-2026-01-20']);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    const rel = path.relative(ROOT, entryPath);
    const parts = rel.split(path.sep);
    if (parts.some(p => IGNORE_DIRS.has(p))) continue;

    if (entry.isDirectory()) {
      await walk(entryPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const dest = path.join(OUT, rel);
      await ensureDir(path.dirname(dest));
      await fs.copyFile(entryPath, dest);
      console.log(`Copied: ${rel}`);
    }
  }
}

async function buildIndex() {
  const files = [];
  async function collect(dir) {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await collect(p);
      else if (e.isFile() && e.name.endsWith('.md')) files.push(path.relative(OUT, p).replace(/\\/g, '/'));
    }
  }
  await collect(OUT);
  const indexPath = path.join(ROOT, 'docs', 'index.md');
  const content = ['# Documentação coletada', '', 'Arquivos coletados automaticamente com `tools/collect-docs.js`', '', '## Lista de arquivos', ''];
  for (const f of files.sort()) content.push(`- [${f}](./raw/${encodeURI(f)})`);
  await fs.writeFile(indexPath, content.join('\n'));
  console.log(`Index written: docs/index.md (${files.length} files)`);
}

async function main(){
  console.log('Collecting .md files into docs/raw ...');
  await ensureDir(OUT);
  await walk(ROOT);
  await buildIndex();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
