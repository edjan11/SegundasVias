// Validação e normalização de nomes

export function normalizeName(raw) {
  return String(raw || "").replace(/\s+/g, " ").trim();
}

export function isValidName(name) {
  // Nome deve ter pelo menos 2 palavras e cada uma com pelo menos 2 letras
  const n = normalizeName(name);
  const parts = n.split(" ").filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every(p => p.length >= 2 && /^[A-Za-zÀ-ÿ'\- ]+$/.test(p));
}
