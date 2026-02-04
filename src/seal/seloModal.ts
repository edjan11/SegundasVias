/**
 * seloModal.ts
 * 
 * Modal UI Component for Seal Generation
 * Collects user input, validates data, displays results
 * 
 * Features:
 * - 3 radio button paths: sem-selo, com-guia, com-isencao
 * - Dynamic field generation based on modelo
 * - Real-time validation
 * - Loading states
 * - Success/error feedback
 * - Seal image preview
 */

import type { 
  SeloPath, 
  SeloBaseParams, 
  SeloSemGuiaParams, 
  SeloComGuiaParams, 
  SeloComIsencaoParams,
  SeloOperationResult
} from './seloController';
import type { TaxaInfo, VariavelModelo } from './types';
import { getSeloController } from './seloController';
import './seloModal.css';

const SELO_MODAL_STYLE_ID = 'selo-modal-inline-style';
const SELO_MODAL_FALLBACK_CSS = `
.selo-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:12000;opacity:0;pointer-events:none;transition:opacity .2s ease}
.selo-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.98);width:min(760px,96vw);max-height:90vh;display:flex;flex-direction:column;background:#fff;border:1px solid #d6dde8;border-radius:12px;box-shadow:0 18px 36px rgba(15,23,42,.22);overflow:hidden;z-index:12001;opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;font-family:"Segoe UI",Tahoma,sans-serif}
.selo-modal-overlay.active,.selo-modal.active{opacity:1;pointer-events:auto}
.selo-modal.active{transform:translate(-50%,-50%) scale(1)}
.selo-modal-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #d6dde8;background:#fff}
.selo-modal-header h2{margin:0;font-size:14px;font-weight:700;color:#1f2937}
.selo-modal-close{width:30px;height:30px;border:1px solid #d6dde8;border-radius:8px;background:#fff;color:#334155;cursor:pointer;font-size:18px;line-height:1}
.selo-modal-body{padding:12px;overflow:auto;display:grid;gap:10px;background:#f8fafc}
.selo-modal-info,.selo-modal-section,.selo-modal-result,.selo-modal-loading{border:1px solid #d6dde8;border-radius:10px;background:#fff;padding:10px}
.selo-modal-info p{margin:2px 0;font-size:12px;color:#334155}
.selo-modal-section h3{margin:0 0 8px;font-size:12px;color:#334155}
.selo-modal-paths{display:grid;gap:8px}
.selo-path-option{border:1px solid #e2e8f0;border-radius:8px;background:#fff;display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:start;padding:8px}
.selo-path-label{display:grid;gap:2px}
.selo-path-label strong{font-size:12px;color:#1f2937}
.selo-path-label small{font-size:11px;color:#64748b}
.selo-modal-select,.selo-modal-input,.selo-modal-file{width:100%;box-sizing:border-box;height:32px;border:1px solid #d6dde8;border-radius:8px;background:#f6f9ff;color:#1f2937;padding:5px 8px;font-size:12px;margin-top:4px}
.selo-modal-file{padding:4px;background:#fff}
.selo-modal-validation-result{margin-top:6px;font-size:11px}
.selo-modal-validation-result .success{color:#166534}
.selo-modal-validation-result .error{color:#b91c1c}
.selo-modal-loading{display:grid;place-items:center;gap:8px}
.selo-modal-spinner{width:28px;height:28px;border-radius:50%;border:3px solid #cbd5e1;border-top-color:#2563eb;animation:selo-spin .8s linear infinite}
@keyframes selo-spin{to{transform:rotate(360deg)}}
.selo-modal-result h3{margin:0 0 8px;font-size:13px}
.selo-result-info{display:grid;gap:4px;margin-bottom:10px}
.selo-result-info p{margin:0;font-size:11px;color:#334155}
.selo-result-image{border:1px dashed #cbd5e1;border-radius:8px;padding:8px;background:#fff;text-align:center}
.selo-modal-success{border-color:#86efac;background:#f0fdf4}
.selo-modal-error{border-color:#fca5a5;background:#fef2f2}
.selo-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #d6dde8;background:#fff}
.selo-modal-btn-primary,.selo-modal-btn-secondary{border:1px solid #d6dde8;border-radius:8px;height:30px;padding:0 10px;font-size:11px;font-weight:700;cursor:pointer}
.selo-modal-btn-primary{background:#2563eb;border-color:#1d4ed8;color:#fff}
.selo-modal-btn-secondary{background:#fff;color:#1f2937}
.selo-modal-btn-primary:disabled,.selo-modal-btn-secondary:disabled{opacity:.5;cursor:not-allowed}
`;

