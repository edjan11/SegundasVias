(async () => {
  const mod = await import('../dist-src/prints/shared/print-utils.js');
  const { sanitizeHref, sanitizeCss } = mod;
  const assert = require('assert');

  console.log('Running print-utils tests...');

  // href
  assert.strictEqual(sanitizeHref('javascript:alert(1)', '../fallback.css'), '../fallback.css');
  assert.strictEqual(sanitizeHref('data:text/html,<script>alert(1)</script>', '../fallback.css'), '../fallback.css');
  const safe = sanitizeHref('https://example.com/style.css', '../fallback.css');
  assert.ok(safe.includes('https://example.com/style.css'));

  // css
  assert.strictEqual(sanitizeCss('body{color:red}'), 'body{color:red}');
  const out1 = sanitizeCss('@import url("javascript:alert(1)"); body{color:red}');
  assert.ok(!/@import/i.test(out1), 'Should remove @import rules');
  assert.ok(/body\{color:red\}/i.test(out1), 'Body rules should remain');

  const out2 = sanitizeCss('background-image: url("javascript:alert(1)")');
  assert.ok(/url\(\"\"\)/.test(out2), 'Dangerous url should be replaced with empty url()');
  assert.ok(!/javascript\s*:/i.test(out2), 'Should not include javascript:');

  console.log('All print-utils tests passed.');
})();