import { CertidaoInput, NormalizedCertidao } from '../core/domain';
import { digitsOnly, normalizeUpper, normalizeWhitespace } from '../core/normalizer';
import { getTipo } from '../core/validators';

// Pure normalization boundary; can be exposed via HTTP in the future.
export function normalizeInput(input: CertidaoInput): NormalizedCertidao {
  const tipo = getTipo(input);
  const now = new Date().toISOString();
  const id = `${tipo}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const certidao = {
    cartorio_cns: digitsOnly(input?.certidao?.cartorio_cns || '').slice(0, 6),
    tipo_registro: tipo,
  };
  const registro = { ...(input?.registro || {}) };

  if (tipo === 'casamento' && Array.isArray(registro.conjuges)) {
    registro.conjuges = registro.conjuges.map((c: any) => ({
      ...c,
      nome_atual_habilitacao: normalizeWhitespace(c.nome_atual_habilitacao || ''),
      municipio_naturalidade: normalizeUpper(c.municipio_naturalidade || ''),
      uf_naturalidade: normalizeUpper(c.uf_naturalidade || ''),
      genitores: normalizeWhitespace(c.genitores || ''),
    }));
  }

  if (tipo === 'nascimento') {
    registro.nome_completo = normalizeWhitespace(registro.nome_completo || '');
    registro.municipio_nascimento = normalizeUpper(registro.municipio_nascimento || '');
    registro.uf_nascimento = normalizeUpper(registro.uf_nascimento || '');
    registro.local_nascimento = normalizeWhitespace(registro.local_nascimento || '');
  }

  return {
    id,
    tipo,
    createdAt: now,
    certidao,
    registro,
  };
}
