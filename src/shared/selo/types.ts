/**
 * Sistema de Selo Digital - Tipos e Interfaces
 * 
 * Módulo externo e independente para gerenciamento de selos digitais
 * em certidões de 2ª via.
 */

/**
 * Interface principal do selo digital
 */
export interface Selo {
  /** Número do selo (formato: NNNNNN-N) */
  numero: string;
  /** Data de emissão do selo */
  dataEmissao?: Date;
  /** Tipo de ato para o qual o selo foi emitido */
  tipo?: 'fiscal' | 'cartorio';
  /** Tipo de ato para o qual o selo foi emitido: nascimento, casamento, óbito */
  ato: 'nascimento' | 'casamento' | 'obito';
  /** Matrícula/registro do ato */
  matricula: string;
  /** Status do selo */
  status?: 'ativo' | 'cancelado' | 'utilizado';
  /** Identificador único do selo no sistema */
  id?: string;
  /** Data de cancelamento (se aplicável) */
  dataCancelamento?: Date;
  /** Data de aplicação do selo */
  dataAplicacao?: Date;
  /** Motivo do cancelamento (se aplicável) */
  motivoCancelamento?: string;
  /** Observações sobre o selo */
  observacoes?: string;
}

export type SeloDigital = Selo;

/**
 * Dados para criação de um novo selo
 */
export interface NovoSeloRequest {
  tipoAto: 'nascimento' | 'casamento' | 'obito';
  matricula: string;
}

/**
 * Resultado da validação de um selo
 */
export interface SeloValidationResult {
  /** Indica se o selo é válido */
  valid: boolean;
  /** Mensagens de erro (se houver) */
  errors: string[];
  /** Dados do selo (se válido) */
  selo?: Selo;
}

export type SeloValidacao = SeloValidationResult;

/**
 * Configurações do sistema de selo
 */
export interface SeloConfig {
  /** Formato do número do selo */
  formato?: 'NNNNNN-N' | 'NNNNNNNN';
  /** Prefixo para o número do selo */
  prefix?: string;
  /** Tamanho mínimo do número do selo */
  minLength?: number;
  /** Tamanho máximo do número do selo */
  maxLength?: number;
  /** Habilitar validação de checksum */
  validarChecksum?: boolean;
  /** Selo é obrigatório */
  required?: boolean;
  /** Selo é ativado/habilitado */
  enabled?: boolean;
}
/**
 * Estado do sistema de selo - Dados em memória
 */
export interface SeloState {
  /** Selos carregados em cache */
  selos: Map<string, Selo>;
  /** Configurações de selo por tipo de ato */
  configs: Map<string, SeloConfig>;
  /** Status de inicialização */
  initialized: boolean;
}