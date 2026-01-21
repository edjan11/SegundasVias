// setup-ui.ts: VersÃ£o TypeScript das funÃ§Ãµes de setup extraÃ­das do bundle original.
// Apenas migraÃ§Ã£o estrutural, sem alteraÃ§Ã£o de comportamento.

import { createNameValidator } from '../shared/nameValidator';
import { clearFieldHint } from '../ui';

// Minimal types for UI helpers
export type AppState = {
  certidao?: { tipo_registro?: string };
  registro?: {
    sexo?: string;
    sexo_outros?: string;
    data_nascimento?: string;
    hora_nascimento?: string;
    data_nascimento_ignorada?: boolean;
    hora_nascimento_ignorada?: boolean;
  };
  ui?: { naturalidade_diferente?: boolean };
};

export type RegisterHandlers = {
  onSave?: () => void;
  onPickJson?: () => void;
  onPickXml?: () => void;
};
export type ActionHandlers = { onSave?: () => void; onJson?: () => void; onXml?: () => void };

declare global {
  interface Window {
    _drawerDelegated?: boolean;
    _atoSelectDelegated?: boolean;
    _nameValidator?: NameValidator;
    _globalSettingsHandlers?: boolean;
    _nameValidatorShiftDelegated?: boolean;
    _nameValidationShiftHeld?: () => boolean;
    _nameSuggestPopoverDelegated?: boolean;
  }
}

export function setStatus(text: string, isError?: boolean): void {
  const el = document.getElementById('statusText') as HTMLElement | null;
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#dc2626' : '#64748b';
  const prevTimer = (el as HTMLElement & { _timer?: any })._timer;
  if (prevTimer) window.clearTimeout(prevTimer);
  (el as HTMLElement & { _timer?: any })._timer = window.setTimeout(() => {
    el.textContent = 'Pronto';
    el.style.color = '#64748b';
  }, 2000);
}

export function setDirty(flag: boolean): void {
  try {
    const btn = document.getElementById('btn-save') as HTMLElement | null;
    if (!btn) return;
    btn.classList.toggle('dirty', !!flag);
  } catch (e) {
    /* ignore */
  }
}

// ensure drawer toggle works even if per-act setup skipped or button recreated
try {
  if (!window._drawerDelegated) {
    window._drawerDelegated = true;
    document.addEventListener(
      'click',
      (e) => {
        try {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if (target.id === 'drawer-toggle' || target.closest?.('#drawer-toggle')) {
            const d = document.getElementById('drawer');
            if (!d) return;
            d.classList.toggle('open');
          }
          if (target.id === 'drawer-close' || target.closest?.('#drawer-close')) {
            const d = document.getElementById('drawer');
            if (!d) return;
            d.classList.remove('open');
          }
        } catch (err) {
          /* ignore */
        }
      },
      true,
    );
  }
} catch (e) {
  /* ignore */
}

export function updateTipoButtons(state?: AppState): void {
  const tipo = (state && state.certidao && state.certidao.tipo_registro) || 'nascimento';
  const input = document.querySelector(
    '[data-bind="certidao.tipo_registro"]',
  ) as HTMLInputElement | null;
  if (input) input.value = tipo;
  const casamentoWrap = document.getElementById('casamento-tipo-wrap') as HTMLElement | null;
  if (casamentoWrap) casamentoWrap.style.display = tipo === 'casamento' ? 'flex' : 'none';
}

export function updateSexoOutros(state?: AppState): void {
  const sexo = state && state.registro && state.registro.sexo;
  const wrap = document.getElementById('sexo-outros-wrap') as HTMLElement | null;
  const input = document.getElementById('sexo-outros') as HTMLInputElement | null;
  if (!wrap || !input) return;
  const enabled = sexo === 'outros';
  wrap.style.display = enabled ? 'flex' : 'none';
  if (!enabled) {
    input.value = '';
    if (state && state.registro) state.registro.sexo_outros = '';
  }
}

