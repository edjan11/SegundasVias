/**
 * Escrevente Schema - Sistema de Administração de Escreventes/Serventuários
 * Suporta armazenamento JSON com migração futura para PostgreSQL
 */

export type CargoCertidao = 
  | 'ESCREVENTE'
  | 'OFICIAL'
  | 'SUBSTITUTO'
  | 'AUXILIAR'
  | 'NOTÁRIO';

export interface Escrevente {
  /** UUID v4 ou ID sequencial */
  id: string;
  
  /** Nome completo do escrevente (obrigatório) */
  nome: string;
  
  /** CPF (opcional, mas deve ser válido se fornecido) */
  cpf?: string;
  
  /** Matrícula interna do cartório */
  matriculaInterna?: string;
  
  /** ID do cartório (CNS ou UUID futuro) */
  cartorioId: string;
  
  /** Cargo/função principal */
  cargo: CargoCertidao;
  
  /** Descrição adicional da função */
  funcao?: string;
  
  /** Status ativo/inativo */
  ativo: boolean;
  
  /** Array de códigos de permissão */
  permissoes: string[];
  
  /** Data de criação (ISO 8601) */
  createdAt: string;
  
  /** Data da última atualização (ISO 8601) */
  updatedAt: string;
  
  /** ID do usuário que criou (para auditoria) */
  createdBy?: string;
  
  /** ID do usuário que atualizou (para auditoria) */
  updatedBy?: string;
}

export interface EscreventeCreateDTO {
  nome: string;
  cpf?: string;
  matriculaInterna?: string;
  cartorioId: string;
  cargo: CargoCertidao;
  funcao?: string;
  ativo?: boolean;
  permissoes?: string[];
}

export interface EscreventeUpdateDTO {
  nome?: string;
  cpf?: string;
  matriculaInterna?: string;
  cartorioId?: string;
  cargo?: CargoCertidao;
  funcao?: string;
  ativo?: boolean;
  permissoes?: string[];
}

export interface EscreventeSearchParams {
  query?: string;
  cartorioId?: string;
  cargo?: CargoCertidao;
  ativo?: boolean;
  offset?: number;
  limit?: number;
}

export interface EscreventeSearchResult {
  items: Escrevente[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Validação de CPF (algoritmo padrão brasileiro)
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return true; // CPF é opcional
  
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

/**
 * Validação de dados do Escrevente
 */
export function validateEscrevente(data: EscreventeCreateDTO | EscreventeUpdateDTO): string[] {
  const errors: string[] = [];
  
  if ('nome' in data && data.nome !== undefined) {
    if (!data.nome || data.nome.trim().length < 3) {
      errors.push('Nome deve ter no mínimo 3 caracteres');
    }
    if (data.nome.length > 255) {
      errors.push('Nome deve ter no máximo 255 caracteres');
    }
  }
  
  if (data.cpf) {
    if (!validateCPF(data.cpf)) {
      errors.push('CPF inválido');
    }
  }
  
  if ('cartorioId' in data && data.cartorioId !== undefined) {
    if (!data.cartorioId || data.cartorioId.trim().length === 0) {
      errors.push('Cartório é obrigatório');
    }
  }
  
  if ('cargo' in data && data.cargo !== undefined) {
    const validCargos: CargoCertidao[] = ['ESCREVENTE', 'OFICIAL', 'SUBSTITUTO', 'AUXILIAR', 'NOTÁRIO'];
    if (!validCargos.includes(data.cargo)) {
      errors.push('Cargo inválido');
    }
  }
  
  return errors;
}

/**
 * Formata CPF para exibição (000.000.000-00)
 */
export function formatCPF(cpf: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Remove formatação do CPF
 */
export function sanitizeCPF(cpf: string): string {
  return cpf ? cpf.replace(/\D/g, '') : '';
}
