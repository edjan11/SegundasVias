/**
 * Sistema de Selo Digital - Tipos e Interfaces
 * Sistema externo e independente para gestão de selos digitais em certidões
 */

/**
 * Representa um selo digital vinculado a uma certidão
 */
export interface Seal {
  /** Código único do selo (formato: XXXXX-XXXXX) */
  code: string;
  
  /** Tipo de ato civil ao qual o selo está vinculado */
  actType: 'nascimento' | 'casamento' | 'obito';
  
  /** Número da matrícula do ato */
  registryNumber: string;
  
  /** Data e hora de emissão do selo */
  issuedAt: Date;
  
  /** Status atual do selo */
  status: 'active' | 'cancelled' | 'expired';
  
  /** URL da imagem do QR Code do selo */
  qrCodeUrl?: string;
  
  /** Metadados adicionais */
  metadata?: {
    /** Razão do cancelamento, se aplicável */
    cancellationReason?: string;
    /** Data de cancelamento */
    cancelledAt?: Date;
    /** Data de expiração, se aplicável */
    expiresAt?: Date;
  };
}

/**
 * Dados necessários para criar um novo selo
 */
export interface CreateSealRequest {
  actType: 'nascimento' | 'casamento' | 'obito';
  registryNumber: string;
}

/**
 * Resposta da criação de um selo
 */
export interface CreateSealResponse {
  success: boolean;
  seal?: Seal;
  error?: string;
}

/**
 * Resposta da validação de um selo
 */
export interface ValidateSealResponse {
  valid: boolean;
  seal?: Seal;
  error?: string;
}

/**
 * Configuração do sistema de selo
 */
export interface SealConfig {
  /** Habilitar ou desabilitar o sistema de selos */
  enabled: boolean;
  
  /** URL base da API externa de selos */
  apiBaseUrl: string;
  
  /** Timeout para requisições à API (ms) */
  timeout: number;
  
  /** Número de tentativas em caso de falha */
  retryAttempts: number;
}
