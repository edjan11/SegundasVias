/**
 * Sistema de Selos - Tipos e Interfaces
 * Módulo independente para gerenciamento de selos digitais
 */

/**
 * Tipos de selo disponíveis no sistema
 */
export type StampType = 'fisico' | 'digital';

/**
 * Status de validação do selo
 */
export type StampValidationStatus = 'valid' | 'invalid' | 'pending' | 'not-validated';

/**
 * Configuração básica de um selo
 */
export interface StampConfig {
  /** Tipo de selo */
  type: StampType;
  /** Código/número do selo */
  code: string;
  /** Data de emissão do selo */
  issueDate?: Date;
  /** Observações sobre o selo */
  notes?: string;
}

/**
 * Dados completos de um selo incluindo validação
 */
export interface Stamp extends StampConfig {
  /** Status de validação */
  validationStatus: StampValidationStatus;
  /** Timestamp da validação */
  validatedAt?: Date;
  /** Mensagem de validação */
  validationMessage?: string;
}

/**
 * Parâmetros para busca de selos
 */
export interface StampSearchParams {
  code?: string;
  type?: StampType;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Resultado de operação de selo
 */
export interface StampOperationResult {
  success: boolean;
  message: string;
  stamp?: Stamp;
  error?: Error;
}
