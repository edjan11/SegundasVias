/**
 * Painel de Administração de Escreventes
 * Interface completa CRUD com busca, paginação e validação
 */

import type {
  Escrevente,
  EscreventeCreateDTO,
  EscreventeUpdateDTO,
  CargoCertidao,
} from '../../shared/admin/escrevente.schema';
import { formatCPF, sanitizeCPF, validateCPF } from '../../shared/admin/escrevente.schema';
import { getEscreventesClient } from './admin-escreventes-client';

const client = getEscreventesClient();

// Estado do painel
interface PanelState {
  escreventes: Escrevente[];
  filteredEscreventes: Escrevente[];
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  filterCartorio: string;
  filterAtivo: 'all' | 'ativo' | 'inativo';
  editingId: string | null;
}

const state: PanelState = {
  escreventes: [],
  filteredEscreventes: [],
  currentPage: 1,
  pageSize: 20,
  searchQuery: '',
  filterCartorio: '',
  filterAtivo: 'all',
  editingId: null,
};

/**
 * Inicializa o painel de administração
 */
export async function initAdminEscreventes(): Promise<void> {
  console.log('[AdminEscreventes] Inicializando painel...');
  
  // Carrega escreventes
  await reloadEscreventes();
  
  // Renderiza interface
  renderPanel();
  
  // Eventos
  setupEventListeners();
}

/**
 * Recarrega lista de escreventes
 */
async function reloadEscreventes(): Promise<void> {
  try {
    const result = await client.search({
      offset: 0,
      limit: 1000, // Carrega todos para cache local
    });
    state.escreventes = result;
    applyFilters();
  } catch (error) {
    console.error('[AdminEscreventes] Erro ao carregar:', error);
    showToast('Erro ao carregar escreventes', 'error');
  }
}

/**
 * Aplica filtros e atualiza lista
 */
function applyFilters(): void {
  let filtered = [...state.escreventes];

  // Filtro de busca (nome, CPF, matrícula)
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(e => 
      e.nome.toLowerCase().includes(query) ||
      e.cpf?.includes(query) ||
      e.matriculaInterna?.toLowerCase().includes(query)
    );
  }

  // Filtro de cartório
  if (state.filterCartorio) {
    filtered = filtered.filter(e => e.cartorioId === state.filterCartorio);
  }

  // Filtro de ativo
  if (state.filterAtivo !== 'all') {
    const ativo = state.filterAtivo === 'ativo';
    filtered = filtered.filter(e => e.ativo === ativo);
  }

  state.filteredEscreventes = filtered;
  state.currentPage = 1;
  renderTable();
  renderPagination();
}

/**
 * Renderiza o painel completo
 */
