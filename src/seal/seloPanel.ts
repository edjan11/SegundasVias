/**
 * seloPanel.ts
 * 
 * Floating Panel Component - Windows Explorer Style
 * Displays seal history with search, filter, and navigation
 * 
 * Features:
 * - Floating sidebar (draggable, resizable)
 * - Position: right or left side
 * - Tree view / list navigation
 * - Search by name, matricula, numSelo
 * - Filter by certType, status, date range
 * - Pagination support
 * - Real-time updates
 * - Seal detail view
 * - Retry failed seals
 * - Download seal images
 */

import type { SeloRecord, SeloRecordFilter, PaginatedResult } from './seloHistoryStore';
import { getSeloController } from './seloController';
import './seloPanel.css';

/**
 * Panel position
 */
export type PanelPosition = 'right' | 'left';

/**
 * Panel initialization options
 */
export interface PanelOptions {
  position?: PanelPosition; // Default: 'right'
  width?: number; // Default: 400px
  minWidth?: number; // Default: 300px
  maxWidth?: number; // Default: 600px
  autoRefresh?: boolean; // Auto-refresh on seal generation
  refreshInterval?: number; // Milliseconds (default: 0 - disabled)
}

/**
 * View mode
 */
export type ViewMode = 'table' | 'tree' | 'detail';

/**
 * SeloPanel - Floating sidebar component
 */
export class SeloPanel {
  private controller = getSeloController();
  private options: Required<PanelOptions>;
  
  // DOM elements
  private panelElement: HTMLDivElement | null = null;
  private toggleButton: HTMLButtonElement | null = null;
  
  // State
  private isOpen = false;
  private isMinimized = false;
  private currentView: ViewMode = 'table';
  private currentFilter: SeloRecordFilter = {};
  private currentPage = 1;
  private pageSize = 50;
  private currentData: PaginatedResult<SeloRecord> | null = null;
  private selectedRecord: SeloRecord | null = null;
  
  // Dragging state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartWidth = 0;

  // Auto-refresh
  private refreshTimer: number | null = null;

  constructor(options: PanelOptions = {}) {
    this.options = {
      position: options.position || 'right',
      width: options.width || 400,
      minWidth: options.minWidth || 300,
      maxWidth: options.maxWidth || 600,
      autoRefresh: options.autoRefresh !== undefined ? options.autoRefresh : true,
      refreshInterval: options.refreshInterval || 0
    };

    this.init();
  }

  /**
   * Initialize panel
   */
  private init(): void {
    this.createToggleButton();
    this.createPanelHTML();
    this.bindEvents();
    
    if (this.options.autoRefresh) {
      this.subscribeToControllerUpdates();
    }

    if (this.options.refreshInterval > 0) {
      this.startAutoRefresh();
    }
  }

  /**
   * Create toggle button (always visible)
   */
  private createToggleButton(): void {
    this.toggleButton = document.createElement('button');
    this.toggleButton.type = 'button';

    const slot = document.querySelector('[data-selo-slot]') as HTMLElement | null;
    if (slot) {
      this.toggleButton.className = 'btn secondary compact taskbar-seal-btn';
      this.toggleButton.textContent = 'Selagem';
      this.toggleButton.title = 'Abrir painel de selagem';
      this.toggleButton.setAttribute('aria-label', 'Selagem');
      slot.appendChild(this.toggleButton);
    } else {
      this.toggleButton.className = `selo-panel-toggle selo-panel-toggle-${this.options.position}`;
      this.toggleButton.innerHTML = 'S';
      this.toggleButton.title = 'Historico de Selos';
      this.toggleButton.setAttribute('aria-label', 'Abrir histórico de selos');
      document.body.appendChild(this.toggleButton);
    }

    this.toggleButton.addEventListener('click', () => this.toggle());
  }

