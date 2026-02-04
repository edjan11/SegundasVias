/**
 * UI Component: Modal de Gerenciamento de Selo
 * 
 * Modal completo para criar/editar selos de forma visual.
 */

import { createSelo, updateSelo } from '../../shared/selo';
import type { Selo } from '../../shared/selo';
import { createSeloInput } from './selo-input';

export interface SeloModalOptions {
  ato: 'nascimento' | 'casamento' | 'obito';
  matricula?: string;
  existingSelo?: Selo;
  onSave?: (selo: Selo) => void;
  onCancel?: () => void;
}

/**
 * Abre modal de selo
 */
export function openSeloModal(options: SeloModalOptions): void {
  // Remove modal existente se houver
  closeSeloModal();

  const isEdit = !!options.existingSelo;
  
  // Cria modal
  const modal = document.createElement('div');
  modal.id = 'selo-modal';
  modal.className = 'selo-modal-overlay';
  
  modal.innerHTML = `
    <div class="selo-modal-content">
      <div class="selo-modal-header">
        <h3 class="selo-modal-title">
          ${isEdit ? 'Editar' : 'Adicionar'} Selo
        </h3>
        <button class="selo-modal-close" aria-label="Fechar">×</button>
      </div>
      
      <div class="selo-modal-body">
        <!-- Container para o input de número -->
        <div id="selo-numero-container"></div>
        
        <!-- Tipo de selo -->
        <div class="selo-input-group">
          <label class="selo-input-label">
            Tipo de Selo <span class="selo-required">*</span>
          </label>
          <select class="selo-input-field" id="selo-tipo">
            <option value="">Selecione...</option>
            <option value="fiscal" ${options.existingSelo?.tipo === 'fiscal' ? 'selected' : ''}>
              Fiscal
            </option>
            <option value="cartorio" ${options.existingSelo?.tipo === 'cartorio' ? 'selected' : ''}>
              Cartório
            </option>
          </select>
        </div>
        
        <!-- Observações -->
        <div class="selo-input-group">
          <label class="selo-input-label">Observações</label>
          <textarea 
            class="selo-input-field" 
            id="selo-observacoes" 
            rows="3"
            placeholder="Informações adicionais (opcional)"
          >${options.existingSelo?.observacoes || ''}</textarea>
        </div>
      </div>
      
      <div class="selo-modal-footer">
        <button class="selo-btn selo-btn-secondary" id="selo-cancel-btn">
          Cancelar
        </button>
        <button class="selo-btn selo-btn-primary" id="selo-save-btn">
          ${isEdit ? 'Atualizar' : 'Salvar'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Cria o input de número usando o componente
  const seloInput = createSeloInput({
    containerId: 'selo-numero-container',
    initialValue: options.existingSelo?.numero,
    required: true,
    label: 'Número do Selo',
    placeholder: 'Ex: SF-12345678'
  });

  // Elementos
  const tipoSelect = modal.querySelector('#selo-tipo') as HTMLSelectElement;
  const observacoesTextarea = modal.querySelector('#selo-observacoes') as HTMLTextAreaElement;
  const saveBtn = modal.querySelector('#selo-save-btn') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('#selo-cancel-btn') as HTMLButtonElement;
  const closeBtn = modal.querySelector('.selo-modal-close') as HTMLButtonElement;

  /**
   * Handler de salvar
   */
  async function handleSave(): Promise<void> {
    // Valida
    if (!seloInput.isValid()) {
      alert('Por favor, corrija os erros antes de salvar.');
      return;
    }

    if (!tipoSelect.value) {
      alert('Por favor, selecione o tipo de selo.');
      return;
    }

    // Desabilita botão
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
      let result;
      
      if (isEdit && options.existingSelo) {
        // Atualiza
        result = await updateSelo(options.existingSelo.id, {
          numero: seloInput.getValue(),
          tipo: tipoSelect.value as 'fiscal' | 'cartorio',
          observacoes: observacoesTextarea.value.trim() || undefined
        });
      } else {
        // Cria novo
        result = await createSelo({
          numero: seloInput.getValue(),
          tipo: tipoSelect.value as 'fiscal' | 'cartorio',
          ato: options.ato,
          matricula: options.matricula,
          observacoes: observacoesTextarea.value.trim() || undefined
        });
      }

      if (result.success && result.selo) {
        if (options.onSave) {
          options.onSave(result.selo);
        }
        closeSeloModal();
      } else {
        alert('Erro ao salvar selo:\n' + (result.errors?.join('\n') || 'Erro desconhecido'));
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Atualizar' : 'Salvar';
      }
    } catch (error) {
      console.error('Erro ao salvar selo:', error);
      alert('Erro ao salvar selo. Veja o console para detalhes.');
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Atualizar' : 'Salvar';
    }
  }

  /**
   * Handler de cancelar
   */
  function handleCancel(): void {
    if (options.onCancel) {
      options.onCancel();
    }
    closeSeloModal();
  }

  // Event listeners
  saveBtn.addEventListener('click', handleSave);
  cancelBtn.addEventListener('click', handleCancel);
  closeBtn.addEventListener('click', handleCancel);
  
  // Fecha ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      handleCancel();
    }
  });

  // ESC para fechar
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Fecha modal de selo
 */
export function closeSeloModal(): void {
  const modal = document.getElementById('selo-modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * CSS necessário para o modal
 */
export const SELO_MODAL_CSS = `
.selo-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.selo-modal-content {
  background: white;
  border-radius: 0.5rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.selo-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.selo-modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.selo-modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.selo-modal-close:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.selo-modal-body {
  padding: 1.5rem;
}

.selo-modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.selo-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease-in-out;
}

.selo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selo-btn-primary {
  background-color: #3b82f6;
  color: white;
}

.selo-btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.selo-btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.selo-btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}
`;