function renderPanel(): void {
  const container = document.getElementById('admin-escreventes-panel');
  if (!container) {
    console.error('[AdminEscreventes] Container não encontrado');
    return;
  }

  container.innerHTML = `
    <div class="admin-escreventes">
      <div class="admin-header">
        <h2>Administração de Escreventes</h2>
        <button id="btn-new-escrevente" class="btn-primary">
          <span>➕</span> Novo Escrevente
        </button>
      </div>

      <div class="admin-filters">
        <input 
          type="text" 
          id="search-escrevente" 
          placeholder="Buscar por nome, CPF ou matrícula..."
          class="search-input"
        />
        
        <select id="filter-cartorio" class="filter-select">
          <option value="">Todos os cartórios</option>
        </select>
        
        <select id="filter-ativo" class="filter-select">
          <option value="all">Todos</option>
          <option value="ativo">Somente ativos</option>
          <option value="inativo">Somente inativos</option>
        </select>

        <button id="btn-reload" class="btn-secondary" title="Recarregar">
          🔄
        </button>
      </div>

      <div id="escreventes-table-container" class="table-container">
        <!-- Tabela será renderizada aqui -->
      </div>

      <div id="pagination-container" class="pagination">
        <!-- Paginação será renderizada aqui -->
      </div>

      <!-- Modal de edição -->
      <div id="modal-escrevente" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title">Novo Escrevente</h3>
            <button id="modal-close" class="btn-close">×</button>
          </div>
          <div class="modal-body">
            <form id="form-escrevente">
              <div class="form-group">
                <label for="input-nome">Nome Completo *</label>
                <input type="text" id="input-nome" required maxlength="255" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="input-cpf">CPF</label>
                  <input type="text" id="input-cpf" placeholder="000.000.000-00" maxlength="14" />
                </div>
                <div class="form-group">
                  <label for="input-matricula">Matrícula Interna</label>
                  <input type="text" id="input-matricula" maxlength="50" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="input-cartorio">Cartório *</label>
                  <select id="input-cartorio" required>
                    <option value="">Selecione...</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="input-cargo">Cargo *</label>
                  <select id="input-cargo" required>
                    <option value="ESCREVENTE">Escrevente</option>
                    <option value="OFICIAL">Oficial</option>
                    <option value="SUBSTITUTO">Substituto</option>
                    <option value="AUXILIAR">Auxiliar</option>
                    <option value="NOTÁRIO">Notário</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="input-funcao">Função/Descrição</label>
                <input type="text" id="input-funcao" maxlength="100" />
              </div>

              <div class="form-group">
                <label>
                  <input type="checkbox" id="input-ativo" checked />
                  Ativo
                </label>
              </div>

              <div id="form-errors" class="form-errors" style="display: none;"></div>

              <div class="modal-actions">
                <button type="button" id="btn-cancel" class="btn-secondary">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  renderTable();
  renderPagination();
  populateCartorioSelects();
}

/**
 * Renderiza tabela de escreventes
 */
function renderTable(): void {
  const container = document.getElementById('escreventes-table-container');
  if (!container) return;

  const startIdx = (state.currentPage - 1) * state.pageSize;
  const endIdx = startIdx + state.pageSize;
  const pageItems = state.filteredEscreventes.slice(startIdx, endIdx);

  if (pageItems.length === 0) {
    container.innerHTML = '<p class="no-data">Nenhum escrevente encontrado</p>';
    return;
  }

  const rows = pageItems.map(e => `
    <tr data-id="${e.id}">
      <td>${escapeHtml(e.nome)}</td>
      <td>${e.cpf ? formatCPF(e.cpf) : '-'}</td>
      <td>${escapeHtml(e.matriculaInterna || '-')}</td>
      <td>${escapeHtml(e.cargo)}</td>
      <td>
        <span class="status-badge ${e.ativo ? 'active' : 'inactive'}">
          ${e.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon btn-edit" data-id="${e.id}" title="Editar">✏️</button>
        <button class="btn-icon btn-delete" data-id="${e.id}" title="Excluir">🗑️</button>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>CPF</th>
          <th>Matrícula</th>
          <th>Cargo</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Renderiza paginação
 */
function renderPagination(): void {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  const totalPages = Math.ceil(state.filteredEscreventes.length / state.pageSize);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const pages: string[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= state.currentPage - 2 && i <= state.currentPage + 2)
    ) {
      pages.push(`
        <button 
          class="page-btn ${i === state.currentPage ? 'active' : ''}" 
          data-page="${i}"
        >
          ${i}
        </button>
      `);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('<span class="page-ellipsis">...</span>');
    }
  }

  container.innerHTML = `
    <button class="page-btn" data-page="${state.currentPage - 1}" ${state.currentPage === 1 ? 'disabled' : ''}>
      ‹ Anterior
    </button>
    ${pages.join('')}
    <button class="page-btn" data-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? 'disabled' : ''}>
      Próxima ›
    </button>
    <span class="page-info">
      ${state.filteredEscreventes.length} escrevente(s) encontrado(s)
    </span>
  `;
}

/**
 * Popula selects de cartório
 */
async function populateCartorioSelects(): Promise<void> {
  // TODO: Implementar carregamento de cartórios do sistema
  // Por enquanto, usa lista mock
  const cartoriosMock = [
    { id: '001', nome: 'Cartório 1º Ofício' },
    { id: '002', nome: 'Cartório 2º Ofício' },
  ];

  const filterSelect = document.getElementById('filter-cartorio') as HTMLSelectElement;
  const inputSelect = document.getElementById('input-cartorio') as HTMLSelectElement;

  if (filterSelect) {
    cartoriosMock.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      filterSelect.appendChild(opt);
    });
  }

  if (inputSelect) {
    cartoriosMock.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      inputSelect.appendChild(opt);
    });
  }
}

/**
 * Configura event listeners
 */
function setupEventListeners(): void {
  // Botão novo escrevente
  document.getElementById('btn-new-escrevente')?.addEventListener('click', () => {
    openModal(null);
  });

  // Busca
  document.getElementById('search-escrevente')?.addEventListener('input', (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    applyFilters();
  });

  // Filtros
  document.getElementById('filter-cartorio')?.addEventListener('change', (e) => {
    state.filterCartorio = (e.target as HTMLSelectElement).value;
    applyFilters();
  });

  document.getElementById('filter-ativo')?.addEventListener('change', (e) => {
    state.filterAtivo = (e.target as HTMLSelectElement).value as any;
    applyFilters();
  });

  // Reload
  document.getElementById('btn-reload')?.addEventListener('click', async () => {
    await reloadEscreventes();
    showToast('Lista atualizada', 'success');
  });

  // Paginação
  document.getElementById('pagination-container')?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('page-btn') && !target.hasAttribute('disabled')) {
      const page = parseInt(target.dataset.page || '1');
      state.currentPage = page;
      renderTable();
      renderPagination();
    }
  });

  // Ações da tabela (edit/delete)
  document.getElementById('escreventes-table-container')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const id = target.dataset.id;
    
    if (!id) return;

    if (target.classList.contains('btn-edit')) {
      const escrevente = state.escreventes.find(e => e.id === id);
      if (escrevente) {
        openModal(escrevente);
      }
    } else if (target.classList.contains('btn-delete')) {
      if (confirm('Deseja realmente excluir este escrevente?')) {
        await deleteEscrevente(id);
      }
    }
  });

  // Modal
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel')?.addEventListener('click', closeModal);
  
  document.getElementById('form-escrevente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveEscrevente();
  });

  // Formatação automática de CPF
  document.getElementById('input-cpf')?.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length >= 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    } else if (value.length >= 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else if (value.length >= 3) {
      value = value.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    }
    
    input.value = value;
  });
}

