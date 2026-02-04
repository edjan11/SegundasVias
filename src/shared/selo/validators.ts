/**
 * Sistema de Selo - Validadores
 * 
 * Validações específicas para números de selo.
 * Todas as regras de negócio relacionadas a validação ficam aqui.
 */

import type { Selo, SeloValidationResult, SeloConfig } from './types';

/**
 * Valida o formato básico de um número de selo
 */
export function validateSeloNumero(numero: string): SeloValidationResult {
  const errors: string[] = [];

  // Regra: Não pode ser vazio
  if (!numero || numero.trim() === '') {
    errors.push('Número do selo é obrigatório');
  }

  // Regra: Deve conter apenas alfanuméricos e hífens
  if (numero && !/^[A-Z0-9\-]+$/i.test(numero)) {
    errors.push('Número do selo deve conter apenas letras, números e hífens');
  }

  // Regra: Tamanho mínimo
  if (numero && numero.length < 4) {
    errors.push('Número do selo deve ter no mínimo 4 caracteres');
  }

  // Regra: Tamanho máximo
  if (numero && numero.length > 20) {
    errors.push('Número do selo deve ter no máximo 20 caracteres');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida um selo completo contra as configurações
 */
export function validateSelo(
  selo: Partial<Selo>,
  config?: SeloConfig
): SeloValidationResult {
  const errors: string[] = [];

  // Validação do número
  if (selo.numero) {
    const numeroValidation = validateSeloNumero(selo.numero);
    if (!numeroValidation.valid) {
      errors.push(...numeroValidation.errors);
    }
  } else {
    errors.push('Número do selo é obrigatório');
  }

  // Validação do tipo
  if (!selo.tipo) {
    errors.push('Tipo de selo é obrigatório');
  } else if (!['fiscal', 'cartorio'].includes(selo.tipo)) {
    errors.push('Tipo de selo inválido');
  }

  // Validação do ato
  if (!selo.ato) {
    errors.push('Ato é obrigatório');
  } else if (!['nascimento', 'casamento', 'obito'].includes(selo.ato)) {
    errors.push('Ato inválido');
  }

  // Validações específicas por configuração
  if (config && selo.numero) {
    // Verifica prefixo
    if (config.prefix && !selo.numero.startsWith(config.prefix)) {
      errors.push(`Selo deve começar com ${config.prefix}`);
    }

    // Verifica tamanho mínimo
    if (config.minLength && selo.numero.length < config.minLength) {
      errors.push(`Selo deve ter no mínimo ${config.minLength} caracteres`);
    }

    // Verifica tamanho máximo
    if (config.maxLength && selo.numero.length > config.maxLength) {
      errors.push(`Selo deve ter no máximo ${config.maxLength} caracteres`);
    }

    // Verifica obrigatoriedade
    if (config.required && !selo.numero) {
      errors.push('Selo é obrigatório para este ato');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Verifica duplicação de número de selo
 */
export function isSeloNumeroUnique(
  numero: string,
  existingSelos: Selo[],
  excludeId?: string
): boolean {
  return !existingSelos.some(
    s => s.numero === numero && s.id !== excludeId
  );
}

/**
 * Normaliza o número do selo (uppercase, sem espaços)
 */
export function normalizeSeloNumero(numero: string): string {
  return numero.trim().toUpperCase();
}
