#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '.github');
const THRESHOLD_LINES = Number(process.env.CONTEXT_MAX_LINES) || 300;
const THRESHOLD_BYTES = Number(process.env.CONTEXT_MAX_BYTES) || 32 * 1024; // 32 KB

function checkFile(file) {
  const p = path.join(DIR, file);
  if (!fs.existsSync(p)) return null;
  const content = fs.readFileSync(p, 'utf8');
  const lines = content.split(/\r?\n/).length;
  const bytes = Buffer.byteLength(content, 'utf8');
  return { file, lines, bytes };
}

const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().includes('context') && f.endsWith('.md'));

let failures = [];
console.log('check_context_size: scanning', files.length, 'context files');
files.forEach((f) => {
  const res = checkFile(f);
  if (!res) return;
  const tooBig = res.lines > THRESHOLD_LINES || res.bytes > THRESHOLD_BYTES;
  console.log(`- ${f}: ${res.lines} lines, ${res.bytes} bytes${tooBig ? '  <-- exceeds threshold' : ''}`);
  if (tooBig) failures.push(res);
});

if (failures.length > 0) {
  console.error('\nContext size check FAILED:');
  failures.forEach((r) => {
    console.error(`  - ${r.file}: ${r.lines} lines / ${r.bytes} bytes`);
  });
  console.error('\nSuggestions:');
  console.error(' - Split the context into focused fragments (e.g. FRONTEND-CARTORIO-UI.md, FRONTEND-CARTORIO-TESTS.md) and keep an overview index.');
  console.error(' - Archive outdated content into .github/archive/ and reference it from the index.');
  console.error('\nRun `npm run check:context` locally to reproduce this check.');
  process.exit(2);
}

console.log('check_context_size: ok');
process.exit(0);
