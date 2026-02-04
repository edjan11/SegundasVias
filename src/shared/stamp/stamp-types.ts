/**
 * Tipos e interfaces para o sistema de selo
 * Módulo completamente externo e isolado
 */

export interface StampData {
  enabled: boolean;
  number: string;      // Número do selo
  date: string;        // Data no formato YYYY-MM-DD
  time: string;        // Hora no formato HH:MM
}

export interface StampValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface StampConfig {
  required: boolean;
  numberPattern?: RegExp;
  minLength?: number;
  maxLength?: number;
}

export const DEFAULT_STAMP_CONFIG: StampConfig = {
  required: false,
  minLength: 1,
  maxLength: 50,
};

export const EMPTY_STAMP_DATA: StampData = {
  enabled: false,
  number: '',
  date: '',
  time: '',
};