export function updateIgnoreFields(state?: AppState): void {
  const dnIgn = !!(state && state.registro && state.registro.data_nascimento_ignorada);
  const hnIgn = !!(state && state.registro && state.registro.hora_nascimento_ignorada);
  const dn = document.getElementById('dn') as HTMLInputElement | null;
  const hn = document.getElementById('hn') as HTMLInputElement | null;
  if (dn) {
    dn.disabled = dnIgn;
    if (dnIgn) {
      dn.value = '';
      if (state && state.registro) state.registro.data_nascimento = '';
    }
  }
  if (hn) {
    hn.disabled = hnIgn;
    if (hnIgn) {
      hn.value = '';
      if (state && state.registro) state.registro.hora_nascimento = '';
    }
  }
}

export function setupConfigPanel(registerHandlers?: RegisterHandlers): void {
  const NAME_MODE_KEY = 'ui.nameValidationMode';
  const NAME_MODE = localStorage.getItem(NAME_MODE_KEY) || 'blur';
  const radios = Array.from(
    document.querySelectorAll('input[name="name-validation-mode"]'),
  ) as HTMLInputElement[];
  radios.forEach((radio) => {
    radio.checked = radio.value === NAME_MODE;
  });
  const saveBtn = document.getElementById('config-save') as HTMLElement | null;
  if (saveBtn)
    saveBtn.addEventListener('click', () => {
      const selected = document.querySelector(
        'input[name="name-validation-mode"]:checked',
      ) as HTMLInputElement | null;
      if (selected && selected.value) {
        localStorage.setItem(NAME_MODE_KEY, selected.value);
      }
      // provide feedback and reload to apply immediately (consistent with other settings)
      try {
        setStatus('PreferÃªncias salvas. Atualizando...', false);
      } catch (e) {
        /* ignore */
      }
      setTimeout(() => window.location.reload(), 250);
      if (registerHandlers && typeof registerHandlers.onSave === 'function')
        registerHandlers.onSave();
    });
  const pickJson = document.getElementById('pick-json') as HTMLElement | null;
  if (pickJson && registerHandlers && typeof registerHandlers.onPickJson === 'function')
    pickJson.addEventListener('click', registerHandlers.onPickJson);
  const pickXml = document.getElementById('pick-xml') as HTMLElement | null;
  if (pickXml && registerHandlers && typeof registerHandlers.onPickXml === 'function')
    pickXml.addEventListener('click', registerHandlers.onPickXml);
}

export function setupActions(handlers: ActionHandlers = {}): void {
  const btnSave = document.getElementById('btn-save') as HTMLElement | null;
  const btnJson = document.getElementById('btn-json') as HTMLElement | null;
  const btnXml = document.getElementById('btn-xml') as HTMLElement | null;

  // internal: process marked names before the regular save handler runs
  if (btnSave) {
    // capture phase to run early
    btnSave.addEventListener(
      'click',
      () => {
        try {
          processMarkedNames(window._nameValidator);
        } catch (e) {
          /* ignore */
        }
      },
      true,
    );
    if (typeof handlers.onSave === 'function') btnSave.addEventListener('click', handlers.onSave);
  }

  if (btnJson && typeof handlers.onJson === 'function')
    btnJson.addEventListener('click', handlers.onJson);
  if (btnXml && typeof handlers.onXml === 'function')
    btnXml.addEventListener('click', handlers.onXml);

  // add a small "Salvar local" button to trigger JSON download of the current form
  try {
    const toolbar =
      document.querySelector('.toolbar-left') || document.querySelector('.toolbar-right');
    if (toolbar && !document.getElementById('btn-save-local')) {
      const b = document.createElement('button');
      b.id = 'btn-save-local';
      b.className = 'btn';
      b.type = 'button';
      b.textContent = 'Salvar local';
      b.title = 'Salvar certidÃ£o localmente (JSON)';
      b.addEventListener('click', () => {
        try {
          // process marked names first
          processMarkedNames(window._nameValidator);
          // then download current form state
          const data = collectFormData();
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          downloadJson(data, `certidao-${ts}.json`);
        } catch (err) {
          /* ignore */
        }
      });
      toolbar.appendChild(b);
    }
  } catch (e) {
    /* ignore */
  }
}

