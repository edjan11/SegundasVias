import { CertidaoInput, CertidaoTipo } from './domain';
import { normalizeWhitespace } from './normalizer';

export type ValidationError = {
  code: string;
  fieldPath: string;
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: ValidationError[];
};

// Pure validator boundary; can be exposed via HTTP in the future.
export function validateInput(input: CertidaoInput): ValidationResult {
  const errors: ValidationError[] = [];
  const tipo = String(input?.certidao?.tipo_registro || '').trim().toLowerCase();
  const tipoOk = tipo === 'casamento' || tipo === 'nascimento' || tipo === 'obito';
  if (!tipoOk) {
    errors.push({
      code: 'CERTIDAO_TIPO_INVALIDO',
      fieldPath: 'certidao.tipo_registro',
      message: 'Tipo de registro invalido.',
    });
  }
  if (!input?.registro) {
    errors.push({
      code: 'REGISTRO_VAZIO',
      fieldPath: 'registro',
      message: 'Registro obrigatorio.',
    });
  }
  if (tipo === 'casamento') {
    const conj = input?.registro?.conjuges;
    if (!Array.isArray(conj) || conj.length < 2) {
      errors.push({
        code: 'CONJUGES_INVALIDO',
        fieldPath: 'registro.conjuges',
        message: 'Conjuges obrigatorios.',
      });
    }
  }
  if (tipo === 'nascimento') {
    const nome = normalizeWhitespace(input?.registro?.nome_completo || '');
    if (!nome) {
      errors.push({
        code: 'REGISTRADO_NOME',
        fieldPath: 'registro.nome_completo',
        message: 'Nome do registrado obrigatorio.',
      });
    }
  }
  return { ok: errors.length === 0, errors };
}

export function getTipo(input: CertidaoInput): CertidaoTipo {
  const tipo = String(input?.certidao?.tipo_registro || '').trim().toLowerCase();
  if (tipo === 'nascimento' || tipo === 'casamento' || tipo === 'obito') return tipo;
  return 'nascimento';
}