/**
 * Abre modal de edição/criação
 */
function openModal(escrevente: Escrevente | null): void {
  const modal = document.getElementById('modal-escrevente');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('form-escrevente') as HTMLFormElement;
  
  if (!modal || !title || !form) return;

  state.editingId = escrevente?.id || null;
  title.textContent = escrevente ? 'Editar Escrevente' : 'Novo Escrevente';

  if (escrevente) {
    (document.getElementById('input-nome') as HTMLInputElement).value = escrevente.nome;
    (document.getElementById('input-cpf') as HTMLInputElement).value = escrevente.cpf ? formatCPF(escrevente.cpf) : '';
    (document.getElementById('input-matricula') as HTMLInputElement).value = escrevente.matriculaInterna || '';
    (document.getElementById('input-cartorio') as HTMLSelectElement).value = escrevente.cartorioId;
    (document.getElementById('input-cargo') as HTMLSelectElement).value = escrevente.cargo;
    (document.getElementById('input-funcao') as HTMLInputElement).value = escrevente.funcao || '';
    (document.getElementById('input-ativo') as HTMLInputElement).checked = escrevente.ativo;
  } else {
    form.reset();
  }

  hideFormErrors();
  modal.style.display = 'flex';
}

/**
 * Fecha modal
 */
function closeModal(): void {
  const modal = document.getElementById('modal-escrevente');
  if (modal) {
    modal.style.display = 'none';
  }
  state.editingId = null;
}

/**
 * Salva escrevente (criar ou atualizar)
 */
async function saveEscrevente(): Promise<void> {
  const nome = (document.getElementById('input-nome') as HTMLInputElement).value.trim();
  const cpf = sanitizeCPF((document.getElementById('input-cpf') as HTMLInputElement).value);
  const matriculaInterna = (document.getElementById('input-matricula') as HTMLInputElement).value.trim();
  const cartorioId = (document.getElementById('input-cartorio') as HTMLSelectElement).value;
  const cargo = (document.getElementById('input-cargo') as HTMLSelectElement).value as CargoCertidao;
  const funcao = (document.getElementById('input-funcao') as HTMLInputElement).value.trim();
  const ativo = (document.getElementById('input-ativo') as HTMLInputElement).checked;

  // Validação client-side
  const errors: string[] = [];
  if (!nome || nome.length < 3) {
    errors.push('Nome deve ter no mínimo 3 caracteres');
  }
  if (cpf && !validateCPF(cpf)) {
    errors.push('CPF inválido');
  }
  if (!cartorioId) {
    errors.push('Cartório é obrigatório');
  }

  if (errors.length > 0) {
    showFormErrors(errors);
    return;
  }

  try {
    if (state.editingId) {
      // Atualizar
      const data: EscreventeUpdateDTO = {
        nome,
        cpf: cpf || undefined,
        matriculaInterna: matriculaInterna || undefined,
        cartorioId,
        cargo,
        funcao: funcao || undefined,
        ativo,
      };
      await client.update(state.editingId, data);
      showToast('Escrevente atualizado com sucesso', 'success');
    } else {
      // Criar
      const data: EscreventeCreateDTO = {
        nome,
        cpf: cpf || undefined,
        matriculaInterna: matriculaInterna || undefined,
        cartorioId,
        cargo,
        funcao: funcao || undefined,
        ativo,
      };
      await client.create(data);
      showToast('Escrevente criado com sucesso', 'success');
    }

    closeModal();
    await reloadEscreventes();
  } catch (error: any) {
    showFormErrors([error.message || 'Erro ao salvar escrevente']);
  }
}

/**
 * Deleta escrevente
 */
async function deleteEscrevente(id: string): Promise<void> {
  try {
    await client.delete(id);
    showToast('Escrevente excluído com sucesso', 'success');
    await reloadEscreventes();
  } catch (error: any) {
    showToast(error.message || 'Erro ao excluir escrevente', 'error');
  }
}

/**
 * Mostra erros no formulário
 */
function showFormErrors(errors: string[]): void {
  const container = document.getElementById('form-errors');
  if (!container) return;

  container.innerHTML = `
    <ul>
      ${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
    </ul>
  `;
  container.style.display = 'block';
}

/**
 * Esconde erros do formulário
 */
function hideFormErrors(): void {
  const container = document.getElementById('form-errors');
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * Mostra toast de notificação
 */
function showToast(message: string, type: 'success' | 'error' | 'info'): void {
  // TODO: Implementar sistema de toast global
  console.log(`[Toast ${type}] ${message}`);
  alert(message);
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
