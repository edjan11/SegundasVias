export function escapeHtml(s: unknown) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function sanitizeHref(href: string | undefined, fallback: string) {
  if (!href) return fallback;
  const trimmed = href.trim();
  if (/^\s*(javascript|data):/i.test(trimmed)) return fallback;
  return escapeHtml(trimmed);
}

export function sanitizeCss(css: string | undefined): string {
  if (!css) return '';
  let s = String(css);
  // Remove dangerous url(...) usages that reference javascript: or data:
  s = s.replace(/url\(([^)]*)\)/gi, (m, p1) => {
    if (/javascript\s*:|data\s*:/i.test(p1 || '')) return 'url("")';
    return m;
  });
  // Remove all @import rules (external resources may be unsafe)
  s = s.replace(/@import[^;]*;?/gi, '');
  // Remove leftover javascript: patterns
  s = s.replace(/javascript\s*:/gi, '');
  return s;
}
