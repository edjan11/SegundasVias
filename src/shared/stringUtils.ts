// Helpers for string sanitization and normalization

export type SanitizeNameOptions = {
  trimEdges?: boolean;
  collapseSpaces?: boolean;
};

/**
 * Sanitize a name for display purposes: allow letters (including accented), apostrophe,
 * hyphen and spaces. Remove other characters.
 */
export function sanitizeNameForDisplay(
  value: string,
  options: SanitizeNameOptions = {},
): string {
  if (!value) return '';
  const { trimEdges = true, collapseSpaces = true } = options;
  // Use Unicode property \p{L} to match any kind of letter from any language
  // 'u' flag is required for Unicode properties
  let out = String(value).replace(/[^\p{L}'\- ]/gu, '');
  if (collapseSpaces) out = out.replace(/\s+/g, ' ');
  if (trimEdges) out = out.trim();
  return out;
}
