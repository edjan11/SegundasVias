/**
 * Sistema de Selo - API Boundary
 * 
 * Interface pública do módulo de selo.
 * Este é o único ponto de entrada que outros módulos devem usar.
 */

import type { Selo, SeloValidationResult, SeloConfig } from './types';
import * as storage from './storage';
import * as validators from './validators';

/**
 * Cria um novo selo
 */
export async function createSelo(
  seloData: Omit<Selo, 'id' | 'dataAplicacao'>
): Promise<{ success: boolean; selo?: Selo; errors?: string[] }> {
  // Gera ID único
  const id = `selo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Normaliza o número
  const numero = validators.normalizeSeloNumero(seloData.numero);
  
  // Cria o selo completo
  const selo: Selo = {
    ...seloData,
    id,
    numero,
    dataAplicacao: new Date()
  };

  // Valida
  const validation = validators.validateSelo(selo);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // Verifica duplicação
  const existing = await storage.getSeloByNumero(numero);
  if (existing) {
    return { success: false, errors: ['Este número de selo já está em uso'] };
  }

  // Salva
  await storage.saveSelo(selo);
  
  return { success: true, selo };
}

/**
 * Atualiza um selo existente
 */
export async function updateSelo(
  id: string,
  updates: Partial<Omit<Selo, 'id' | 'dataAplicacao'>>
): Promise<{ success: boolean; selo?: Selo; errors?: string[] }> {
  // Busca o selo existente
  const existing = await storage.getSeloById(id);
  if (!existing) {
    return { success: false, errors: ['Selo não encontrado'] };
  }

  // Aplica updates
  const updated: Selo = { ...existing, ...updates };
  
  // Normaliza número se foi alterado
  if (updates.numero) {
    updated.numero = validators.normalizeSeloNumero(updates.numero);
  }

  // Valida
  const validation = validators.validateSelo(updated);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // Verifica duplicação (excluindo o próprio selo)
  if (updates.numero) {
    const allSelos = await storage.getAllSelos();
    const isUnique = validators.isSeloNumeroUnique(
      updated.numero,
      allSelos,
      id
    );
    if (!isUnique) {
      return { success: false, errors: ['Este número de selo já está em uso'] };
    }
  }

  // Salva
  await storage.saveSelo(updated);
  
  return { success: true, selo: updated };
}

/**
 * Remove um selo
 */
export async function removeSelo(id: string): Promise<{ success: boolean }> {
  await storage.deleteSelo(id);
  return { success: true };
}

/**
 * Busca selos por ato
 */
export async function getSelosByAto(
  ato: 'nascimento' | 'casamento' | 'obito'
): Promise<Selo[]> {
  return storage.getSelosByAto(ato);
}

/**
 * Busca selo por matrícula da certidão
 */
export async function getSeloByMatricula(
  matricula: string
): Promise<Selo | undefined> {
  const allSelos = await storage.getAllSelos();
  return allSelos.find(s => s.matricula === matricula);
}

/**
 * Valida um número de selo
 */
export function validateSeloNumero(numero: string): SeloValidationResult {
  return validators.validateSeloNumero(numero);
}

/**
 * Busca configuração de selo para um ato
 */
export async function getSeloConfigForAto(
  ato: string
): Promise<SeloConfig> {
  const config = await storage.getSeloConfig(ato);
  
  // Configuração padrão se não existir
  return config || {
    enabled: true,
    required: false
  };
}

/**
 * Salva configuração de selo para um ato
 */
export async function saveSeloConfigForAto(
  ato: string,
  config: SeloConfig
): Promise<void> {
  await storage.saveSeloConfig(ato, config);
}

/**
 * Associa um selo a uma matrícula
 */
export async function associateSeloToMatricula(
  seloId: string,
  matricula: string
): Promise<{ success: boolean; errors?: string[] }> {
  const selo = await storage.getSeloById(seloId);
  
  if (!selo) {
    return { success: false, errors: ['Selo não encontrado'] };
  }

  // Atualiza com a matrícula
  return updateSelo(seloId, { matricula });
}
