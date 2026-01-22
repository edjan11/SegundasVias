// Helpers for string sanitization and normalization

/**
 * Sanitize a name for display purposes: allow letters (including accented), apostrophe,
 * hyphen and spaces. Remove other characters.
 */
export function sanitizeNameForDisplay(value: string): string {
  if (!value) return '';
  // Use Unicode property \p{L} to match any kind of letter from any language
  // 'u' flag is required for Unicode properties
  return String(value).replace(/[^\p{L}'\- ]/gu, '').replace(/\s+/g, ' ').trim();
}
