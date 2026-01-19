// Simple esbuild bundler for the refactor
const esbuild = require('esbuild');

const args = process.argv.slice(2);
const watch = args.includes('--watch');

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  sourcemap: true,
  minify: false,
  platform: 'browser',
  format: 'iife',
  globalName: 'SegundasViasBundle',
  outfile: 'dist/app.bundle.js'
};

if (watch) {
  esbuild.build({ ...options, watch: { onRebuild(error, result) { if (error) console.error('Build failed:', error); else console.log('Build succeeded'); } } }).then(() => console.log('Watching...')).catch(() => process.exit(1));
} else {
  esbuild.build(options).then(() => console.log('Build written to dist/app.bundle.js')).catch((e) => { console.error(e); process.exit(1); });
}
