const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Prefer using src/tailwind.css (includes Tailwind directives); fallback to src/ui.css if not present
const input = fs.existsSync(path.join(process.cwd(), 'src', 'tailwind.css'))
  ? path.join(process.cwd(), 'src', 'tailwind.css')
  : path.join(process.cwd(), 'src', 'ui.css');
const outDir = path.join(process.cwd(), 'ui', 'css');
const outFile = path.join(outDir, 'tailwind.css');
const args = process.argv.slice(2);
const isWatch = args.includes('--watch');

if (!fs.existsSync(input)) {
  console.error('Input CSS not found:', input);
  process.exit(1);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Try to run the tailwindcss CLI if present
const tailwindBin = path.join(process.cwd(), 'node_modules', '.bin', 'tailwindcss');
if (fs.existsSync(tailwindBin)) {
  const twArgs = ['-i', input, '-o', outFile];
  if (!isWatch) twArgs.push('--minify');
  if (isWatch) twArgs.push('--watch');
  console.log('Running tailwindcss CLI:', tailwindBin, twArgs.join(' '));
  const res = spawnSync(tailwindBin, twArgs, { stdio: 'inherit' });
  process.exit(res.status || 0);
}

// Fallback: copy input to output (no Tailwind processing)
console.warn('tailwindcss CLI not found. Falling back to copying input CSS to', outFile);
try {
  fs.copyFileSync(input, outFile);
  console.log('Copied CSS to', outFile);
  if (isWatch) {
    console.log('Watch mode requested, but no watcher implemented in fallback. Exiting.');
  }
  process.exit(0);
} catch (e) {
  console.error('Failed to write output CSS:', e);
  process.exit(1);
}
