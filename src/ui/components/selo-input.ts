/**
 * UI Component: Campo de Input para Selo
 * 
 * Componente reutilizável para entrada de número de selo.
 * Inclui validação visual em tempo real.
 */

import { validateSeloNumero } from '../../shared/selo';
import type { SeloValidationResult } from '../../shared/selo';

export interface SeloInputOptions {
  containerId: string;        // ID do container onde será renderizado
  initialValue?: string;      // Valor inicial
  required?: boolean;         // Se é obrigatório
  label?: string;            // Label do campo
  placeholder?: string;      // Placeholder
  onChange?: (value: string, isValid: boolean) => void; // Callback de mudança
}

/**
 * Cria e renderiza um campo de input para selo
 */
export function createSeloInput(options: SeloInputOptions): {
  getValue: () => string;
  setValue: (value: string) => void;
  isValid: () => boolean;
  destroy: () => void;
} {
  const container = document.getElementById(options.containerId);
  if (!container) {
    throw new Error(`Container ${options.containerId} não encontrado`);
  }

  // HTML do componente
  const html = `
    <div class="selo-input-group">
      <label class="selo-input-label">
        ${options.label || 'Número do Selo'}
        ${options.required ? '<span class="selo-required">*</span>' : ''}
      </label>
      <input
        type="text"
        class="selo-input-field"
        placeholder="${options.placeholder || 'Ex: SF-12345678'}"
        value="${options.initialValue || ''}"
        ${options.required ? 'required' : ''}
      />
      <div class="selo-input-feedback"></div>
    </div>
  `;

  container.innerHTML = html;

  // Elementos
  const input = container.querySelector('.selo-input-field') as HTMLInputElement;
  const feedback = container.querySelector('.selo-input-feedback') as HTMLDivElement;

  let lastValidation: SeloValidationResult | null = null;

  /**
   * Valida o valor atual e atualiza UI
   */
  function validate(): boolean {
    const value = input.value.trim();
    
    // Se não é obrigatório e está vazio, considera válido
    if (!options.required && value === '') {
      input.classList.remove('selo-input-error', 'selo-input-success');
      feedback.textContent = '';
      feedback.classList.remove('selo-feedback-error', 'selo-feedback-success');
      lastValidation = { valid: true, errors: [] };
      return true;
    }

    // Valida
    const validation = validateSeloNumero(value);
    lastValidation = validation;

    // Atualiza UI
    if (validation.valid) {
      input.classList.remove('selo-input-error');
      input.classList.add('selo-input-success');
      feedback.textContent = '✓ Número válido';
      feedback.classList.remove('selo-feedback-error');
      feedback.classList.add('selo-feedback-success');
    } else {
      input.classList.remove('selo-input-success');
      input.classList.add('selo-input-error');
      feedback.textContent = validation.errors.join(', ');
      feedback.classList.remove('selo-feedback-success');
      feedback.classList.add('selo-feedback-error');
    }

    return validation.valid;
  }

  /**
   * Handler de mudança
   */
  function handleChange(): void {
    const isValid = validate();
    if (options.onChange) {
      options.onChange(input.value.trim(), isValid);
    }
  }

  // Event listeners
  input.addEventListener('input', handleChange);
  input.addEventListener('blur', validate);

  // API pública
  return {
    getValue: () => input.value.trim(),
    
    setValue: (value: string) => {
      input.value = value;
      validate();
    },
    
    isValid: () => {
      validate();
      return lastValidation?.valid || false;
    },
    
    destroy: () => {
      input.removeEventListener('input', handleChange);
      input.removeEventListener('blur', validate);
      container.innerHTML = '';
    }
  };
}

/**
 * CSS necessário (deve ser incluído no CSS global ou carregado dinamicamente)
 */
export const SELO_INPUT_CSS = `
.selo-input-group {
  margin-bottom: 1rem;
}

.selo-input-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #374151;
}

.selo-required {
  color: #ef4444;
  margin-left: 0.25rem;
}

.selo-input-field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.selo-input-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.selo-input-field.selo-input-error {
  border-color: #ef4444;
}

.selo-input-field.selo-input-error:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.selo-input-field.selo-input-success {
  border-color: #10b981;
}

.selo-input-feedback {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  min-height: 1rem;
}

.selo-feedback-error {
  color: #ef4444;
}

.selo-feedback-success {
  color: #10b981;
}
`;
