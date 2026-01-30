// EXPERIMENTAL (isolated UI shell)
// Safe to remove: this file only mounts a UI shell and injects a tiny CSS file.
// Uses local JSON memory search only (no changes to 2a via logic).

type ChatSearchShellOptions = {
  enabledKey?: string;
  defaultEnabled?: boolean;
};

const DEFAULT_ENABLED_KEY = 'ui.chatSearch.enabled';
const ROOT_ID = 'chat-search-shell';
const STYLE_ID = 'chat-search-css';

import { createLocalSearchStore } from '../../shared/search/search-module';
import { applyCertificatePayloadToSecondCopy } from '../payload/apply-payload';

function resolveStylesHref(): string {
  const link = document.querySelector('link[href*="styles/"]') as HTMLLinkElement | null;
  if (link && link.href) {
    try {
      return new URL('chat-search.css', link.href).toString();
    } catch {
      // ignore
    }
  }
  return new URL('../styles/chat-search.css', window.location.href).toString();
}

function ensureChatSearchStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = resolveStylesHref();
  document.head.appendChild(link);
}

export function isChatSearchEnabled(
  opts: ChatSearchShellOptions = {},
): boolean {
  const key = opts.enabledKey || DEFAULT_ENABLED_KEY;
  const stored = localStorage.getItem(key);
  if (stored === null) return opts.defaultEnabled !== false;
  return stored !== 'false';
}