export function setupNaturalidadeToggle(
  state?: AppState,
  onChange?: (changed: boolean) => void,
): void {
  const toggle = document.getElementById('naturalidade-diferente') as HTMLInputElement | null;
  if (!toggle) return;
  toggle.addEventListener('change', () => {
    if (state && state.ui) state.ui.naturalidade_diferente = !!toggle.checked;
    if (typeof onChange === 'function') onChange(true);
  });
}

export function setupShortcuts(saveHandler?: () => void): void {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      if (typeof saveHandler === 'function') saveHandler();
    }
  });
}

export function setupActSelect(defaultValue?: string): void {
  const select = document.getElementById('ato-select') as HTMLSelectElement | null;
  if (!select) return;
  try {
    if (defaultValue) select.value = defaultValue;
    else select.value = select.value || 'nascimento';
  } catch (e) {
    /* ignore */
  }

  const goTo = (val: string) => {
    try {
      const map: Record<string, string> = {
        nascimento: './Nascimento2Via.html',
        casamento: './Casamento2Via.html',
        obito: './Obito2Via.html',
      };
      const next = map[val];
      if (next) {
        // small debug log to help trace issues in browser console
        try {
          console.debug('setupActSelect -> navigating to', next);
        } catch (e) {
          /* ignore */
        }
        window.location.href = next;
      }
    } catch (err) {
      /* ignore */
    }
  };

  // attach after a tiny delay to avoid being overwritten by other setup code
  setTimeout(() => {
    select.addEventListener('change', () => goTo(select.value));
    select.addEventListener('input', () => goTo(select.value));

    // quick-switch buttons (nascimento, casamento, obito) to improve navigation flow
    try {
      const toolbar =
        document.querySelector('.toolbar-left') || document.querySelector('.toolbar-right');
      if (toolbar && !document.getElementById('ato-switch')) {
        const wrap = document.createElement('div');
        wrap.id = 'ato-switch';
        wrap.style.display = 'inline-flex';
        wrap.style.gap = '6px';
        wrap.style.marginLeft = '8px';
        const map: Record<string, string> = { nascimento: 'N', casamento: 'C', obito: 'O' };
        Object.keys(map).forEach((k) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'ato-btn';
          b.textContent = map[k];
          b.title = k;
          b.addEventListener('click', () => goTo(k));
          wrap.appendChild(b);
        });
        toolbar.appendChild(wrap);
      }
    } catch (e) {
      /* ignore */
    }
  }, 10);

  // delegation fallback: listen at document level so replaced/recreated select still triggers
  try {
    if (!window._atoSelectDelegated) {
      window._atoSelectDelegated = true;
      document.addEventListener(
        'change',
        (e) => {
          try {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if ((target.id && target.id === 'ato-select') || target.closest?.('#ato-select')) {
              const val =
                (document.getElementById('ato-select') as HTMLSelectElement | null)?.value || '';
              goTo(val);
            }
          } catch (err) {
            /* ignore */
          }
        },
        true,
      );
      document.addEventListener(
        'input',
        (e) => {
          try {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if ((target.id && target.id === 'ato-select') || target.closest?.('#ato-select')) {
              const val =
                (document.getElementById('ato-select') as HTMLSelectElement | null)?.value || '';
              goTo(val);
            }
          } catch (err) {
            /* ignore */
          }
        },
        true,
      );
    }
  } catch (e) {
    /* ignore */
  }
}