  /**
   * Create panel HTML structure
   */
  private createPanelHTML(): void {
    this.panelElement = document.createElement('div');
    this.panelElement.className = `selo-panel selo-panel-${this.options.position}`;
    this.panelElement.style.width = `${this.options.width}px`;
    this.panelElement.style.display = 'none';
    
    this.panelElement.innerHTML = `
      <div class="selo-panel-header">
        <h2>Selagem</h2>
        <div class="selo-panel-header-actions">
          <button class="selo-panel-btn-icon" id="minimizeBtn" title="Minimizar" aria-label="Minimizar">−</button>
          <button class="selo-panel-btn-icon" id="closeBtn" title="Fechar" aria-label="Fechar">×</button>
        </div>
      </div>
      
      <div class="selo-panel-toolbar">
        <!-- Search -->
        <div class="selo-panel-search">
          <input 
            type="text" 
            id="searchInput" 
            placeholder="Buscar por nome, matricula, nro selo..." 
            class="selo-panel-input">
          <button id="searchBtn" class="selo-panel-btn-icon" title="Buscar">Buscar</button>
        </div>
        
        <!-- View mode toggles -->
        <div class="selo-panel-view-toggle">
          <button class="selo-panel-view-btn active" data-view="table" title="Visualizacao em tabela">Tabela</button>
          <button class="selo-panel-view-btn" data-view="tree" title="Visualizacao em arvore">Arvore</button>
        </div>
      </div>
      
      <div class="selo-panel-filters">
        <details>
          <summary>Filtros</summary>
          <div class="selo-panel-filters-content">
            <label>
              Tipo de Documento:
              <select id="filterCertType" class="selo-panel-select">
                <option value="">Todos</option>
                <option value="nascimento">Nascimento</option>
                <option value="casamento">Casamento</option>
                <option value="obito">Óbito</option>
              </select>
            </label>
            
            <label>
              Status:
              <select id="filterStatus" class="selo-panel-select">
                <option value="">Todos</option>
                <option value="pending">Pendente</option>
                <option value="generated">Gerado</option>
                <option value="applied">Aplicado</option>
                <option value="failed">Falhou</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </label>
            
            <label>
              Data Início:
              <input type="date" id="filterDataInicio" class="selo-panel-input">
            </label>
            
            <label>
              Data Fim:
              <input type="date" id="filterDataFim" class="selo-panel-input">
            </label>
            
            <button id="applyFiltersBtn" class="selo-panel-btn-primary">Aplicar Filtros</button>
            <button id="clearFiltersBtn" class="selo-panel-btn-secondary">Limpar</button>
          </div>
        </details>
      </div>
      
      <div class="selo-panel-content">
        <!-- Table view (Default) -->
        <div id="tableView" class="selo-panel-table-wrapper">
          <table class="selo-panel-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>Nº Guia</th>
                <th>Nº Selo</th>
                <th>Chave Pública</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <tr><td colspan="6" class="selo-panel-loading">Carregando...</td></tr>
            </tbody>
          </table>
        </div>
        
        <!-- Tree view -->
        <div id="treeView" class="selo-panel-tree" style="display: none;">
          <div class="selo-panel-loading">Carregando...</div>
        </div>
        
        <!-- Detail view -->
        <div id="detailView" class="selo-panel-detail" style="display: none;">
          <!-- Populated when record selected -->
        </div>
      </div>
      
      <div class="selo-panel-pagination">
        <button id="prevPageBtn" class="selo-panel-btn-secondary" disabled>&lt; Anterior</button>
        <span id="pageInfo">Pagina 1 de 1</span>
        <button id="nextPageBtn" class="selo-panel-btn-secondary" disabled>Proxima &gt;</button>
      </div>
      
      <div class="selo-panel-footer">
        <div id="statsInfo" class="selo-panel-stats"></div>
      </div>
      
      <!-- Resize handle -->
      <div class="selo-panel-resize-handle"></div>
    `;
    
    document.body.appendChild(this.panelElement);
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    if (!this.panelElement) return;

    // Close button
    const closeBtn = this.panelElement.querySelector('#closeBtn');
    closeBtn?.addEventListener('click', () => this.close());

    // Minimize button
    const minimizeBtn = this.panelElement.querySelector('#minimizeBtn');
    minimizeBtn?.addEventListener('click', () => this.toggleMinimize());

    // Search
    const searchBtn = this.panelElement.querySelector('#searchBtn');
    const searchInput = this.panelElement.querySelector('#searchInput') as HTMLInputElement;
    searchBtn?.addEventListener('click', () => this.performSearch());
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });

    // View mode toggles
    const viewBtns = this.panelElement.querySelectorAll('.selo-panel-view-btn');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const view = target.dataset.view as ViewMode;
        this.switchView(view);
      });
    });

    // Filter buttons
    const applyFiltersBtn = this.panelElement.querySelector('#applyFiltersBtn');
    const clearFiltersBtn = this.panelElement.querySelector('#clearFiltersBtn');
    applyFiltersBtn?.addEventListener('click', () => this.applyFilters());
    clearFiltersBtn?.addEventListener('click', () => this.clearFilters());

    // Pagination
    const prevPageBtn = this.panelElement.querySelector('#prevPageBtn');
    const nextPageBtn = this.panelElement.querySelector('#nextPageBtn');
    prevPageBtn?.addEventListener('click', () => this.goToPreviousPage());
    nextPageBtn?.addEventListener('click', () => this.goToNextPage());

    // Resize handle
    const resizeHandle = this.panelElement.querySelector('.selo-panel-resize-handle');
    resizeHandle?.addEventListener('mousedown', (e) => this.startResize(e as MouseEvent));
  }

  /**
   * Toggle panel open/closed
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open panel
   */
  async open(): Promise<void> {
    if (!this.panelElement) return;
    
    this.isOpen = true;
    this.panelElement.style.display = 'flex';
    this.panelElement.classList.add('active');
    
    // Load initial data
    await this.loadData();
    this.loadStats();
  }

  /**
   * Close panel
   */
  close(): void {
    if (!this.panelElement) return;
    
    this.isOpen = false;
    this.panelElement.classList.remove('active');
    
    setTimeout(() => {
      if (this.panelElement) {
        this.panelElement.style.display = 'none';
      }
    }, 300);
  }

  /**
   * Toggle minimize
   */
  private toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    if (this.panelElement) {
      this.panelElement.classList.toggle('minimized', this.isMinimized);
    }
  }

  /**
   * Switch view mode
   */
  private switchView(view: ViewMode): void {
    this.currentView = view;
    
    // Update active button
    const viewBtns = this.panelElement?.querySelectorAll('.selo-panel-view-btn');
    viewBtns?.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === view);
    });

    // Show/hide views
    const tableView = this.panelElement?.querySelector('#tableView') as HTMLElement;
    const treeView = this.panelElement?.querySelector('#treeView') as HTMLElement;
    const detailView = this.panelElement?.querySelector('#detailView') as HTMLElement;

    if (tableView) tableView.style.display = view === 'table' ? 'block' : 'none';
    if (treeView) treeView.style.display = view === 'tree' ? 'block' : 'none';
    if (detailView) detailView.style.display = view === 'detail' ? 'block' : 'none';

    // Render current view
    if (view === 'table') {
      this.renderTableView();
    } else if (view === 'tree') {
      this.renderTreeView();
    } else if (view === 'detail' && this.selectedRecord) {
      this.renderDetailView(this.selectedRecord);
    }
  }

  /**
   * Load data from controller
   */
  private async loadData(): Promise<void> {
    try {
      this.currentData = this.controller.queryHistory(
        this.currentFilter,
        this.currentPage,
        this.pageSize
      );
      
      this.renderTableView();
      this.updatePagination();
    } catch (error) {
      console.error('[SeloPanel] Error loading data:', error);
    }
  }

  /**
   * Render list view
   */
  private renderListView(): void {
    const listView = this.panelElement?.querySelector('#listView');
    if (!listView || !this.currentData) return;

    if (this.currentData.items.length === 0) {
      listView.innerHTML = '<div class="selo-panel-empty">Nenhum selo encontrado</div>';
      return;
    }

    const listHTML = this.currentData.items.map(record => `
      <div class="selo-panel-list-item" data-id="${record.id}">
        <div class="selo-list-item-header">
          <strong>${record.nomeRegistrado}</strong>
          <span class="selo-list-item-status selo-status-${record.status}">${this.getStatusLabel(record.status)}</span>
        </div>
        <div class="selo-list-item-body">
          <p><small>Tipo: ${this.getCertTypeLabel(record.certType)}</small></p>
          <p><small>Matrícula: ${record.matricula}</small></p>
          ${record.numSelo ? `<p><small>Nº Selo: ${record.numSelo}</small></p>` : ''}
          <p><small>Data: ${new Date(record.createdAt).toLocaleDateString('pt-BR')}</small></p>
        </div>
      </div>
    `).join('');

    listView.innerHTML = listHTML;

    // Bind click events
    const items = listView.querySelectorAll('.selo-panel-list-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const record = this.currentData?.items.find(r => r.id === id);
        if (record) {
          this.selectRecord(record);
        }
      });
    });
  }

  /**
   * Render tree view (grouped by certType and status)
   */
  private renderTreeView(): void {
    const treeView = this.panelElement?.querySelector('#treeView');
    if (!treeView || !this.currentData) return;

    // Group records by certType
    const grouped: Record<string, Record<string, SeloRecord[]>> = {};
    
    this.currentData.items.forEach(record => {
      if (!grouped[record.certType]) {
        grouped[record.certType] = {};
      }
      if (!grouped[record.certType][record.status]) {
        grouped[record.certType][record.status] = [];
      }
      grouped[record.certType][record.status].push(record);
    });

    // Build tree HTML
    let treeHTML = '<div class="selo-panel-tree-container">';
    
    Object.entries(grouped).forEach(([certType, statusGroups]) => {
      const certTypeLabel = this.getCertTypeLabel(certType as any);
      const count = Object.values(statusGroups).reduce((sum, arr) => sum + arr.length, 0);
      
      treeHTML += `
        <details class="selo-tree-node" open>
          <summary class="selo-tree-summary">
            <span>📁 ${certTypeLabel}</span>
            <span class="selo-tree-count">(${count})</span>
          </summary>
          <div class="selo-tree-children">
      `;
      
      Object.entries(statusGroups).forEach(([status, records]) => {
        const statusLabel = this.getStatusLabel(status as any);
        
        treeHTML += `
          <details class="selo-tree-node">
            <summary class="selo-tree-summary">
              <span>${statusLabel}</span>
              <span class="selo-tree-count">(${records.length})</span>
            </summary>
            <div class="selo-tree-children">
        `;
        
        records.forEach(record => {
          treeHTML += `
            <div class="selo-tree-item" data-id="${record.id}">
              <span>${record.nomeRegistrado}</span>
              <small>${new Date(record.createdAt).toLocaleDateString('pt-BR')}</small>
            </div>
          `;
        });
        
        treeHTML += `
            </div>
          </details>
        `;
      });
      
      treeHTML += `
          </div>
        </details>
      `;
    });
    
    treeHTML += '</div>';
    
    treeView.innerHTML = treeHTML;

    // Bind click events
    const items = treeView.querySelectorAll('.selo-tree-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        const record = this.currentData?.items.find(r => r.id === id);
        if (record) {
          this.selectRecord(record);
        }
      });
    });
  }

  /**
   * Render table view - displays records in table format with columns:
   * Data, Hora, Nº Guia, Nº Selo, Chave Pública, Usuário
   */
  private renderTableView(): void {
    const tableBody = this.panelElement?.querySelector('#tableBody') as HTMLTableSectionElement;
    if (!tableBody || !this.currentData) return;

    if (this.currentData.items.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="selo-table-empty">Nenhum resultado encontrado</td></tr>';
      return;
    }

    let tableHTML = '';
    this.currentData.items.forEach(record => {
      const createdAt = new Date(record.createdAt);
      const data = createdAt.toLocaleDateString('pt-BR');
      const hora = createdAt.toLocaleTimeString('pt-BR');
      const numGuia = record.numGuia ? record.numGuia : '—';
      const chavePublica = record.numChavePublica?.slice(0, 6) || '—';
      
      tableHTML += `
        <tr class="selo-table-row" data-id="${record.id}" data-status="${record.status}">
          <td>${data}</td>
          <td>${hora}</td>
          <td>${numGuia}</td>
          <td>${record.numSelo || '—'}</td>
          <td><strong>${chavePublica}</strong></td>
          <td>${record.nomeSolicitante || '—'}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = tableHTML;

    // Bind row click events
    const rows = tableBody.querySelectorAll('.selo-table-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        const record = this.currentData?.items.find(r => r.id === id);
        if (record) {
          this.selectRecord(record);
        }
      });
    });
  }

  /**
   * Render detail view for selected record
   */
  private renderDetailView(record: SeloRecord): void {
    const detailView = this.panelElement?.querySelector('#detailView');
    if (!detailView) return;

    detailView.innerHTML = `
      <div class="selo-detail-header">
        <button id="backToListBtn" class="selo-panel-btn-secondary">← Voltar</button>
        <h3>Detalhes do Selo</h3>
      </div>
      
      <div class="selo-detail-content">
        <div class="selo-detail-section">
          <h4>Informações Básicas</h4>
          <p><strong>Nome Registrado:</strong> ${record.nomeRegistrado}</p>
          ${record.nomeConjuge ? `<p><strong>Cônjuge:</strong> ${record.nomeConjuge}</p>` : ''}
          <p><strong>Solicitante:</strong> ${record.nomeSolicitante}</p>
          <p><strong>Tipo:</strong> ${this.getCertTypeLabel(record.certType)}</p>
          <p><strong>Matrícula:</strong> ${record.matricula}</p>
          <p><strong>Cartório:</strong> ${record.codCartorio}</p>
        </div>
        
        <div class="selo-detail-section">
          <h4>Dados do Selo</h4>
          <p><strong>Status:</strong> <span class="selo-status-${record.status}">${this.getStatusLabel(record.status)}</span></p>
          ${record.numSelo ? `<p><strong>Número do Selo:</strong> ${record.numSelo}</p>` : ''}
          <p><strong>Controle:</strong> ${record.nrControleSelo}</p>
          ${record.numChavePublica ? `<p><strong>Chave Pública:</strong> ${record.numChavePublica}</p>` : ''}
          <p><strong>Taxa:</strong> ${record.codTaxa}</p>
          ${record.numGuia ? `<p><strong>Nº Guia:</strong> ${record.numGuia}</p>` : ''}
          ${record.codIsencao ? `<p><strong>Código Isenção:</strong> ${record.codIsencao}</p>` : ''}
        </div>
        
        <div class="selo-detail-section">
          <h4>Datas</h4>
          <p><strong>Criado em:</strong> ${new Date(record.createdAt).toLocaleString('pt-BR')}</p>
          ${record.dataAplicacao ? `<p><strong>Aplicado em:</strong> ${new Date(record.dataAplicacao).toLocaleString('pt-BR')}</p>` : ''}
        </div>
        
        ${record.erro ? `
          <div class="selo-detail-section selo-detail-error">
            <h4>Erro</h4>
            <p>${record.erro}</p>
          </div>
        ` : ''}
        
        <div class="selo-detail-actions">
          ${record.numSelo ? `
            <button id="viewImageBtn" class="selo-panel-btn-primary">Ver Imagem do Selo</button>
            <button id="downloadImageBtn" class="selo-panel-btn-secondary">Baixar Imagem</button>
          ` : ''}
          ${record.status === 'failed' ? `
            <button id="retryBtn" class="selo-panel-btn-primary">Tentar Novamente</button>
          ` : ''}
          ${record.status === 'generated' ? `
            <button id="markAppliedBtn" class="selo-panel-btn-primary">Marcar como Aplicado</button>
          ` : ''}
          <button id="cancelSealBtn" class="selo-panel-btn-danger">Cancelar Selo</button>
        </div>
      </div>
    `;

    // Bind action buttons
    const backBtn = detailView.querySelector('#backToListBtn');
    backBtn?.addEventListener('click', () => this.switchView('table'));

    const viewImageBtn = detailView.querySelector('#viewImageBtn');
    viewImageBtn?.addEventListener('click', () => this.viewSealImage(record));

    const downloadImageBtn = detailView.querySelector('#downloadImageBtn');
    downloadImageBtn?.addEventListener('click', () => this.downloadSealImage(record));

    const retryBtn = detailView.querySelector('#retryBtn');
    retryBtn?.addEventListener('click', () => this.retrySeal(record));

    const markAppliedBtn = detailView.querySelector('#markAppliedBtn');
    markAppliedBtn?.addEventListener('click', () => this.markAsApplied(record));

    const cancelBtn = detailView.querySelector('#cancelSealBtn');
    cancelBtn?.addEventListener('click', () => this.cancelSeal(record));
  }

  /**
   * Select record and show detail view
   */
  private selectRecord(record: SeloRecord): void {
    this.selectedRecord = record;
    this.switchView('detail');
  }

  /**
   * Perform search
   */
  private performSearch(): void {
    const searchInput = this.panelElement?.querySelector('#searchInput') as HTMLInputElement;
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) {
      this.clearFilters();
      return;
    }

    // Try search by name first
    this.currentFilter = { nomeRegistrado: query };
    this.currentPage = 1;
    this.loadData();
  }

  /**
   * Apply filters
   */
  private applyFilters(): void {
    const certTypeSelect = this.panelElement?.querySelector('#filterCertType') as HTMLSelectElement;
    const statusSelect = this.panelElement?.querySelector('#filterStatus') as HTMLSelectElement;
    const dataInicioInput = this.panelElement?.querySelector('#filterDataInicio') as HTMLInputElement;
    const dataFimInput = this.panelElement?.querySelector('#filterDataFim') as HTMLInputElement;

    this.currentFilter = {};

    if (certTypeSelect?.value) {
      this.currentFilter.certType = certTypeSelect.value as any;
    }
    if (statusSelect?.value) {
      this.currentFilter.status = statusSelect.value as any;
    }
    if (dataInicioInput?.value) {
      this.currentFilter.dataInicio = dataInicioInput.value;
    }
    if (dataFimInput?.value) {
      this.currentFilter.dataFim = dataFimInput.value;
    }

    this.currentPage = 1;
    this.loadData();
  }

  /**
   * Clear filters
   */
  private clearFilters(): void {
    this.currentFilter = {};
    this.currentPage = 1;
    
    // Reset form
    const certTypeSelect = this.panelElement?.querySelector('#filterCertType') as HTMLSelectElement;
    const statusSelect = this.panelElement?.querySelector('#filterStatus') as HTMLSelectElement;
    const dataInicioInput = this.panelElement?.querySelector('#filterDataInicio') as HTMLInputElement;
    const dataFimInput = this.panelElement?.querySelector('#filterDataFim') as HTMLInputElement;
    const searchInput = this.panelElement?.querySelector('#searchInput') as HTMLInputElement;

    if (certTypeSelect) certTypeSelect.value = '';
    if (statusSelect) statusSelect.value = '';
    if (dataInicioInput) dataInicioInput.value = '';
    if (dataFimInput) dataFimInput.value = '';
    if (searchInput) searchInput.value = '';

    this.loadData();
  }

  /**
   * Update pagination controls
   */
  private updatePagination(): void {
    if (!this.currentData) return;

    const prevBtn = this.panelElement?.querySelector('#prevPageBtn') as HTMLButtonElement;
    const nextBtn = this.panelElement?.querySelector('#nextPageBtn') as HTMLButtonElement;
    const pageInfo = this.panelElement?.querySelector('#pageInfo');

    if (prevBtn) prevBtn.disabled = this.currentPage === 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= this.currentData.totalPages;
    if (pageInfo) {
      pageInfo.textContent = `Página ${this.currentPage} de ${this.currentData.totalPages} (${this.currentData.total} total)`;
    }
  }

  /**
   * Go to previous page
   */
  private goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadData();
    }
  }

  /**
   * Go to next page
   */
  private goToNextPage(): void {
    if (this.currentData && this.currentPage < this.currentData.totalPages) {
      this.currentPage++;
      this.loadData();
    }
  }

  /**
   * Load statistics
   */
  private loadStats(): void {
    const statsInfo = this.panelElement?.querySelector('#statsInfo');
    if (!statsInfo) return;

    const stats = this.controller.getHistoryStats();
    
    statsInfo.innerHTML = `
      <small>
        Total: ${stats.totalRecords} | 
        Gerados: ${stats.byStatus.generated || 0} | 
        Aplicados: ${stats.byStatus.applied || 0} | 
        Falhas: ${stats.byStatus.failed || 0}
      </small>
    `;
  }

  /**
   * View seal image in modal/popup
   */
  private async viewSealImage(record: SeloRecord): Promise<void> {
    if (!record.numSelo) return;

    try {
      const imageDataUrl = await this.controller.getImageDataUrl(record.numSelo);
      
      // Create popup window
      const popup = window.open('', '_blank', 'width=600,height=700');
      if (popup) {
        popup.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Selo Digital - ${record.numSelo}</title>
            <style>
              body { margin: 0; padding: 20px; text-align: center; font-family: sans-serif; }
              img { max-width: 100%; border: 1px solid #ccc; }
            </style>
          </head>
          <body>
            <h2>Selo Digital TJSE</h2>
            <p><strong>Número:</strong> ${record.numSelo}</p>
            <img src="${imageDataUrl}" alt="Selo Digital">
          </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('[SeloPanel] Error viewing image:', error);
      alert('Falha ao carregar imagem do selo');
    }
  }

  /**
   * Download seal image
   */
  private async downloadSealImage(record: SeloRecord): Promise<void> {
    if (!record.numSelo) return;

    try {
      await this.controller.downloadSealImage(record.numSelo, `selo_${record.numSelo}.png`);
    } catch (error) {
      console.error('[SeloPanel] Error downloading image:', error);
      alert('Falha ao baixar imagem do selo');
    }
  }

  /**
   * Retry failed seal
   */
  private retrySeal(record: SeloRecord): void {
    // TODO: Implement retry logic
    alert('Funcionalidade de retry ainda não implementada');
  }

  /**
   * Mark seal as applied
   */
  private markAsApplied(record: SeloRecord): void {
    const updated = this.controller.markSealApplied(record.id);
    if (updated) {
      this.selectedRecord = updated;
      this.renderDetailView(updated);
      this.loadData();
      this.loadStats();
    }
  }

  /**
   * Cancel seal
   */
  private cancelSeal(record: SeloRecord): void {
    if (!confirm('Deseja realmente cancelar este selo?')) return;

    const updated = this.controller.cancelSeal(record.id);
    if (updated) {
      this.selectedRecord = updated;
      this.renderDetailView(updated);
      this.loadData();
      this.loadStats();
    }
  }

  /**
   * Start resize
   */
  private startResize(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartWidth = this.panelElement?.offsetWidth || this.options.width;

    document.addEventListener('mousemove', this.onResize);
    document.addEventListener('mouseup', this.stopResize);
    
    e.preventDefault();
  }

  /**
   * Handle resize
   */
  private onResize = (e: MouseEvent): void => {
    if (!this.isDragging || !this.panelElement) return;

    const delta = this.options.position === 'right' 
      ? this.dragStartX - e.clientX 
      : e.clientX - this.dragStartX;
    
    let newWidth = this.dragStartWidth + delta;
    
    // Apply min/max constraints
    newWidth = Math.max(this.options.minWidth, Math.min(this.options.maxWidth, newWidth));
    
    this.panelElement.style.width = `${newWidth}px`;
  };

  /**
   * Stop resize
   */
  private stopResize = (): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.stopResize);
  };

  /**
   * Subscribe to controller state changes
   */
  private subscribeToControllerUpdates(): void {
    this.controller.onStateChange((state) => {
      if (state.currentState === 'success' && this.isOpen) {
        // Reload data when new seal generated
        this.loadData();
        this.loadStats();
      }
    });
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = window.setInterval(() => {
      if (this.isOpen) {
        this.loadData();
        this.loadStats();
      }
    }, this.options.refreshInterval);
  }

  /**
   * Stop auto-refresh timer
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Get certificate type label
   */
  private getCertTypeLabel(certType: string): string {
    const labels: Record<string, string> = {
      nascimento: 'Nascimento',
      casamento: 'Casamento',
      obito: 'Óbito'
    };
    return labels[certType] || certType;
  }

  /**
   * Get status label
   */
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      generated: 'Gerado',
      applied: 'Aplicado',
      failed: 'Falhou',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  }

  /**
   * Destroy panel
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.toggleButton?.remove();
    this.panelElement?.remove();
    this.toggleButton = null;
    this.panelElement = null;
  }
}

/**
 * Factory function - create and return panel instance
 */
export function createSeloPanel(options?: PanelOptions): SeloPanel {
  return new SeloPanel(options);
}

