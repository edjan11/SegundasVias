/**
 * Sistema de Selo - Ponto de Entrada Principal
 * 
 * Exporta apenas a API pública do módulo.
 * Mantém validadores, storage e tipos como implementação interna.
 */

// API pública
export {
  createSelo,
  updateSelo,
  removeSelo,
  getSelosByAto,
  getSeloByMatricula,
  validateSeloNumero,
  getSeloConfigForAto,
  saveSeloConfigForAto,
  associateSeloToMatricula
} from './api';

// Tipos públicos
export type {
  Selo,
  SeloValidationResult,
  SeloConfig,
  SeloState
} from './types';