// Global settings save/apply fallback: persist validation prefs and panel inline/default
try {
  if (!window._globalSettingsHandlers) {
    window._globalSettingsHandlers = true;
    // initialize checkbox states from localStorage when DOM is ready
    const initSettings = () => {
      try {
        const cbCpf = document.getElementById('settings-enable-cpf') as HTMLInputElement | null;
        const cbName = document.getElementById('settings-enable-name') as HTMLInputElement | null;
        const cbInline = document.getElementById(
          'settings-panel-inline',
        ) as HTMLInputElement | null;
        const posSelect = document.getElementById(
          'settings-drawer-position',
        ) as HTMLSelectElement | null;
        const ENABLE_CPF = localStorage.getItem('ui.enableCpfValidation') !== 'false';
        const ENABLE_NAME = localStorage.getItem('ui.enableNameValidation') !== 'false';
        const PANEL_INLINE = localStorage.getItem('ui.panelInline') === 'true';
        const POS = localStorage.getItem('ui.drawerPosition') || 'top';
        if (cbCpf) cbCpf.checked = !!ENABLE_CPF;
        if (cbName) cbName.checked = !!ENABLE_NAME;
        if (cbInline) cbInline.checked = !!PANEL_INLINE;
        if (posSelect) posSelect.value = POS;
        // ensure name-validation radios reflect stored mode (fallback if per-act setup not run)
        try {
          const NAME_MODE = localStorage.getItem('ui.nameValidationMode') || 'blur';
          const radios = Array.from(
            document.querySelectorAll('input[name="name-validation-mode"]'),
          );
          radios.forEach((r) => {
            (r as HTMLInputElement).checked = (r as HTMLInputElement).value === NAME_MODE;
          });
        } catch (e) {
          /* ignore */
        }

        // indicate whether name DB is accessible (always show a clear banner at top of config)
        try {
          let statusEl = document.getElementById('name-db-status');
          const cfg = document.getElementById('tab-config');
          if (!statusEl && cfg) {
            statusEl = document.createElement('div');
            statusEl.id = 'name-db-status';
            // make it clearly visible
            statusEl.style.display = 'block';
            statusEl.style.margin = '6px 0 12px 0';
            statusEl.style.padding = '6px 8px';
            statusEl.style.borderRadius = '6px';
            statusEl.style.fontWeight = '600';
            statusEl.style.fontSize = '12px';
            // insert as first child of the config pane so it's always visible
            if (cfg.firstChild) cfg.insertBefore(statusEl, cfg.firstChild);
            else cfg.appendChild(statusEl);
          }
          const testPaths = [
            '/public/data/nomes.csv.gz',
            '/data/nomes.csv.gz',
            '/public/data/nomes.csv',
            '/data/nomes.csv',
          ];
          (async () => {
            let found = false;
            for (const p of testPaths) {
              try {
                const r = await fetch(p, { method: 'HEAD' });
                if (r.ok) {
                  if (statusEl) {
                    statusEl.textContent = `Nome DB: disponÃ­vel (${p})`;
                    statusEl.style.background = '#ecfdf5';
                    statusEl.style.color = '#065f46';
                    statusEl.style.border = '1px solid #bbf7d0';
                  }
                  localStorage.setItem('ui.nameDbAvailable', 'true');
                  console.log('name DB detected at', p);
                  found = true;
                  break;
                }
              } catch (e) {
                console.log('name DB head check failed for', p);
              }
            }
            if (!found) {
              if (statusEl) {
                statusEl.textContent =
                  'Nome DB: nÃ£o encontrado (usando nomes padrÃ£o, sem consulta)';
                statusEl.style.background = '#fff7f0';
                statusEl.style.color = '#7c2d12';
                statusEl.style.border = '1px solid #fed7aa';
              }
              localStorage.setItem('ui.nameDbAvailable', 'false');
              console.log('name DB not found in any configured path');
            }
          })();

          // instantiate global name validator and install per-field behaviors if enabled
          try {
            const ENABLE_NAME = localStorage.getItem('ui.enableNameValidation') !== 'false';
            // avoid creating multiple validators if already created by per-act code
            if (ENABLE_NAME && !window._nameValidator) {
              try {
                const validator = createNameValidator();
                try {
                  window._nameValidator = validator;
                } catch (e) {
                  /* ignore */
                }
                // call exported setupNameValidation to wire hints and events
                try {
                  setupNameValidation(validator);
                } catch (e) {
                  /* ignore */
                }
              } catch (e) {
                console.debug('failed to create global name validator', e);
              }
            }
          } catch (e) {
            /* ignore */
          }

          // also create quick-switch buttons in the toolbar (nascimento/casamento/obito)
          try {
            const toolbar =
              document.querySelector('.toolbar-left') || document.querySelector('.toolbar-right');
            if (toolbar && !document.getElementById('ato-switch')) {
              const wrap = document.createElement('div');
              wrap.id = 'ato-switch';
              wrap.style.display = 'inline-flex';
              wrap.style.gap = '6px';
              wrap.style.marginLeft = '8px';
              const map: Record<string, string> = { nascimento: 'N', casamento: 'C', obito: 'O' };
              Object.keys(map).forEach((k) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'ato-btn';
                b.textContent = map[k];
                b.title = k;
                b.addEventListener('click', () => {
                  const dest: Record<string, string> = {
                    nascimento: './Nascimento2Via.html',
                    casamento: './Casamento2Via.html',
                    obito: './Obito2Via.html',
                  };
                  const next = dest[k] || '';
                  if (next) window.location.href = next;
                });
                wrap.appendChild(b);
              });
              toolbar.appendChild(wrap);
            }
          } catch (e) {
            /* ignore */
          }
        } catch (e) {
          console.log('error while checking name DB', e);
        }
      } catch (e) {
        /* ignore */
      }
    };
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', initSettings);
    else initSettings();

    document.addEventListener(
      'click',
      (e) => {
        try {
          const t = e.target as HTMLElement | null;
          if (!t) return;
          if (t.id === 'settings-save' || t.closest?.('#settings-save')) {
            const pos =
              (document.getElementById('settings-drawer-position') as HTMLSelectElement | null)
                ?.value || 'top';
            const newCpf = (
              document.getElementById('settings-enable-cpf') as HTMLInputElement | null
            )?.checked
              ? 'true'
              : 'false';
            const newName = (
              document.getElementById('settings-enable-name') as HTMLInputElement | null
            )?.checked
              ? 'true'
              : 'false';
            const newInline = (
              document.getElementById('settings-panel-inline') as HTMLInputElement | null
            )?.checked
              ? 'true'
              : 'false';
            localStorage.setItem('ui.drawerPosition', pos);
            localStorage.setItem('ui.enableCpfValidation', newCpf);
            localStorage.setItem('ui.enableNameValidation', newName);
            localStorage.setItem('ui.panelInline', newInline);
            try {
              console.debug('settings saved', { pos, newCpf, newName, newInline });
            } catch (e) {
              /* ignore */
            }
            setTimeout(() => window.location.reload(), 250);
          }
          if (t.id === 'settings-apply' || t.closest?.('#settings-apply')) {
            const pos =
              (document.getElementById('settings-drawer-position') as HTMLSelectElement | null)
                ?.value || 'top';
            try {
              const drawer = document.getElementById('drawer');
              if (drawer) {
                drawer.classList.remove('position-top', 'position-bottom-right', 'position-side');
                if (pos === 'top') drawer.classList.add('position-top');
                else if (pos === 'side') drawer.classList.add('position-side');
                else drawer.classList.add('position-bottom-right');
              }
            } catch (e) {
              /* ignore */
            }
            try {
              console.debug('settings applied', pos);
            } catch (e) {
              /* ignore */
            }
          }
        } catch (e) {
          /* ignore */
        }
      },
      true,
    );
  }
} catch (e) {
  /* ignore */
}