function ensureSeloModalStyles(doc: Document): void {
  if (doc.getElementById(SELO_MODAL_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = SELO_MODAL_STYLE_ID;
  style.textContent = SELO_MODAL_FALLBACK_CSS;
  doc.head?.appendChild(style);
}

/**
 * Modal initialization options
 */
export interface ModalOptions {
  certType: 'nascimento' | 'casamento' | 'obito';
  matricula: string;
  codCartorio: string;
  nomeRegistrado: string;
  nomeConjuge?: string;
  nomeSolicitante?: string;
  hostWindow?: Window;
  onSuccess?: (result: SeloOperationResult) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

/**
 * SeloModal - Main modal component
 */
export class SeloModal {
  private controller = getSeloController();
  private options: ModalOptions;
  private hostWindow: Window;
  
  // DOM elements
  private modalElement: HTMLDivElement | null = null;
  private overlayElement: HTMLDivElement | null = null;
  
  // State
  private selectedPath: SeloPath | null = null;
  private selectedTaxa: TaxaInfo | null = null;
  private modeloFields: VariavelModelo[] = [];
  private isLoading = false;

  constructor(options: ModalOptions) {
    this.options = options;
    this.hostWindow = options.hostWindow || window;
  }

  /**
   * Show modal
   */
  async show(): Promise<void> {
    ensureSeloModalStyles(this.hostWindow.document);

    // Create modal HTML
    this.createModalHTML();
    
    // Append to document
    if (this.overlayElement && this.modalElement) {
      this.hostWindow.document.body.appendChild(this.overlayElement);
      this.hostWindow.document.body.appendChild(this.modalElement);
    }


    // Bind events
    this.bindEvents();

    // Show with animation
    this.hostWindow.requestAnimationFrame(() => {
      if (this.overlayElement && this.modalElement) {
        this.overlayElement.classList.add('active');
        this.modalElement.classList.add('active');
      }
    });

    // Load taxas after modal becomes visible, avoiding no-feedback on slow network.
    void this.loadTaxas();
  }

  /**
   * Hide modal
   */
  hide(): void {
    if (this.overlayElement && this.modalElement) {
      this.overlayElement.classList.remove('active');
      this.modalElement.classList.remove('active');
      
      // Remove from DOM after animation
      this.hostWindow.setTimeout(() => {
        this.overlayElement?.remove();
        this.modalElement?.remove();
        this.overlayElement = null;
        this.modalElement = null;
      }, 300);
    }
  }

  /**
   * Create modal HTML structure
   */
  private createModalHTML(): void {
    const doc = this.hostWindow.document;

    // Overlay (darkened background)
    this.overlayElement = doc.createElement('div');
    this.overlayElement.className = 'selo-modal-overlay';
    
    // Modal container
    this.modalElement = doc.createElement('div');
    this.modalElement.className = 'selo-modal';
    this.modalElement.innerHTML = `
      <div class="selo-modal-header">
        <h2>Gerar Selo Digital TJSE</h2>
        <button class="selo-modal-close" type="button" aria-label="Fechar">&times;</button>
      </div>
      
      <div class="selo-modal-body">
        <!-- Document info -->
        <div class="selo-modal-info">
          <p><strong>Tipo:</strong> ${this.getCertTypeLabel()}</p>
          <p><strong>MatrÃ­cula:</strong> ${this.options.matricula}</p>
          <p><strong>CartÃ³rio:</strong> ${this.options.codCartorio}</p>
        </div>

        <!-- Path selection -->
        <div class="selo-modal-section">
          <h3>Selecione o tipo de selo:</h3>
          <div class="selo-modal-paths">
            <label class="selo-path-option">
              <input type="radio" name="seloPath" value="sem-selo">
              <div class="selo-path-label">
                <strong>Sem Guia</strong>
                <small>Gerar selo sem guia prÃ©-existente</small>
              </div>
            </label>
            
            <label class="selo-path-option">
              <input type="radio" name="seloPath" value="com-guia">
              <div class="selo-path-label">
                <strong>Com Guia</strong>
                <small>Usar guia de pagamento jÃ¡ paga</small>
              </div>
            </label>
            
            <label class="selo-path-option">
              <input type="radio" name="seloPath" value="com-isencao">
              <div class="selo-path-label">
                <strong>Com IsenÃ§Ã£o</strong>
                <small>Usar cÃ³digo de isenÃ§Ã£o + anexo PDF</small>
              </div>
            </label>
          </div>
        </div>

        <!-- Taxa selection -->
        <div class="selo-modal-section" id="taxaSection" style="display: none;">
          <label for="taxaSelect">
            <strong>Taxa:</strong>
            <select id="taxaSelect" class="selo-modal-select">
              <option value="">Carregando taxas...</option>
            </select>
          </label>
        </div>

        <!-- Guide number (com-guia path only) -->
        <div class="selo-modal-section" id="guiaSection" style="display: none;">
          <label for="numGuiaInput">
            <strong>NÃºmero da Guia:</strong>
            <input type="text" id="numGuiaInput" class="selo-modal-input" placeholder="Ex: 123456789">
          </label>
          <button type="button" id="validateGuiaBtn" class="selo-modal-btn-secondary">
            Validar Guia
          </button>
          <div id="guiaValidationResult" class="selo-modal-validation-result"></div>
        </div>

        <!-- Exemption code (com-isencao path only) -->
        <div class="selo-modal-section" id="isencaoSection" style="display: none;">
          <label for="codIsencaoSelect">
            <strong>Código de Isenção:</strong>
            <select id="codIsencaoSelect" class="selo-modal-select">
              <option value="">Selecione a isenção da taxa...</option>
            </select>
          </label>
          <div id="isencaoHint" class="selo-modal-validation-result"></div>
          
          <label for="pdfFileInput">
            <strong>Anexo PDF:</strong>
            <input type="file" id="pdfFileInput" accept="application/pdf" class="selo-modal-file">
            <small>MÃ¡ximo: 2MB</small>
          </label>
        </div>

        <!-- Requester name -->
        <div class="selo-modal-section" id="solicitanteSection" style="display: none;">
          <label for="nomeSolicitanteInput">
            <strong>Nome do Solicitante:</strong>
            <input 
              type="text" 
              id="nomeSolicitanteInput" 
              class="selo-modal-input" 
              placeholder="Nome completo"
              value="${this.options.nomeSolicitante || ''}">
          </label>
        </div>

        <!-- Dynamic modelo fields -->
        <div class="selo-modal-section" id="modeloFieldsSection" style="display: none;">
          <h3>Campos do Modelo:</h3>
          <div id="modeloFieldsContainer"></div>
        </div>

        <!-- Loading state -->
        <div class="selo-modal-loading" id="loadingState" style="display: none;">
          <div class="selo-modal-spinner"></div>
          <p>Gerando selo digital...</p>
        </div>

        <!-- Success result -->
        <div class="selo-modal-result selo-modal-success" id="successResult" style="display: none;">
          <h3>âœ“ Selo gerado com sucesso!</h3>
          <div class="selo-result-info">
            <p><strong>NÃºmero do Selo:</strong> <span id="resultNumSelo"></span></p>
            <p><strong>Controle:</strong> <span id="resultControleSelo"></span></p>
            <p><strong>Chave PÃºblica:</strong> <span id="resultChavePublica"></span></p>
          </div>
          <div class="selo-result-image">
            <img id="resultImage" alt="Selo Digital" style="max-width: 100%; border: 1px solid #ccc;">
          </div>
          <button type="button" id="downloadImageBtn" class="selo-modal-btn-secondary">
            Baixar Imagem do Selo
          </button>
        </div>

        <!-- Error result -->
        <div class="selo-modal-result selo-modal-error" id="errorResult" style="display: none;">
          <h3>âœ— Erro ao gerar selo</h3>
          <p id="errorMessage"></p>
        </div>
      </div>
      
      <div class="selo-modal-footer">
        <button type="button" id="cancelBtn" class="selo-modal-btn-secondary">Cancelar</button>
        <button type="button" id="submitBtn" class="selo-modal-btn-primary" disabled>Gerar Selo</button>
      </div>
    `;
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    if (!this.modalElement) return;

    // Close button
    const closeBtn = this.modalElement.querySelector('.selo-modal-close');
    closeBtn?.addEventListener('click', () => this.onCancel());

    // Cancel button
    const cancelBtn = this.modalElement.querySelector('#cancelBtn');
    cancelBtn?.addEventListener('click', () => this.onCancel());

    // Path selection
    const pathRadios = this.modalElement.querySelectorAll('input[name="seloPath"]');
    pathRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.onPathChange(target.value as SeloPath);
      });
    });

    // Taxa selection
    const taxaSelect = this.modalElement.querySelector('#taxaSelect') as HTMLSelectElement;
    taxaSelect?.addEventListener('change', () => this.onTaxaChange());

    const codIsencaoSelect = this.modalElement.querySelector('#codIsencaoSelect') as HTMLSelectElement;
    codIsencaoSelect?.addEventListener('change', () => this.updateSubmitButton());
    const pdfFileInput = this.modalElement.querySelector('#pdfFileInput') as HTMLInputElement;
    pdfFileInput?.addEventListener('change', () => this.updateSubmitButton());
    const numGuiaInput = this.modalElement.querySelector('#numGuiaInput') as HTMLInputElement;
    numGuiaInput?.addEventListener('input', () => this.updateSubmitButton());

    // Validate guia button
    const validateGuiaBtn = this.modalElement.querySelector('#validateGuiaBtn');
    validateGuiaBtn?.addEventListener('click', () => this.validateGuia());

    // Submit button
    const submitBtn = this.modalElement.querySelector('#submitBtn');
    submitBtn?.addEventListener('click', () => this.onSubmit());

    // Download image button
    const downloadImageBtn = this.modalElement.querySelector('#downloadImageBtn');
    downloadImageBtn?.addEventListener('click', () => this.downloadSealImage());

    // Overlay click (close modal)
    this.overlayElement?.addEventListener('click', () => this.onCancel());
  }

  /**
   * Load available taxas
   */
  private async loadTaxas(): Promise<void> {
    try {
      const taxas = await this.controller.getTaxasByCertType(
        this.options.codCartorio,
        this.options.certType
      );

      const taxaSelect = this.modalElement?.querySelector('#taxaSelect') as HTMLSelectElement;
      if (taxaSelect) {
        taxaSelect.innerHTML = '<option value="">Selecione uma taxa...</option>';
        taxas.forEach((taxa) => {
          const option = this.hostWindow.document.createElement('option');
          option.value = taxa.codTaxa.toString();
          const taxaLabel = String(taxa.nomeTaxa || taxa.descricao || `Taxa ${taxa.codTaxa}`).trim();
          const hasValor = Number.isFinite(Number(taxa.valor)) && Number(taxa.valor) > 0;
          option.textContent = hasValor
            ? `${taxa.codTaxa} - ${taxaLabel} - R$ ${Number(taxa.valor).toFixed(2)}`
            : `${taxa.codTaxa} - ${taxaLabel}`;
          option.dataset.taxa = JSON.stringify(taxa);
          taxaSelect.appendChild(option);
        });
        if (!taxas.length) {
          taxaSelect.innerHTML = '<option value="">Nenhuma taxa disponivel para este cartorio</option>';
        }
      }
    } catch (error) {
      console.error('[SeloModal] Error loading taxas:', error);
      this.showError('Falha ao carregar taxas disponiveis');
    }
  }

  private updateIsencaoOptions(): void {
    const isencaoSelect = this.modalElement?.querySelector('#codIsencaoSelect') as HTMLSelectElement;
    const hint = this.modalElement?.querySelector('#isencaoHint') as HTMLElement;
    if (!isencaoSelect) return;

    isencaoSelect.innerHTML = '<option value="">Selecione a isencao da taxa...</option>';
    if (hint) hint.innerHTML = '';

    const isencoes = Array.isArray(this.selectedTaxa?.isencoes) ? this.selectedTaxa!.isencoes! : [];
    isencoes.forEach((isencao) => {
      const option = this.hostWindow.document.createElement('option');
      option.value = String(isencao.codIsencao);
      option.textContent = `${isencao.codIsencao} - ${isencao.dsIsencao}`;
      option.dataset.temAnexo = isencao.temAnexo;
      isencaoSelect.appendChild(option);
    });

    if (!isencoes.length && hint) {
      hint.innerHTML = '<p class="error">A taxa selecionada nao retornou isencoes.</p>';
    }
  }

  private isAnexoObrigatorioParaIsencao(): boolean {
    const isencaoSelect = this.modalElement?.querySelector('#codIsencaoSelect') as HTMLSelectElement;
    if (!isencaoSelect) return true;
    const selected = isencaoSelect.selectedOptions?.[0];
    if (!selected || !selected.value) return true;
    return String(selected.dataset.temAnexo || 'sim').toLowerCase() === 'sim';
  }

  /**
   * Handle path change
   */
  private onPathChange(path: SeloPath): void {
    this.selectedPath = path;

    // Show/hide sections based on path
    const taxaSection = this.modalElement?.querySelector('#taxaSection') as HTMLElement;
    const guiaSection = this.modalElement?.querySelector('#guiaSection') as HTMLElement;
    const isencaoSection = this.modalElement?.querySelector('#isencaoSection') as HTMLElement;
    const solicitanteSection = this.modalElement?.querySelector('#solicitanteSection') as HTMLElement;

    if (taxaSection) taxaSection.style.display = 'block';
    if (solicitanteSection) solicitanteSection.style.display = 'block';

    if (guiaSection) guiaSection.style.display = path === 'com-guia' ? 'block' : 'none';
    if (isencaoSection) isencaoSection.style.display = path === 'com-isencao' ? 'block' : 'none';

    // Reset taxa selection
    this.selectedTaxa = null;
    this.modeloFields = [];
    this.updateIsencaoOptions();
    const modeloFieldsSection = this.modalElement?.querySelector('#modeloFieldsSection') as HTMLElement;
    if (modeloFieldsSection) modeloFieldsSection.style.display = 'none';

    this.updateSubmitButton();
  }

  /**
   * Handle taxa change
   */
  private async onTaxaChange(): Promise<void> {
    const taxaSelect = this.modalElement?.querySelector('#taxaSelect') as HTMLSelectElement;
    if (!taxaSelect) return;

    const selectedOption = taxaSelect.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) {
      this.selectedTaxa = null;
      this.modeloFields = [];
      this.updateIsencaoOptions();
      const modeloFieldsSection = this.modalElement?.querySelector('#modeloFieldsSection') as HTMLElement;
      if (modeloFieldsSection) modeloFieldsSection.style.display = 'none';
      this.updateSubmitButton();
      return;
    }

    this.selectedTaxa = JSON.parse(selectedOption.dataset.taxa || '{}');
    this.updateIsencaoOptions();

    // Load modelo fields
    try {
      this.modeloFields = await this.controller.getModelo(this.selectedTaxa.codTaxa.toString());
      this.renderModeloFields();
      this.updateSubmitButton();
    } catch (error) {
      console.error('[SeloModal] Error loading modelo:', error);
      this.showError('Falha ao carregar campos do modelo');
    }
  }

  /**
   * Render dynamic modelo fields
   */
  private renderModeloFields(): void {
    const container = this.modalElement?.querySelector('#modeloFieldsContainer');
    const section = this.modalElement?.querySelector('#modeloFieldsSection') as HTMLElement;
    
    if (!container || !section) return;

    container.innerHTML = '';

    if (this.modeloFields.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';

    this.modeloFields.forEach(field => {
      const fieldDiv = this.hostWindow.document.createElement('div');
      fieldDiv.className = 'selo-modal-field';

      const label = this.hostWindow.document.createElement('label');
      label.htmlFor = `campo_${field.nome}`;
      label.innerHTML = `<strong>${field.rotulo}:</strong>`;

      let input: HTMLInputElement | HTMLSelectElement;

      if (field.tipo === 'SELECT' && field.opcoes) {
        // Dropdown select
        input = this.hostWindow.document.createElement('select');
        input.className = 'selo-modal-select';
        
        const emptyOption = this.hostWindow.document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Selecione...';
        input.appendChild(emptyOption);

        field.opcoes.forEach(opcao => {
          const option = this.hostWindow.document.createElement('option');
          option.value = opcao.valor;
          option.textContent = opcao.rotulo;
          input.appendChild(option);
        });
      } else if (field.tipo === 'BOOLEAN') {
        // Checkbox
        input = this.hostWindow.document.createElement('input');
        input.type = 'checkbox';
        input.className = 'selo-modal-checkbox';
      } else {
        // Text input
        input = this.hostWindow.document.createElement('input');
        input.type = field.tipo === 'DATA' ? 'date' : 'text';
        input.className = 'selo-modal-input';
        input.placeholder = field.ajuda || '';
        
        if (field.tamanhoMaximo) {
          input.maxLength = field.tamanhoMaximo;
        }
      }

      input.id = `campo_${field.nome}`;
      input.dataset.fieldName = field.nome;
      input.required = field.obrigatorio;

      fieldDiv.appendChild(label);
      fieldDiv.appendChild(input);

      if (field.ajuda) {
        const hint = this.hostWindow.document.createElement('small');
        hint.textContent = `Dica: ${field.ajuda}`;
        fieldDiv.appendChild(hint);
      }

      container.appendChild(fieldDiv);
    });
  }

  /**
   * Validate guide (com-guia path)
   */
  private async validateGuia(): Promise<void> {
    const numGuiaInput = this.modalElement?.querySelector('#numGuiaInput') as HTMLInputElement;
    const resultDiv = this.modalElement?.querySelector('#guiaValidationResult') as HTMLElement;
    
    if (!numGuiaInput || !resultDiv) return;

    const numGuia = numGuiaInput.value.trim();
    if (!numGuia) {
      resultDiv.innerHTML = '<p class="error">Digite o nÃºmero da guia</p>';
      return;
    }

    resultDiv.innerHTML = '<p>Validando...</p>';

    try {
      const result = await this.controller.verificarGuiaPaga(numGuia, this.options.codCartorio);

      if (result && result.flgPago === 'paga') {
        const dadosGuia = await this.controller.consultarGuia(numGuia, this.options.codCartorio);
        const codTaxaGuia = (dadosGuia as any)?.codTaxa;
        if (codTaxaGuia) {
          const taxaSelect = this.modalElement?.querySelector('#taxaSelect') as HTMLSelectElement;
          const option = taxaSelect
            ? Array.from(taxaSelect.options).find((o) => String(o.value) === String(codTaxaGuia))
            : null;
          if (option && taxaSelect) {
            taxaSelect.value = String(codTaxaGuia);
            await this.onTaxaChange();
            resultDiv.innerHTML = `<p class="success">Guia valida e paga. Taxa ${codTaxaGuia} selecionada automaticamente.</p>`;
          } else {
            resultDiv.innerHTML = `<p class="success">Guia valida e paga. Taxa da guia: ${codTaxaGuia}.</p>`;
          }
        } else {
          resultDiv.innerHTML = '<p class="success">Guia valida e paga.</p>';
        }
      } else {
        resultDiv.innerHTML = '<p class="error">Guia nao encontrada ou nao paga</p>';
      }
    } catch (error) {
      resultDiv.innerHTML = '<p class="error">Erro ao validar guia</p>';
      console.error('[SeloModal] Error validating guide:', error);
    } finally {
      this.updateSubmitButton();
    }
  }

  /**
   * Update submit button state
   */
  private updateSubmitButton(): void {
    const submitBtn = this.modalElement?.querySelector('#submitBtn') as HTMLButtonElement;
    if (!submitBtn) return;

    let isValid = !!this.selectedPath && !!this.selectedTaxa;

    if (isValid && this.selectedPath === 'com-guia') {
      const numGuia = (this.modalElement?.querySelector('#numGuiaInput') as HTMLInputElement)?.value.trim() || '';
      isValid = !!numGuia;
    }

    if (isValid && this.selectedPath === 'com-isencao') {
      const codIsencao = (this.modalElement?.querySelector('#codIsencaoSelect') as HTMLSelectElement)?.value || '';
      if (!codIsencao) {
        isValid = false;
      } else {
        const pdfFileInput = this.modalElement?.querySelector('#pdfFileInput') as HTMLInputElement;
        isValid = !!pdfFileInput?.files?.[0];
      }
    }

    submitBtn.disabled = !isValid;
  }

  /**
   * Handle submit
   */
  private async onSubmit(): Promise<void> {
    if (!this.selectedPath || !this.selectedTaxa) return;

    // Collect form data
    const campos = this.collectCamposData();
    const nomeSolicitante = (this.modalElement?.querySelector('#nomeSolicitanteInput') as HTMLInputElement)?.value.trim() || this.options.nomeSolicitante || '';

    // Show loading state
    this.setLoadingState(true);

    try {
      let result: SeloOperationResult;

      if (this.selectedPath === 'sem-selo') {
        const params: SeloSemGuiaParams = {
          certType: this.options.certType,
          matricula: this.options.matricula,
          codCartorio: this.options.codCartorio,
          codTaxa: this.selectedTaxa.codTaxa.toString(),
          nomeRegistrado: this.options.nomeRegistrado,
          nomeConjuge: this.options.nomeConjuge,
          nomeSolicitante,
          campos
        };
        result = await this.controller.gerarSeloSemGuia(params);
      } else if (this.selectedPath === 'com-guia') {
        const numGuia = (this.modalElement?.querySelector('#numGuiaInput') as HTMLInputElement)?.value.trim() || '';
        const params: SeloComGuiaParams = {
          certType: this.options.certType,
          matricula: this.options.matricula,
          codCartorio: this.options.codCartorio,
          codTaxa: this.selectedTaxa.codTaxa.toString(),
          numGuia,
          nomeRegistrado: this.options.nomeRegistrado,
          nomeConjuge: this.options.nomeConjuge,
          nomeSolicitante,
          campos
        };
        result = await this.controller.gerarSeloComGuia(params);
      } else {
        const codIsencao = (this.modalElement?.querySelector('#codIsencaoSelect') as HTMLSelectElement)?.value.trim() || '';
        const pdfFileInput = this.modalElement?.querySelector('#pdfFileInput') as HTMLInputElement;
        const pdfFile = pdfFileInput?.files?.[0];

        if (!codIsencao) {
          throw new Error('Selecione um codigo de isencao');
        }

        if (!pdfFile) {
          throw new Error('Selecione um arquivo PDF');
        }

        const params: SeloComIsencaoParams = {
          certType: this.options.certType,
          matricula: this.options.matricula,
          codCartorio: this.options.codCartorio,
          codTaxa: this.selectedTaxa.codTaxa.toString(),
          codIsencao,
          pdfFile: pdfFile as File,
          nomeRegistrado: this.options.nomeRegistrado,
          nomeConjuge: this.options.nomeConjuge,
          nomeSolicitante,
          campos
        };
        result = await this.controller.gerarSeloComIsencao(params);
      }

      this.setLoadingState(false);

      if (result.success) {
        this.showSuccess(result);
        this.options.onSuccess?.(result);
      } else {
        this.showError(result.error || 'Erro desconhecido');
        this.options.onError?.(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      this.setLoadingState(false);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      this.showError(errorMsg);
      this.options.onError?.(errorMsg);
      console.error('[SeloModal] Submit error:', error);
    }
  }

  /**
   * Collect campos data from form
   */
  private collectCamposData(): Record<string, string> {
    const campos: Record<string, string> = {};
    const container = this.modalElement?.querySelector('#modeloFieldsContainer');
    if (!container) return campos;

    const inputs = container.querySelectorAll('input, select');
    inputs.forEach(input => {
      const htmlInput = input as HTMLInputElement | HTMLSelectElement;
      const fieldName = htmlInput.dataset.fieldName;
      if (!fieldName) return;

      if (htmlInput instanceof HTMLInputElement && htmlInput.type === 'checkbox') {
        campos[fieldName] = htmlInput.checked ? 'true' : 'false';
      } else {
        campos[fieldName] = htmlInput.value;
      }
    });

    return campos;
  }

  /**
   * Set loading state
   */
  private setLoadingState(loading: boolean): void {
    this.isLoading = loading;
    
    const loadingState = this.modalElement?.querySelector('#loadingState') as HTMLElement;
    const submitBtn = this.modalElement?.querySelector('#submitBtn') as HTMLButtonElement;
    
    if (loadingState) {
      loadingState.style.display = loading ? 'block' : 'none';
    }
    
    if (submitBtn) {
      submitBtn.disabled = loading;
    }
  }

  /**
   * Show success result
   */
  private showSuccess(result: SeloOperationResult): void {
    const successResult = this.modalElement?.querySelector('#successResult') as HTMLElement;
    if (!successResult || !result.seal) return;

    successResult.style.display = 'block';

    // Fill result data
    const numSeloSpan = successResult.querySelector('#resultNumSelo');
    const controleSeloSpan = successResult.querySelector('#resultControleSelo');
    const chavePublicaSpan = successResult.querySelector('#resultChavePublica');
    const resultImage = successResult.querySelector('#resultImage') as HTMLImageElement;

    if (numSeloSpan) numSeloSpan.textContent = result.seal.numSelo;
    if (controleSeloSpan) controleSeloSpan.textContent = result.seal.nrControleSelo;
    if (chavePublicaSpan) chavePublicaSpan.textContent = result.seal.numChavePublica;
    
    if (resultImage && result.imageDataUrl) {
      resultImage.src = result.imageDataUrl;
    }

    // Hide form sections
    this.hideFormSections();
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorResult = this.modalElement?.querySelector('#errorResult') as HTMLElement;
    const errorMessage = this.modalElement?.querySelector('#errorMessage');
    
    if (errorResult && errorMessage) {
      errorResult.style.display = 'block';
      errorMessage.textContent = message;
    }
  }

  /**
   * Hide form sections after success/error
   */
  private hideFormSections(): void {
    const sections = [
      '#taxaSection',
      '#guiaSection',
      '#isencaoSection',
      '#solicitanteSection',
      '#modeloFieldsSection'
    ];

    sections.forEach(selector => {
      const section = this.modalElement?.querySelector(selector) as HTMLElement;
      if (section) section.style.display = 'none';
    });
  }

  /**
   * Download seal image
   */
  private async downloadSealImage(): Promise<void> {
    const numSeloSpan = this.modalElement?.querySelector('#resultNumSelo');
    if (!numSeloSpan) return;

    const numSelo = numSeloSpan.textContent || '';
    try {
      await this.controller.downloadSealImage(numSelo, `selo_${numSelo}.png`);
    } catch (error) {
      console.error('[SeloModal] Error downloading image:', error);
      this.hostWindow.alert('Falha ao baixar imagem');
    }
  }

  /**
   * Handle cancel
   */
  private onCancel(): void {
    this.options.onCancel?.();
    this.hide();
  }

  /**
   * Get certificate type label
   */
  private getCertTypeLabel(): string {
    const labels = {
      nascimento: 'Nascimento',
      casamento: 'Casamento',
      obito: 'Ã“bito'
    };
    return labels[this.options.certType] || this.options.certType;
  }
}

/**
 * Factory function - create and show modal
 */
export async function showSeloModal(options: ModalOptions): Promise<SeloModal> {
  const modal = new SeloModal(options);
  await modal.show();
  return modal;
}


