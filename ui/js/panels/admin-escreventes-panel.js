// src/shared/admin/escrevente.schema.ts
function validateCPF(cpf) {
  if (!cpf) return true;
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - sum % 11;
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - sum % 11;
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  return true;
}
function formatCPF(cpf) {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
function sanitizeCPF(cpf) {
  return cpf ? cpf.replace(/\D/g, "") : "";
}

// src/ui/panels/admin-escreventes-client.ts
var EscreventesClient = class {
  /**
   * Busca escreventes com paginação e filtros
   */
  async search(filters) {
    try {
      const result = await window.api.invoke("escreventes:search", filters);
      return result;
    } catch (error) {
      console.error("[EscreventesClient] Erro ao buscar:", error);
      throw new Error("Erro ao buscar escreventes. Verifique o console.");
    }
  }
  /**
   * Busca escrevente por ID
   */
  async getById(id) {
    try {
      const result = await window.api.invoke("escreventes:getById", id);
      return result;
    } catch (error) {
      console.error("[EscreventesClient] Erro ao buscar por ID:", error);
      throw new Error("Erro ao buscar escrevente. Verifique o console.");
    }
  }
  /**
   * Cria novo escrevente
   */
  async create(dto) {
    try {
      const result = await window.api.invoke("escreventes:create", dto);
      return result;
    } catch (error) {
      console.error("[EscreventesClient] Erro ao criar:", error);
      throw new Error(
        error instanceof Error ? error.message : "Erro ao criar escrevente"
      );
    }
  }
  /**
   * Atualiza escrevente existente
   */
  async update(id, dto) {
    try {
      const result = await window.api.invoke("escreventes:update", { id, dto });
      return result;
    } catch (error) {
      console.error("[EscreventesClient] Erro ao atualizar:", error);
      throw new Error(
        error instanceof Error ? error.message : "Erro ao atualizar escrevente"
      );
    }
  }
  /**
   * Exclui escrevente
   */
  async delete(id) {
    try {
      await window.api.invoke("escreventes:delete", id);
    } catch (error) {
      console.error("[EscreventesClient] Erro ao excluir:", error);
      throw new Error(
        error instanceof Error ? error.message : "Erro ao excluir escrevente"
      );
    }
  }
  /**
   * Lista todos escreventes ativos (para dropdowns)
   */
  async listActive() {
    try {
      const result = await window.api.invoke("escreventes:listActive");
      return result;
    } catch (error) {
      console.error("[EscreventesClient] Erro ao listar ativos:", error);
      throw new Error("Erro ao listar escreventes ativos.");
    }
  }
};
var clientInstance = null;
function getEscreventesClient() {
  if (!clientInstance) {
    clientInstance = new EscreventesClient();
  }
  return clientInstance;
}

// src/ui/panels/admin-escreventes-panel.ts
var client = getEscreventesClient();
var state = {
  escreventes: [],
  filteredEscreventes: [],
  currentPage: 1,
  pageSize: 20,
  searchQuery: "",
  filterCartorio: "",
  filterAtivo: "all",
  editingId: null
};
async function initAdminEscreventes() {
  console.log("[AdminEscreventes] Inicializando painel...");
  await reloadEscreventes();
  renderPanel();
  setupEventListeners();
}
async function reloadEscreventes() {
  try {
    const result = await client.search({
      offset: 0,
      limit: 1e3
      // Carrega todos para cache local
    });
    state.escreventes = result;
    applyFilters();
  } catch (error) {
    console.error("[AdminEscreventes] Erro ao carregar:", error);
    showToast("Erro ao carregar escreventes", "error");
  }
}
function applyFilters() {
  let filtered = [...state.escreventes];
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (e) => {
        var _a, _b;
        return e.nome.toLowerCase().includes(query) || ((_a = e.cpf) == null ? void 0 : _a.includes(query)) || ((_b = e.matriculaInterna) == null ? void 0 : _b.toLowerCase().includes(query));
      }
    );
  }
  if (state.filterCartorio) {
    filtered = filtered.filter((e) => e.cartorioId === state.filterCartorio);
  }
  if (state.filterAtivo !== "all") {
    const ativo = state.filterAtivo === "ativo";
    filtered = filtered.filter((e) => e.ativo === ativo);
  }
  state.filteredEscreventes = filtered;
  state.currentPage = 1;
  renderTable();
  renderPagination();
}
function renderPanel() {
  const container = document.getElementById("admin-escreventes-panel");
  if (!container) {
    console.error("[AdminEscreventes] Container n\xE3o encontrado");
    return;
  }
  container.innerHTML = `
    <div class="admin-escreventes">
      <div class="admin-header">
        <h2>Administra\xE7\xE3o de Escreventes</h2>
        <button id="btn-new-escrevente" class="btn-primary">
          <span>\u2795</span> Novo Escrevente
        </button>
      </div>

      <div class="admin-filters">
        <input 
          type="text" 
          id="search-escrevente" 
          placeholder="Buscar por nome, CPF ou matr\xEDcula..."
          class="search-input"
        />
        
        <select id="filter-cartorio" class="filter-select">
          <option value="">Todos os cart\xF3rios</option>
        </select>
        
        <select id="filter-ativo" class="filter-select">
          <option value="all">Todos</option>
          <option value="ativo">Somente ativos</option>
          <option value="inativo">Somente inativos</option>
        </select>

        <button id="btn-reload" class="btn-secondary" title="Recarregar">
          \u{1F504}
        </button>
      </div>

      <div id="escreventes-table-container" class="table-container">
        <!-- Tabela ser\xE1 renderizada aqui -->
      </div>

      <div id="pagination-container" class="pagination">
        <!-- Pagina\xE7\xE3o ser\xE1 renderizada aqui -->
      </div>

      <!-- Modal de edi\xE7\xE3o -->
      <div id="modal-escrevente" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title">Novo Escrevente</h3>
            <button id="modal-close" class="btn-close">\xD7</button>
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
                  <label for="input-matricula">Matr\xEDcula Interna</label>
                  <input type="text" id="input-matricula" maxlength="50" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="input-cartorio">Cart\xF3rio *</label>
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
                    <option value="NOT\xC1RIO">Not\xE1rio</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="input-funcao">Fun\xE7\xE3o/Descri\xE7\xE3o</label>
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
function renderTable() {
  const container = document.getElementById("escreventes-table-container");
  if (!container) return;
  const startIdx = (state.currentPage - 1) * state.pageSize;
  const endIdx = startIdx + state.pageSize;
  const pageItems = state.filteredEscreventes.slice(startIdx, endIdx);
  if (pageItems.length === 0) {
    container.innerHTML = '<p class="no-data">Nenhum escrevente encontrado</p>';
    return;
  }
  const rows = pageItems.map((e) => `
    <tr data-id="${e.id}">
      <td>${escapeHtml(e.nome)}</td>
      <td>${e.cpf ? formatCPF(e.cpf) : "-"}</td>
      <td>${escapeHtml(e.matriculaInterna || "-")}</td>
      <td>${escapeHtml(e.cargo)}</td>
      <td>
        <span class="status-badge ${e.ativo ? "active" : "inactive"}">
          ${e.ativo ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td class="actions">
        <button class="btn-icon btn-edit" data-id="${e.id}" title="Editar">\u270F\uFE0F</button>
        <button class="btn-icon btn-delete" data-id="${e.id}" title="Excluir">\u{1F5D1}\uFE0F</button>
      </td>
    </tr>
  `).join("");
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>CPF</th>
          <th>Matr\xEDcula</th>
          <th>Cargo</th>
          <th>Status</th>
          <th>A\xE7\xF5es</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}
function renderPagination() {
  const container = document.getElementById("pagination-container");
  if (!container) return;
  const totalPages = Math.ceil(state.filteredEscreventes.length / state.pageSize);
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || i >= state.currentPage - 2 && i <= state.currentPage + 2) {
      pages.push(`
        <button 
          class="page-btn ${i === state.currentPage ? "active" : ""}" 
          data-page="${i}"
        >
          ${i}
        </button>
      `);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push('<span class="page-ellipsis">...</span>');
    }
  }
  container.innerHTML = `
    <button class="page-btn" data-page="${state.currentPage - 1}" ${state.currentPage === 1 ? "disabled" : ""}>
      \u2039 Anterior
    </button>
    ${pages.join("")}
    <button class="page-btn" data-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? "disabled" : ""}>
      Pr\xF3xima \u203A
    </button>
    <span class="page-info">
      ${state.filteredEscreventes.length} escrevente(s) encontrado(s)
    </span>
  `;
}
async function populateCartorioSelects() {
  const cartoriosMock = [
    { id: "001", nome: "Cart\xF3rio 1\xBA Of\xEDcio" },
    { id: "002", nome: "Cart\xF3rio 2\xBA Of\xEDcio" }
  ];
  const filterSelect = document.getElementById("filter-cartorio");
  const inputSelect = document.getElementById("input-cartorio");
  if (filterSelect) {
    cartoriosMock.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome;
      filterSelect.appendChild(opt);
    });
  }
  if (inputSelect) {
    cartoriosMock.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome;
      inputSelect.appendChild(opt);
    });
  }
}
function setupEventListeners() {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  (_a = document.getElementById("btn-new-escrevente")) == null ? void 0 : _a.addEventListener("click", () => {
    openModal(null);
  });
  (_b = document.getElementById("search-escrevente")) == null ? void 0 : _b.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    applyFilters();
  });
  (_c = document.getElementById("filter-cartorio")) == null ? void 0 : _c.addEventListener("change", (e) => {
    state.filterCartorio = e.target.value;
    applyFilters();
  });
  (_d = document.getElementById("filter-ativo")) == null ? void 0 : _d.addEventListener("change", (e) => {
    state.filterAtivo = e.target.value;
    applyFilters();
  });
  (_e = document.getElementById("btn-reload")) == null ? void 0 : _e.addEventListener("click", async () => {
    await reloadEscreventes();
    showToast("Lista atualizada", "success");
  });
  (_f = document.getElementById("pagination-container")) == null ? void 0 : _f.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("page-btn") && !target.hasAttribute("disabled")) {
      const page = parseInt(target.dataset.page || "1");
      state.currentPage = page;
      renderTable();
      renderPagination();
    }
  });
  (_g = document.getElementById("escreventes-table-container")) == null ? void 0 : _g.addEventListener("click", async (e) => {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;
    if (target.classList.contains("btn-edit")) {
      const escrevente = state.escreventes.find((e2) => e2.id === id);
      if (escrevente) {
        openModal(escrevente);
      }
    } else if (target.classList.contains("btn-delete")) {
      if (confirm("Deseja realmente excluir este escrevente?")) {
        await deleteEscrevente(id);
      }
    }
  });
  (_h = document.getElementById("modal-close")) == null ? void 0 : _h.addEventListener("click", closeModal);
  (_i = document.getElementById("btn-cancel")) == null ? void 0 : _i.addEventListener("click", closeModal);
  (_j = document.getElementById("form-escrevente")) == null ? void 0 : _j.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveEscrevente();
  });
  (_k = document.getElementById("input-cpf")) == null ? void 0 : _k.addEventListener("input", (e) => {
    const input = e.target;
    let value = input.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length >= 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
    } else if (value.length >= 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
    } else if (value.length >= 3) {
      value = value.replace(/(\d{3})(\d{0,3})/, "$1.$2");
    }
    input.value = value;
  });
}
function openModal(escrevente) {
  const modal = document.getElementById("modal-escrevente");
  const title = document.getElementById("modal-title");
  const form = document.getElementById("form-escrevente");
  if (!modal || !title || !form) return;
  state.editingId = (escrevente == null ? void 0 : escrevente.id) || null;
  title.textContent = escrevente ? "Editar Escrevente" : "Novo Escrevente";
  if (escrevente) {
    document.getElementById("input-nome").value = escrevente.nome;
    document.getElementById("input-cpf").value = escrevente.cpf ? formatCPF(escrevente.cpf) : "";
    document.getElementById("input-matricula").value = escrevente.matriculaInterna || "";
    document.getElementById("input-cartorio").value = escrevente.cartorioId;
    document.getElementById("input-cargo").value = escrevente.cargo;
    document.getElementById("input-funcao").value = escrevente.funcao || "";
    document.getElementById("input-ativo").checked = escrevente.ativo;
  } else {
    form.reset();
  }
  hideFormErrors();
  modal.style.display = "flex";
}
function closeModal() {
  const modal = document.getElementById("modal-escrevente");
  if (modal) {
    modal.style.display = "none";
  }
  state.editingId = null;
}
async function saveEscrevente() {
  const nome = document.getElementById("input-nome").value.trim();
  const cpf = sanitizeCPF(document.getElementById("input-cpf").value);
  const matriculaInterna = document.getElementById("input-matricula").value.trim();
  const cartorioId = document.getElementById("input-cartorio").value;
  const cargo = document.getElementById("input-cargo").value;
  const funcao = document.getElementById("input-funcao").value.trim();
  const ativo = document.getElementById("input-ativo").checked;
  const errors = [];
  if (!nome || nome.length < 3) {
    errors.push("Nome deve ter no m\xEDnimo 3 caracteres");
  }
  if (cpf && !validateCPF(cpf)) {
    errors.push("CPF inv\xE1lido");
  }
  if (!cartorioId) {
    errors.push("Cart\xF3rio \xE9 obrigat\xF3rio");
  }
  if (errors.length > 0) {
    showFormErrors(errors);
    return;
  }
  try {
    if (state.editingId) {
      const data = {
        nome,
        cpf: cpf || void 0,
        matriculaInterna: matriculaInterna || void 0,
        cartorioId,
        cargo,
        funcao: funcao || void 0,
        ativo
      };
      await client.update(state.editingId, data);
      showToast("Escrevente atualizado com sucesso", "success");
    } else {
      const data = {
        nome,
        cpf: cpf || void 0,
        matriculaInterna: matriculaInterna || void 0,
        cartorioId,
        cargo,
        funcao: funcao || void 0,
        ativo
      };
      await client.create(data);
      showToast("Escrevente criado com sucesso", "success");
    }
    closeModal();
    await reloadEscreventes();
  } catch (error) {
    showFormErrors([error.message || "Erro ao salvar escrevente"]);
  }
}
async function deleteEscrevente(id) {
  try {
    await client.delete(id);
    showToast("Escrevente exclu\xEDdo com sucesso", "success");
    await reloadEscreventes();
  } catch (error) {
    showToast(error.message || "Erro ao excluir escrevente", "error");
  }
}
function showFormErrors(errors) {
  const container = document.getElementById("form-errors");
  if (!container) return;
  container.innerHTML = `
    <ul>
      ${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}
    </ul>
  `;
  container.style.display = "block";
}
function hideFormErrors() {
  const container = document.getElementById("form-errors");
  if (container) {
    container.style.display = "none";
  }
}
function showToast(message, type) {
  console.log(`[Toast ${type}] ${message}`);
  alert(message);
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
export {
  initAdminEscreventes
};