export function setupCartorioTyping(): void {
  const select = document.getElementById('cartorio-oficio') as HTMLSelectElement | null;
  if (!select) return;
  let buffer = '';
  let timer: number | null = null;
  const clearBuffer = () => {
    buffer = '';
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };
  select.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (key >= '0' && key <= '9') {
      e.preventDefault();
      buffer += key;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        buffer = '';
      }, 700) as unknown as number;
      const match = Array.from(select.options).find((opt) => opt.value === buffer);
      if (match) {
        select.value = buffer;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        clearBuffer();
      }
      return;
    }
    if (key === 'Backspace') {
      e.preventDefault();
      buffer = buffer.slice(0, -1);
      return;
    }
  });
}

type NameValidator = {
  ready?: Promise<unknown>;
  check: (value: string) => { suspicious?: boolean; token?: string };
  repo?: { addException: (value: string) => void };
};

type NameValidationOptions = {
  confirm?: boolean;
};

function isValueElement(
  el: Element,
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

export function setupNameValidation(
  validator?: NameValidator,
  opts: NameValidationOptions = { confirm: true },
): void {
  // validator should provide: ready (Promise), check(value), repo.addException
  const fields = Array.from(document.querySelectorAll('[data-name-validate]')) as Element[];

  const resolveField = (input: Element): HTMLElement | null =>
    (input.closest('td') ||
      input.closest('.campo') ||
      input.closest('.field') ||
      (input as HTMLElement).parentElement) as HTMLElement | null;

  const isValueElement = (
    el: Element,
  ): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement;

  const getValue = (el: Element): string =>
    isValueElement(el) ? (el as HTMLInputElement).value || '' : '';
  const setValue = (el: Element, v: string) => {
    if (isValueElement(el)) (el as HTMLInputElement).value = v;
  };
  fields.forEach((input) => {
    const field = resolveField(input);
    if (field) field.classList.add('name-field');
    let hint = field ? (field.querySelector('.name-suggest') as HTMLLabelElement | null) : null;

    // Only inject the name-suggest control for simple single-input name fields.
    // This prevents the '+' from appearing on composite lines (UF/Cidade, multi-input rows, selects, textareas etc.).
    const eligibleForSuggest = (() => {
      if (!field) return false;
      // only fields with exactly one input-like control
      const inputsInField = field.querySelectorAll('input, textarea, select');
      if (inputsInField.length !== 1) return false;
      const only = inputsInField[0];
      // ensure the control is a plain text input
      if (only.tagName !== 'INPUT') return false;
      const onlyInput = only as HTMLInputElement;
      if (onlyInput.type && onlyInput.type !== 'text') return false;
      // must have a label to anchor the suggest control
      const labelEl = field.querySelector('label');
      if (!labelEl) return false;
      return true;
    })();

    if (field && eligibleForSuggest && !hint) {
      // Create the suggest control anchored to the label (inside .label-row)
      // Ensure we have a label-row to anchor into (avoid duplicates)
      const labelEl = field.querySelector('label') as HTMLElement | null;
      if (!labelEl) return; // safety

      let labelRow = field.querySelector('.label-row') as HTMLElement | null;
      if (!labelRow) {
        labelRow = document.createElement('div');
        labelRow.className = 'label-row';
        // insert labelRow before the label and move the label into it
        field.insertBefore(labelRow, labelEl);
        labelRow.appendChild(labelEl);
      }

      hint = document.createElement('label');
      hint.className = 'name-suggest';
      hint.setAttribute('title', 'Incluir no vocabulario (ao salvar)');
      hint.setAttribute('data-tooltip', 'Incluir no vocabulario (ao salvar)');

      // compact label + toggle (non-blocking).
      const labelSpan = document.createElement('span');
      labelSpan.className = 'name-suggest-label';
      labelSpan.textContent = 'Vocab.';
      hint.appendChild(labelSpan);

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.className = 'name-suggest-toggle';
      toggle.setAttribute('aria-label', 'Incluir token no vocabulario');
      hint.appendChild(toggle);

      const track = document.createElement('span');
      track.className = 'name-suggest-toggle-ui';
      hint.appendChild(track);

      toggle.addEventListener('change', () => {
        const checked = toggle.checked;
        if (!checked) {
          hint.classList.remove('name-suggest-checked');
          if (field) field.setAttribute('data-name-marked', 'false');
          return;
        }
        hint.classList.add('name-suggest-checked');
        if (field) field.setAttribute('data-name-marked', 'true');
      });

      // append to labelRow (keeps suggest anchored to label and prevents layout breaking)
      try {
        if (hint.parentElement !== labelRow) labelRow.appendChild(hint);
      } catch (e) {
        /* ignore DOM errors */
      }
    }

    // ensure shift-handling (while Shift held, validation is ignored temporarily)
    if (!window._nameValidatorShiftDelegated) {
      window._nameValidatorShiftDelegated = true;
      let shiftHeld = false;
      document.addEventListener(
        'keydown',
        (ev) => {
          if (ev.key === 'Shift') {
            shiftHeld = true;
          }
        },
        true,
      );
      document.addEventListener(
        'keyup',
        (ev) => {
          if (ev.key === 'Shift') {
            shiftHeld = false;
          }
        },
        true,
      );
      // hook into runCheck closure by attaching the flag on window for checks below
      window._nameValidationShiftHeld = () => shiftHeld;
    }

    if (hint) {
      const toggle = hint.querySelector('.name-suggest-toggle') as HTMLInputElement | null;
      if (toggle) {
        toggle.addEventListener('change', () => {
          const checked = !!toggle.checked;
          if (!checked) {
            hint.classList.remove('name-suggest-checked');
            if (field) field.setAttribute('data-name-marked', 'false');
            return;
          }
          const value = getValue(input).trim();
          if (!value) {
            toggle.checked = false;
            return;
          }
          hint.classList.add('name-suggest-checked');
          if (field) field.setAttribute('data-name-marked', 'true');
        });
      }
    }
    const sanitize = () => {
      const v = getValue(input);
      const s = v.replace(/[^A-Za-z'\- ]/g, '');
      if (s !== v) setValue(input, s);
    };

    const runCheck = () => {
      sanitize();
      const value = getValue(input).trim();
      const result = validator ? validator.check(value) : { suspicious: false };
      const token = result && result.token ? String(result.token).trim() : '';
      const shiftHeld =
        typeof window._nameValidationShiftHeld === 'function'
          ? window._nameValidationShiftHeld()
          : false;
      const suspect = !shiftHeld && !!result?.suspicious;

      if (isValueElement(input)) (input as HTMLInputElement).classList.toggle('invalid', suspect);
      if (token) (input as HTMLElement).setAttribute('data-name-token', token);
      else (input as HTMLElement).removeAttribute('data-name-token');

      if (field) {
        field.classList.toggle('name-suspect', suspect);
        if (token) field.setAttribute('data-name-token', token);
        else field.removeAttribute('data-name-token');

        const warn = field.querySelector('.name-warn') as HTMLElement | null;
        if (suspect) {
          if (warn)
            warn.setAttribute(
              'data-tooltip',
              value ? `Nome incorreto: "${value}"` : 'Nome incorreto',
            );
          const suggest = field.querySelector('.name-suggest') as HTMLElement | null;
          if (suggest) suggest.style.display = 'inline-flex';
        } else {
          if (warn) warn.setAttribute('data-tooltip', 'Nome incorreto');
          const suggest = field.querySelector('.name-suggest') as HTMLElement | null;
          if (suggest) suggest.style.display = 'none';
        }
      }
    };

    input.addEventListener('input', () => {
      sanitize();
      const mode = localStorage.getItem('ui.nameValidationMode') || 'blur';
      if (mode === 'input') runCheck();
    });
    input.addEventListener('blur', () => {
      sanitize();
      const mode = localStorage.getItem('ui.nameValidationMode') || 'blur';
      if (mode === 'blur' || mode === 'input') runCheck();
    });

    // Ensure add-control is hidden by default (will be shown only when suspect)
    if (field) {
      const suggest = field.querySelector('.name-suggest') as HTMLElement | null;
      if (suggest) suggest.style.display = 'none';
    }
  });

  // If a row contains Nome completo + Sexo, make layout compact (name grows, sexo fixed)
  try {
    const nameInput = document.querySelector(
      '[data-bind="registro.nome_completo"]',
    ) as Element | null;
    if (nameInput) {
      const r = nameInput.closest('.row') as HTMLElement | null;
      if (r && r.querySelector('select[name="sexo"], [data-bind="registro.sexo"]'))
        r.classList.add('name-and-sex');
    }
  } catch (e) {
    /* ignore */
  }

  if (validator && validator.ready) {
    Promise.resolve(validator.ready)
      .then(() => {
        fields.forEach((input) => {
          const field = resolveField(input);
          if (field) field.classList.remove('name-suspect');
          const value = getValue(input);
          if (value) {
            const result = validator.check(value);
            const suspect = !!result?.suspicious;
            if (isValueElement(input))
              (input as HTMLInputElement).classList.toggle('invalid', suspect);
            if (field) field.classList.toggle('name-suspect', suspect);
            const token = result && result.token ? String(result.token).trim() : '';
            if (token) {
              (input as HTMLElement).setAttribute('data-name-token', token);
              if (field) field.setAttribute('data-name-token', token);
            } else {
              (input as HTMLElement).removeAttribute('data-name-token');
              if (field) field.removeAttribute('data-name-token');
            }
            // ensure add-control visibility consistent
            const suggest = field
              ? (field.querySelector('.name-suggest') as HTMLElement | null)
              : null;
            if (suggest) suggest.style.display = suspect ? 'inline-flex' : 'none';
            const warn = field ? (field.querySelector('.name-warn') as HTMLElement | null) : null;
            if (warn && suspect)
              warn.setAttribute(
                'data-tooltip',
                value ? `Nome incorreto: "${value}"` : 'Nome incorreto',
              );
          }
        });
      })
      .catch(() => {
        /* ignore */
      });
  }
}

// Helpers: collect and process marked names (to be run when the user saves)
export function processMarkedNames(validatorArg?: NameValidator): void {
  const validatorToUse = validatorArg || window._nameValidator;
  const fields = Array.from(document.querySelectorAll('[data-name-validate]')) as Element[];
  fields.forEach((input) => {
    const field = (input.closest('td') ||
      input.closest('.campo') ||
      input.closest('.field') ||
      (input as HTMLElement).parentElement) as HTMLElement | null;
    if (!field) return;
    const marked = field.getAttribute('data-name-marked') === 'true';
    if (!marked) return;
    const value = isValueElement(input) ? (input as HTMLInputElement).value : '';
    if (!value) return;
    const storedToken =
      field.getAttribute('data-name-token') || (input as HTMLElement).getAttribute('data-name-token');
    const fallback = validatorToUse?.check ? validatorToUse.check(value).token : '';
    const token = String(storedToken || fallback || '').trim();
    if (!token) return;
    try {
      if (validatorToUse?.repo && typeof validatorToUse.repo.addException === 'function') {
        validatorToUse.repo.addException(token);
      }
    } catch (e) {
      /* ignore */
    }
  });
  // cleanup UI: unmark fields and remove invalid classes and hints
  fields.forEach((input) => {
    const field = (input.closest('td') ||
      input.closest('.campo') ||
      input.closest('.field') ||
      (input as HTMLElement).parentElement) as HTMLElement | null;
    if (!field) return;
    if (field.getAttribute('data-name-marked') === 'true') {
      field.setAttribute('data-name-marked', 'false');
      const toggle = field.querySelector('.name-suggest-toggle') as HTMLInputElement | null;
      if (toggle) toggle.checked = false;
      if (isValueElement(input)) (input as HTMLInputElement).classList.remove('invalid');
      try {
        clearFieldHint(field);
      } catch (e) {
        /* ignore */
      }
    }
  });
}

function collectFormData(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const els = Array.from(document.querySelectorAll('[data-bind]')) as Element[];
  els.forEach((el) => {
    const k = el.getAttribute('data-bind') || undefined;
    if (!k) return;
    if (isValueElement(el)) out[k] = (el as HTMLInputElement).value;
  });
  return out;
}

function downloadJson(obj: Record<string, unknown>, filename: string): void {
  try {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('failed to download json', e);
  }
}

// Anti-autofill helper: programmatically ensure attributes for dynamic content or missed elements
export function disableBrowserAutofill(root: Document | HTMLElement = document, selectors: string[] = []) {
  const defaultSelectors = [
    'input[name*="cidade"]',
    'select[name*="uf"]',
    'input[name*="municipio"]',
    'input[name*="endereco"]',
    'input[name*="CEP"]',
    'input[name*="cidadeTitulo"]'
  ];
  const sel = (selectors && selectors.length ? selectors : defaultSelectors).join(',');
  try {
    const nodes = (root as Document).querySelectorAll(sel);
    nodes.forEach((n) => {
      try {
        if (n instanceof HTMLInputElement || n instanceof HTMLSelectElement || n instanceof HTMLTextAreaElement) {
          n.setAttribute('autocomplete', 'nope');
          n.setAttribute('autocorrect', 'off');
          n.setAttribute('autocapitalize', 'off');
          n.setAttribute('spellcheck', 'false');
          n.setAttribute('data-autofill-disabled', '1');
        }
      } catch (e) {
        /* ignore per-input failures */
      }
    });
  } catch (e) {
    /* ignore */
  }
}