export function mountChatSearchShell(): HTMLElement | null {
  const existing = document.getElementById(ROOT_ID) as HTMLElement | null;
  if (existing) return existing;

  ensureChatSearchStyles();

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.className = 'chat-search-shell';
  root.setAttribute('data-open', '0');
  root.setAttribute('data-experimental', '1');
  root.setAttribute('data-panel', 'none');

  root.innerHTML = `
    <!-- EXPERIMENTAL / REMOVIVEL -->
    <div class="taskbar" role="region" aria-label="Barra de tarefas (experimental)">
      <div class="taskbar-left">
        <div class="taskbar-current" data-current>
          <span class="taskbar-current-label" data-current-label>SEM REGISTRO</span>
          <button class="taskbar-drop" type="button" data-tabs-toggle title="Abrir registros">&#9650;</button>
        </div>
        <div class="taskbar-tabs-dropdown" data-tabs-dropdown aria-hidden="true">
          <div class="taskbar-tabs-list" data-tabs-visible></div>
          <button class="taskbar-tabs-more btn tiny secondary" type="button" data-tabs-more>Ver mais</button>
          <div class="taskbar-tabs-list taskbar-tabs-history" data-tabs-history></div>
        </div>
      </div>
      <div class="taskbar-right">
        <button class="taskbar-icon" type="button" data-panel-toggle="search" title="Busca">&#128269;</button>
        <button class="taskbar-btn" type="button" data-include-toggle title="Registrar">Registrar</button>
        <div class="taskbar-include" data-include aria-hidden="true">
          <div class="segmented segmented--names" data-include-seg>
            <button type="button" data-open-act="nascimento">Nascimento</button>
            <button type="button" data-open-act="casamento">Casamento</button>
            <button type="button" data-open-act="obito">Obito</button>
          </div>
        </div>
        <div class="segmented taskbar-docs" data-docs-seg>
          <button type="button" data-action="json">J</button>
          <button type="button" data-action="xml">X</button>
          <button type="button" data-action="pdf">P</button>
        </div>
        <div class="taskbar-tray" data-tray>
          <!-- tray icons (optional) -->
        </div>
        <button class="taskbar-icon" type="button" data-tray-toggle title="Ocultar/mostrar itens">&#9650;</button>
        <button class="taskbar-icon" type="button" data-taskbar-settings title="Config">&#9881;</button>
        <div class="taskbar-settings" data-taskbar-settings-panel aria-hidden="true">
          <div class="muted">Config (experimental)</div>
        </div>
      </div>
    </div>
    <div class="taskbar-panel" aria-hidden="true" data-panel="search">
      <div class="card taskbar-card">
        <div class="cardTitle">Busca (local)</div>
        <div class="segmented search-kind" data-search-kind-seg>
          <button type="button" data-kind="nascimento">Nascimento</button>
          <button type="button" data-kind="casamento">Casamento</button>
          <button type="button" data-kind="obito">Obito</button>
        </div>
        <div class="taskbar-search-grid" data-search-group="nascimento">
          <div class="field">
            <label>Nome</label>
            <input class="campo" data-search-nome />
          </div>
          <div class="field">
            <label>Mae</label>
            <input class="campo" data-search-mae />
          </div>
          <div class="field">
            <label>Pai</label>
            <input class="campo" data-search-pai />
          </div>
          <div class="field">
            <label>Data nasc.</label>
            <input class="campo" data-search-dn />
          </div>
          <div class="field">
            <label>Data registro</label>
            <input class="campo" data-search-dr />
          </div>
          <div class="field">
            <label>Livro</label>
            <input class="campo" data-search-livro />
          </div>
          <div class="field">
            <label>Folha</label>
            <input class="campo" data-search-folha />
          </div>
          <div class="field">
            <label>Termo</label>
            <input class="campo" data-search-termo />
          </div>
          <div class="field">
            <label>Cartorio</label>
            <input class="campo" data-search-cartorio />
          </div>
        </div>
        <div class="taskbar-search-grid" data-search-group="casamento" hidden>
          <div class="field">
            <label>Conjuge 1</label>
            <input class="campo" data-search-conjuge1 />
          </div>
          <div class="field">
            <label>Conjuge 2</label>
            <input class="campo" data-search-conjuge2 />
          </div>
          <div class="field">
            <label>Pais conj.</label>
            <input class="campo" data-search-pais-conjuge />
          </div>
          <div class="field">
            <label>Data casamento</label>
            <input class="campo" data-search-dc />
          </div>
          <div class="field">
            <label>Data registro</label>
            <input class="campo" data-search-dr />
          </div>
          <div class="field">
            <label>Tipo (civil/religioso)</label>
            <input class="campo" data-search-tipo-cas />
          </div>
          <div class="field">
            <label>Livro</label>
            <input class="campo" data-search-livro />
          </div>
          <div class="field">
            <label>Folha</label>
            <input class="campo" data-search-folha />
          </div>
          <div class="field">
            <label>Termo</label>
            <input class="campo" data-search-termo />
          </div>
        </div>
        <div class="taskbar-search-grid" data-search-group="obito" hidden>
          <div class="field">
            <label>Falecido</label>
            <input class="campo" data-search-nome />
          </div>
          <div class="field">
            <label>Pais</label>
            <input class="campo" data-search-pais />
          </div>
          <div class="field">
            <label>Data obito</label>
            <input class="campo" data-search-do />
          </div>
          <div class="field">
            <label>Data registro</label>
            <input class="campo" data-search-dr />
          </div>
          <div class="field">
            <label>Livro</label>
            <input class="campo" data-search-livro />
          </div>
          <div class="field">
            <label>Folha</label>
            <input class="campo" data-search-folha />
          </div>
          <div class="field">
            <label>Termo</label>
            <input class="campo" data-search-termo />
          </div>
          <div class="field">
            <label>Cartorio</label>
            <input class="campo" data-search-cartorio />
          </div>
        </div>
        <div class="taskbar-actions">
          <button class="btn tiny secondary" type="button" data-search-run>Buscar</button>
          <button class="btn tiny" type="button" data-search-clear>Limpar</button>
          <span class="taskbar-status" aria-live="polite"></span>
        </div>
        <div class="taskbar-results">Nenhum resultado.</div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  bindChatSearchShell(root);

  return root;
}

export function toggleChatSearchShell(force?: boolean): void {
  const root = document.getElementById(ROOT_ID) as HTMLElement | null;
  if (!root) return;
  const isOpen = root.getAttribute('data-open') === '1';
  const next = typeof force === 'boolean' ? force : !isOpen;
  root.setAttribute('data-open', next ? '1' : '0');
  const panel = root.querySelector('.taskbar-panel') as HTMLElement | null;
  if (panel) panel.setAttribute('aria-hidden', next ? 'false' : 'true');
}

export function setupChatSearchShell(opts: ChatSearchShellOptions = {}): void {
  if (!isChatSearchEnabled(opts)) return;
  // Mount immediately (taskbar visible at bottom).
  mountChatSearchShell();
}

function bindChatSearchShell(root: HTMLElement): void {
  if (root.getAttribute('data-bound') === '1') return;
  root.setAttribute('data-bound', '1');

  const store = createLocalSearchStore();
  const tabsKey = 'ui.taskbar.tabs';
  const tabsVisibleLimit = 10;
  const tabsHistoryLimit = 100;
  const trayKey = 'ui.taskbar.trayCollapsed';

  const currentWrap = root.querySelector('[data-current]') as HTMLElement | null;
  const currentLabel = root.querySelector('[data-current-label]') as HTMLElement | null;
  const tabsDropdown = root.querySelector('[data-tabs-dropdown]') as HTMLElement | null;
  const tabsVisible = root.querySelector('[data-tabs-visible]') as HTMLElement | null;
  const tabsHistory = root.querySelector('[data-tabs-history]') as HTMLElement | null;
  const tabsMore = root.querySelector('[data-tabs-more]') as HTMLButtonElement | null;
  const tray = root.querySelector('[data-tray]') as HTMLElement | null;
  const panel = root.querySelector('.taskbar-panel') as HTMLElement | null;
  const results = root.querySelector('.taskbar-results') as HTMLElement | null;
  const status = root.querySelector('.taskbar-status') as HTMLElement | null;
  const kindSeg = root.querySelector('[data-search-kind-seg]') as HTMLElement | null;
  let activeKind: 'nascimento' | 'casamento' | 'obito' = 'nascimento';
  const fieldNome = root.querySelector('[data-search-nome]') as HTMLInputElement | null;
  const fieldMae = root.querySelector('[data-search-mae]') as HTMLInputElement | null;
  const fieldPai = root.querySelector('[data-search-pai]') as HTMLInputElement | null;
  const fieldConjuge1 = root.querySelector('[data-search-conjuge1]') as HTMLInputElement | null;
  const fieldConjuge2 = root.querySelector('[data-search-conjuge2]') as HTMLInputElement | null;
  const fieldLivro = root.querySelector('[data-search-livro]') as HTMLInputElement | null;
  const fieldFolha = root.querySelector('[data-search-folha]') as HTMLInputElement | null;
  const fieldTermo = root.querySelector('[data-search-termo]') as HTMLInputElement | null;
  const fieldCpf = root.querySelector('[data-search-cpf]') as HTMLInputElement | null;
  const fieldDn = root.querySelector('[data-search-dn]') as HTMLInputElement | null;
  const fieldDr = root.querySelector('[data-search-dr]') as HTMLInputElement | null;
  const fieldDc = root.querySelector('[data-search-dc]') as HTMLInputElement | null;
  const fieldDo = root.querySelector('[data-search-do]') as HTMLInputElement | null;
  const fieldPais = root.querySelector('[data-search-pais]') as HTMLInputElement | null;
  const fieldPaisConjuge = root.querySelector('[data-search-pais-conjuge]') as HTMLInputElement | null;
  const fieldTipoCas = root.querySelector('[data-search-tipo-cas]') as HTMLInputElement | null;
  const fieldCartorio = root.querySelector('[data-search-cartorio]') as HTMLInputElement | null;
  const btnRun = root.querySelector('[data-search-run]') as HTMLButtonElement | null;
  const btnClear = root.querySelector('[data-search-clear]') as HTMLButtonElement | null;

  const renderEmpty = (msg: string) => {
    if (!results) return;
    root.setAttribute('data-has-results', '0');
    results.textContent = msg;
  };

  const formatCell = (value: any) => {
    const v = String(value || '').trim();
    return v || '-';
  };

  const getColumnsForKind = (kind: 'nascimento' | 'casamento' | 'obito') => {
    if (kind === 'casamento') {
      return [
        { label: 'Conjuges', key: 'nome', col: 'col-nome' },
        { label: 'Genitores', key: 'pais', col: 'col-pais' },
        { label: 'Data casamento', key: 'dataEvento', col: 'col-data' },
        { label: 'Data registro', key: 'dataRegistro', col: 'col-data' },
        { label: 'Tipo', key: 'tipoCasamento', col: 'col-tipo' },
        { label: 'Livro', key: 'livro', col: 'col-livro' },
        { label: 'Folha', key: 'folha', col: 'col-folha' },
        { label: 'Termo', key: 'termo', col: 'col-termo' },
        { label: 'Cartorio', key: 'cartorio', col: 'col-cartorio' },
      ];
    }
    if (kind === 'obito') {
      return [
        { label: 'Falecido', key: 'nome', col: 'col-nome' },
        { label: 'Genitores', key: 'pais', col: 'col-pais' },
        { label: 'Data obito', key: 'dataEvento', col: 'col-data' },
        { label: 'Data registro', key: 'dataRegistro', col: 'col-data' },
        { label: 'Livro', key: 'livro', col: 'col-livro' },
        { label: 'Folha', key: 'folha', col: 'col-folha' },
        { label: 'Termo', key: 'termo', col: 'col-termo' },
        { label: 'Cartorio', key: 'cartorio', col: 'col-cartorio' },
      ];
    }
    return [
      { label: 'Nome', key: 'nome', col: 'col-nome' },
      { label: 'Genitores', key: 'pais', col: 'col-pais' },
      { label: 'Data nasc.', key: 'dataEvento', col: 'col-data' },
      { label: 'Data registro', key: 'dataRegistro', col: 'col-data' },
      { label: 'Livro', key: 'livro', col: 'col-livro' },
      { label: 'Folha', key: 'folha', col: 'col-folha' },
      { label: 'Termo', key: 'termo', col: 'col-termo' },
      { label: 'Cartorio', key: 'cartorio', col: 'col-cartorio' },
    ];
  };

  const setStatus = (msg: string) => {
    if (status) status.textContent = msg;
  };

  const renderResults = (items: any[], total: number) => {
    if (!results) return;
    results.textContent = '';
    root.setAttribute('data-has-results', total > 0 ? '1' : '0');
    const info = document.createElement('div');
    info.className = 'search-summary';
    info.textContent = `Resultados: ${total}`;
    results.appendChild(info);
    if (!items.length) {
      renderEmpty('Nenhum resultado.');
      return;
    }
    const table = document.createElement('table');
    table.className = 'taskbar-results-table';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    const cols = getColumnsForKind(activeKind);
    const colgroup = document.createElement('colgroup');
    cols.forEach((col) => {
      const c = document.createElement('col');
      if (col.col) c.className = col.col;
      colgroup.appendChild(c);
    });
    const cAction = document.createElement('col');
    cAction.className = 'col-action';
    colgroup.appendChild(cAction);
    table.appendChild(colgroup);
    cols.forEach((col) => {
      const th = document.createElement('th');
      th.textContent = col.label;
      if (col.col) th.classList.add(col.col);
      trh.appendChild(th);
    });
    const thAction = document.createElement('th');
    thAction.textContent = '';
    trh.appendChild(thAction);
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    items.forEach((r) => {
      const tr = document.createElement('tr');
      cols.forEach((col) => {
        const td = document.createElement('td');
        if (col.col) td.classList.add(col.col);
        if (col.key === 'pais') {
          const pai = String(r.pai || '').trim();
          const mae = String(r.mae || '').trim();
          if (pai || mae) {
            if (pai) {
              const line = document.createElement('div');
              line.textContent = pai;
              td.appendChild(line);
            }
            if (mae) {
              const line = document.createElement('div');
              line.textContent = mae;
              td.appendChild(line);
            }
          } else {
            td.textContent = formatCell(r.pais);
          }
        } else {
          td.textContent = formatCell(r[col.key]);
        }
        tr.appendChild(td);
      });
      const tdAction = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn tiny';
      btn.textContent = 'Abrir';
      btn.addEventListener('click', async () => {
        try {
          const rec = await store.get(r.id);
          if (!rec || !rec.payload) {
            setStatus('Registro sem payload');
            return;
          }
          const applied = applyCertificatePayloadToSecondCopy(rec.payload);
          if (!applied.ok) {
            setStatus('Falha ao aplicar na tela');
            return;
          }
          setStatus('Aplicado na tela');
          addTab({ id: r.id, kind: r.kind || '', label: r.nome || 'SEM NOME' });
        } catch {
          setStatus('Falha ao abrir registro');
        }
      });
      tdAction.appendChild(btn);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    results.appendChild(table);
  };

  const runSearch = async () => {
    const qParts = [
      fieldPai?.value,
      fieldConjuge1?.value,
      fieldConjuge2?.value,
      fieldLivro?.value,
      fieldFolha?.value,
      fieldTermo?.value,
      fieldDn?.value,
      fieldDr?.value,
      fieldDc?.value,
      fieldDo?.value,
      fieldPais?.value,
      fieldPaisConjuge?.value,
      fieldTipoCas?.value,
      fieldCartorio?.value,
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    const payload = {
      q: qParts.length ? qParts.join(' ') : undefined,
      nome: (fieldNome?.value || '').trim(),
      mae: (fieldMae?.value || '').trim(),
      pai: (fieldPai?.value || '').trim(),
      cpf: (fieldCpf?.value || '').trim(),
      termo: (fieldTermo?.value || '').trim(),
      kind: activeKind,
      limit: 50,
      offset: 0,
    };
    if (!payload.q && !payload.nome && !payload.mae && !payload.cpf && !payload.termo) {
      renderEmpty('Preencha ao menos um campo.');
      return;
    }
    try {
      const res = await store.search(payload);
      renderResults(res.items || [], res.total || 0);
      setStatus('');
    } catch {
      renderEmpty('Falha ao buscar.');
    }
  };

  const togglePanel = (panelId: string) => {
    const current = root.getAttribute('data-panel') || 'none';
    const next = current === panelId ? 'none' : panelId;
    root.setAttribute('data-panel', next);
    root.setAttribute('data-open', next === 'none' ? '0' : '1');
    if (panel) {
      panel.style.display = next === panelId ? 'block' : 'none';
      panel.setAttribute('aria-hidden', next === panelId ? 'false' : 'true');
    }
    if (next === 'search') {
      const first = root.querySelector('[data-search-group="nascimento"] input, [data-search-group="casamento"] input, [data-search-group="obito"] input') as HTMLInputElement | null;
      if (first) {
        try {
          first.focus();
          first.select();
        } catch {
          /* ignore */
        }
      }
    }
  };

  root.querySelectorAll('[data-panel-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panelId = btn.getAttribute('data-panel-toggle') || '';
      togglePanel(panelId);
    });
  });

  root.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action') || '';
      const ids = action === 'json'
        ? ['btn-json']
        : action === 'xml'
          ? ['btn-xml']
          : ['btn-print', 'btn-pdf'];
      for (const id of ids) {
        const target = document.getElementById(id) as HTMLElement | null;
        if (target) {
          target.dispatchEvent(new Event('click'));
          break;
        }
      }
    });
  });

  btnRun?.addEventListener('click', () => void runSearch());
  btnClear?.addEventListener('click', () => {
    [
      fieldNome,
      fieldMae,
      fieldPai,
      fieldConjuge1,
      fieldConjuge2,
      fieldLivro,
      fieldFolha,
      fieldTermo,
      fieldCpf,
      fieldDn,
      fieldDr,
      fieldDc,
      fieldDo,
      fieldPais,
      fieldPaisConjuge,
      fieldTipoCas,
      fieldCartorio,
    ].forEach((f) => {
      if (f) f.value = '';
    });
    renderEmpty('Nenhum resultado.');
    setStatus('');
  });

  [
    fieldNome,
    fieldMae,
    fieldPai,
    fieldConjuge1,
    fieldConjuge2,
    fieldLivro,
    fieldFolha,
    fieldTermo,
    fieldCpf,
    fieldDn,
    fieldDr,
    fieldDc,
    fieldDo,
    fieldPais,
    fieldPaisConjuge,
    fieldTipoCas,
    fieldCartorio,
  ].forEach((f) => {
    f?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        void runSearch();
      }
    });
  });

  const loadTabs = (): any[] => {
    try {
      const raw = localStorage.getItem(tabsKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  };

  const saveTabs = (tabs: any[]) => {
    localStorage.setItem(tabsKey, JSON.stringify(tabs));
  };

  const renderTabs = (tabs: any[]) => {
    if (!tabsVisible || !tabsHistory) return;
    tabsVisible.textContent = '';
    tabsHistory.textContent = '';
    const visible = tabs.slice(0, tabsVisibleLimit);
    const hidden = tabs.slice(tabsVisibleLimit, tabsHistoryLimit);

    const renderItem = (tab: any, container: HTMLElement) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `taskbar-tab-item kind-${(tab.kind || 'nascimento')}`;
      el.textContent = tab.label || 'SEM REGISTRO';
      el.title = tab.label || '';
      el.addEventListener('click', async () => {
        try {
          const rec = await store.get(tab.id);
          if (!rec || !rec.payload) {
            setStatus('Registro nao encontrado');
            return;
          }
          const applied = applyCertificatePayloadToSecondCopy(rec.payload);
          if (!applied.ok) {
            setStatus('Falha ao aplicar na tela');
            return;
          }
          setStatus('Aplicado na tela');
          setActive(tab);
          addTab(tab);
        } catch {
          setStatus('Falha ao abrir registro');
        }
      });
      container.appendChild(el);
    };

    visible.forEach((tab) => renderItem(tab, tabsVisible));
    hidden.forEach((tab) => renderItem(tab, tabsHistory));
    tabsHistory.style.display = hidden.length ? 'block' : 'none';
    if (tabsMore) tabsMore.style.display = hidden.length ? 'inline-flex' : 'none';
  };

  const setActive = (tab: any) => {
    if (!currentLabel) return;
    currentLabel.textContent = tab?.label || 'SEM REGISTRO';
    if (currentWrap) {
      currentWrap.classList.remove('kind-nascimento', 'kind-casamento', 'kind-obito');
      const kind = String(tab?.kind || 'nascimento');
      currentWrap.classList.add(`kind-${kind}`);
    }
    localStorage.setItem('ui.taskbar.activeId', tab?.id || '');
  };

  const addTab = (item: { id: string; kind: string; label: string }) => {
    const tabs = loadTabs().filter((t) => t.id !== item.id);
    tabs.unshift({
      id: item.id,
      kind: item.kind || '',
      label: item.label || 'SEM NOME',
      updatedAt: Date.now(),
    });
    const filtered = tabs.slice(0, tabsHistoryLimit);
    saveTabs(filtered);
    renderTabs(filtered);
    setActive(item);
  };

  const bootstrapTabs = loadTabs();
  renderTabs(bootstrapTabs);
  if (bootstrapTabs.length) {
    setActive(bootstrapTabs[0]);
  }

  // Tabs dropdown toggle
  root.querySelectorAll('[data-tabs-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isOpen = tabsDropdown?.getAttribute('data-open') === '1';
      const next = !isOpen;
      if (tabsDropdown) {
        tabsDropdown.setAttribute('data-open', next ? '1' : '0');
        tabsDropdown.setAttribute('aria-hidden', next ? 'false' : 'true');
      }
    });
  });
  tabsMore?.addEventListener('click', () => {
    const expanded = tabsDropdown?.getAttribute('data-expanded') === '1';
    const next = !expanded;
    if (tabsDropdown) tabsDropdown.setAttribute('data-expanded', next ? '1' : '0');
    if (tabsHistory) tabsHistory.style.display = next ? 'block' : 'none';
    if (tabsMore) tabsMore.textContent = next ? 'Ver menos' : 'Ver mais';
  });

  // Tray collapse toggle
  const applyTray = (collapsed: boolean) => {
    if (!tray) return;
    tray.style.display = collapsed ? 'none' : 'inline-flex';
    localStorage.setItem(trayKey, collapsed ? 'true' : 'false');
  };
  const trayCollapsed = localStorage.getItem(trayKey) === 'true';
  applyTray(trayCollapsed);
  root.querySelectorAll('[data-tray-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const collapsed = tray?.style.display === 'none';
      applyTray(!collapsed);
    });
  });

  // include toggle
  root.querySelectorAll('[data-include-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const include = root.querySelector('[data-include]') as HTMLElement | null;
      if (!include) return;
      const open = include.getAttribute('data-open') === '1';
      include.setAttribute('data-open', open ? '0' : '1');
      include.setAttribute('aria-hidden', open ? 'true' : 'false');
      if (!open) {
        try {
          const rect = (btn as HTMLElement).getBoundingClientRect();
          include.style.left = `${Math.max(8, rect.left + rect.width / 2)}px`;
          include.style.bottom = `44px`;
          include.style.transform = 'translateX(-50%)';
        } catch {
          /* ignore */
        }
      }
    });
  });

  // taskbar settings
  const settingsBtn = root.querySelector('[data-taskbar-settings]') as HTMLElement | null;
  const settingsPanel = root.querySelector('[data-taskbar-settings-panel]') as HTMLElement | null;
  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => {
      const open = settingsPanel.getAttribute('data-open') === '1';
      settingsPanel.setAttribute('data-open', open ? '0' : '1');
      settingsPanel.setAttribute('aria-hidden', open ? 'true' : 'false');
    });
  }

  // open act buttons (taskbar segmented / include / dropdown)
  root.querySelectorAll('[data-open-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-open-act') || '';
      const dest: Record<string, string> = {
        nascimento: './Nascimento2Via.html',
        casamento: './Casamento2Via.html',
        obito: './Obito2Via.html',
      };
      if (dest[act]) window.location.href = dest[act];
    });
  });

  // search kind segmented -> switch layout
  if (kindSeg) {
    const setKind = (kind: 'nascimento' | 'casamento' | 'obito') => {
      activeKind = kind;
      kindSeg.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-kind') === kind);
      });
      root.querySelectorAll('[data-search-group]').forEach((grp) => {
        const g = grp.getAttribute('data-search-group');
        const el = grp as HTMLElement;
        const isActive = g === kind;
        el.hidden = !isActive;
        el.style.display = isActive ? 'grid' : 'none';
      });
    };
    kindSeg.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        const kind = (b.getAttribute('data-kind') || 'nascimento') as any;
        setKind(kind);
      });
    });
    setKind('nascimento');
  }

  // expose for internal use in this module only
  (root as any)._taskbarAddTab = addTab;
}
