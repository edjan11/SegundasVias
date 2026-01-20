export function escapeHtml(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function sanitizeHref(href: string | undefined, fallback: string) {
  if (!href) return fallback;
  const trimmed = href.trim();
  if (/^\s*(javascript|data):/i.test(trimmed)) return fallback;
  return escapeHtml(trimmed);
}
