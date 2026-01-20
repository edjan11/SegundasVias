// Collection of setup functions extracted from the original bundle.
// These functions are exported but NOT invoked automatically to avoid double-binding while the original bundle is still injected.

export function setStatus(text, isError?) {
  const el = (document.getElementById('statusText') as HTMLElement | null);
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#dc2626' : '#64748b';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.textContent = 'Pronto';
    el.style.color = '#64748b';
  }, 2000);
}

export function setDirty(flag) {
  try {
    const btn = (document.getElementById('btn-save') as HTMLElement | null);
    if (!btn) return;
    btn.classList.toggle('dirty', !!flag);
  } catch (e) { /* ignore */ }
}

export function updateTipoButtons(state) {
  const tipo = (state && state.certidao && state.certidao.tipo_registro) || 'nascimento';
  const input = document.querySelector('[data-bind="certidao.tipo_registro"]');
  if (input) (input as any).value = tipo;
  const casamentoWrap = (document.getElementById('casamento-tipo-wrap') as HTMLElement | null);
  if (casamentoWrap) casamentoWrap.style.display = tipo === 'casamento' ? 'flex' : 'none';
}

export function updateSexoOutros(state) {
  const sexo = state && state.registro && state.registro.sexo;
  const wrap = (document.getElementById('sexo-outros-wrap') as HTMLElement | null);
  const input = (document.getElementById('sexo-outros') as HTMLElement | null);
  if (!wrap || !input) return;
  const enabled = sexo === 'outros';
  wrap.style.display = enabled ? 'flex' : 'none';
  if (!enabled) {
    (input as any).value = '';
    if (state && state.registro) state.registro.sexo_outros = '';
  }
}

export function updateIgnoreFields(state) {
  const dnIgn = !!(state && state.registro && state.registro.data_nascimento_ignorada);
  const hnIgn = !!(state && state.registro && state.registro.hora_nascimento_ignorada);
  const dn = (document.getElementById('dn') as HTMLElement | null);
  const hn = (document.getElementById('hn') as HTMLElement | null);
  if (dn) {
    (dn as any).disabled = dnIgn;
    if (dnIgn) {
      (dn as any).value = '';
      if (state && state.registro) state.registro.data_nascimento = '';
    }
  }
  if (hn) {
    (hn as any).disabled = hnIgn;
    if (hnIgn) {
      (hn as any).value = '';
      if (state && state.registro) state.registro.hora_nascimento = '';
    }
  }
}

export function setupConfigPanel(registerHandlers) {
  // registerHandlers: { onPickJson?, onPickXml?, onSave? }
  const NAME_MODE_KEY = 'ui.nameValidationMode';
  const NAME_MODE = localStorage.getItem(NAME_MODE_KEY) || 'input';
  const radios = Array.from(document.querySelectorAll('input[name="name-validation-mode"]'));
  radios.forEach((radio) => {
    (radio as any).checked = (radio as any).value === NAME_MODE;
  });
  const saveBtn = (document.getElementById('config-save') as HTMLElement | null);
  if (saveBtn)
    saveBtn.addEventListener('click', () => {
      const selected = document.querySelector('input[name="name-validation-mode"]:checked');
      if (selected && (selected as any).value) {
        localStorage.setItem(NAME_MODE_KEY, (selected as any).value);
      }
      if (registerHandlers && typeof registerHandlers.onSave === 'function')
        registerHandlers.onSave();
    });
  const pickJson = (document.getElementById('pick-json') as HTMLElement | null);
  if (pickJson && registerHandlers && typeof registerHandlers.onPickJson === 'function')
    pickJson.addEventListener('click', registerHandlers.onPickJson);
  const pickXml = (document.getElementById('pick-xml') as HTMLElement | null);
  if (pickXml && registerHandlers && typeof registerHandlers.onPickXml === 'function')
    pickXml.addEventListener('click', registerHandlers.onPickXml);
}

export function setupActions(handlers = {}) {
  const btnSave = (document.getElementById('btn-save') as HTMLElement | null);
  const btnJson = (document.getElementById('btn-json') as HTMLElement | null);
  const btnXml = (document.getElementById('btn-xml') as HTMLElement | null);
  if (btnSave && typeof handlers.onSave === 'function')
    btnSave.addEventListener('click', handlers.onSave);
  if (btnJson && typeof handlers.onJson === 'function')
    btnJson.addEventListener('click', handlers.onJson);
  if (btnXml && typeof handlers.onXml === 'function')
    btnXml.addEventListener('click', handlers.onXml);
}

export function setupNaturalidadeToggle(state, onChange) {
  const toggle = (document.getElementById('naturalidade-diferente') as HTMLElement | null);
  if (!toggle) return;
  toggle.addEventListener('change', () => {
    if (state && state.ui) state.ui.naturalidade_diferente = !!(toggle as any).checked;
    if (typeof onChange === 'function') onChange(true);
  });
}

export function setupShortcuts(saveHandler) {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      if (typeof saveHandler === 'function') saveHandler();
    }
  });
}

export function setupActSelect() {
  const select = (document.getElementById('ato-select') as HTMLElement | null);
  if (!select) return;
  (select as any).value = (select as any).value || 'nascimento';
  select.addEventListener('change', () => {
    const value = (select as any).value;
    const map = {
      nascimento: './Nascimento2Via.html',
      casamento: './Casamento2Via.html',
      obito: './Obito2Via.html',
    };
    const next = map[value];
    if (next) window.location.href = next;
  });
}

export function setupCartorioTyping() {
  const select = (document.getElementById('cartorio-oficio') as HTMLElement | null);
  if (!select) return;
  let buffer = '';
  let timer = null;
  const clearBuffer = () => {
    buffer = '';
    if (timer) clearTimeout(timer);
    timer = null;
  };
  select.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (key >= '0' && key <= '9') {
      e.preventDefault();
      buffer += key;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        buffer = '';
      }, 700);
      const match = Array.from(select.options).find((opt) => (opt as any).value === buffer);
      if (match) {
        (select as any).value = buffer;
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

export function setupNameValidation(validator, opts = {}) {
  // validator should provide: ready (Promise), check(value), repo.addException
  const fields = Array.from(document.querySelectorAll('[data-name-validate]'));
  const timers = new Map();

  const ensureLabelRowAndSuggest = (field) => {
    if (!field) return null;

    field.classList.add('name-field');

    const label = field.querySelector('label');
    if (!label) return null;

    // Ensure label is a "row" so we can place the + control at the right side
    if (!label.classList.contains('label-row')) {
      label.classList.add('label-row');

      // Wrap existing label content into a span to keep text on the left
      const text = document.createElement('span');
      while (label.firstChild) text.appendChild(label.firstChild);
      label.appendChild(text);
    }

    // If suggest already exists, reuse
    let suggest = label.querySelector('.name-suggest');
    if (!suggest) {
      suggest = document.createElement('label');
      suggest.className = 'name-suggest';
      suggest.setAttribute('title', 'Adicionar ao dicionário (ao salvar)');
      suggest.setAttribute('data-tooltip', 'Adicionar ao dicionário');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'name-suggest-checkbox';
      cb.setAttribute('aria-label', 'Marcar nome para adicionar ao dicionário');
      suggest.appendChild(cb);

      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '12');
      svg.setAttribute('height', '12');
      svg.setAttribute('aria-hidden', 'true');
      svg.classList.add('name-suggest-icon');
      svg.innerHTML =
        '<path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" fill="currentColor"/>';
      suggest.appendChild(svg);

      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = 'Marcar para adicionar';
      suggest.appendChild(sr);

      label.appendChild(suggest);
    }

    return suggest;
  };

  const ensureHint = (field) => {
    if (!field) return null;
    let hint = field.querySelector('.hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'hint';
      hint.innerHTML = `<span class="icon" aria-hidden="true">⚠</span><span class="hint-text">Nome incorreto!</span>`;
      field.appendChild(hint);
    }
    return hint;
  };

  fields.forEach((input) => {
    const field = input.closest('.field');
    const suggest = ensureLabelRowAndSuggest(field);
    const hint = ensureHint(field);

    // click/toggle behavior: only queues the name to be saved (does not "fix" the name)
    if (suggest) {
      // avoid double-binding if function runs twice
      if (!suggest.__boundNameSuggest) {
        suggest.__boundNameSuggest = true;

        const cb = suggest.querySelector('.name-suggest-checkbox');

        // When checkbox is turned ON, mark field as "to-add"
        cb?.addEventListener('change', () => {
          const checked = !!cb.checked;
          if (field) field.dataset.nameMarked = checked ? 'true' : 'false';
        });
      }
    }

    const runCheck = () => {
      const value = input.value || '';
      const result = validator ? validator.check(value) : { suspicious: false };
      const suspect = !!result.suspicious;

      input.classList.toggle('invalid', suspect);
      if (field) field.classList.toggle('name-suspect', suspect);

      // Show/hide hint
      if (hint) hint.classList.toggle('visible', suspect);

      // If not suspect, stop any timers
      if (!suspect) {
        const t = timers.get(input);
        if (t) clearInterval(t);
        timers.delete(input);
      }
    };

    input.addEventListener('input', () => {
      const mode = localStorage.getItem('ui.nameValidationMode') || 'input';
      if (mode === 'input') runCheck();
    });

    input.addEventListener('blur', () => {
      const mode = localStorage.getItem('ui.nameValidationMode') || 'input';
      if (mode === 'blur' || mode === 'input') runCheck();
    });
  });

  // On save (optional): push marked names into repo
  // If you have a "Save" button, call window.flushNameValidationQueue() before saving.
  window.flushNameValidationQueue = function flushNameValidationQueue() {
    try {
      fields.forEach((input) => {
        const field = input.closest('.field');
        const marked = field?.dataset?.nameMarked === 'true';
        if (!marked) return;

        const value = (input.value || '').trim();
        if (!value) return;

        if (validator && validator.repo && typeof validator.repo.addException === 'function') {
          validator.repo.addException(value);
        }

        // reset mark
        field.dataset.nameMarked = 'false';
        const cb = field.querySelector('.name-suggest-checkbox');
        if (cb) cb.checked = false;
      });
    } catch (e) {
      // no-op
    }
  };

  if (validator && validator.ready && typeof validator.ready.then === 'function') {
    validator.ready
      .then(() => {
        fields.forEach((input) => {
          const field = input.closest('.field');
                        // cria o "?" uma vez
            let warn = field ? field.querySelector('.name-warn') : null;
              if (field && !warn) {
                warn = document.createElement('span');
                warn.className = 'name-warn';
                warn.textContent = '?';
                warn.setAttribute('aria-label', 'Nome possivelmente incorreto');
                field.appendChild(warn);
              }

          if (field) field.classList.remove('name-suspect');
          const hint = field ? field.querySelector('.hint') : null;

          const value = input.value || '';
          if (value) {
            const result = validator.check(value);
            const suspect = !!result.suspicious;
            input.classList.toggle('invalid', suspect);
            if (field) field.classList.toggle('name-suspect', suspect);
            if (hint) hint.classList.toggle('visible', suspect);
          } else {
            input.classList.remove('invalid');
            if (field) field.classList.remove('name-suspect');
            if (hint) hint.classList.remove('visible');
          }
        });
      })
      .catch(() => {});
  }
}


export function setupBeforeUnload(isDirtyFn) {
  window.addEventListener('beforeunload', (e) => {
    try {
      if (!isDirtyFn || !isDirtyFn()) return;
      e.preventDefault();
      e.returnValue = '';
    } catch (err) { /* ignore */ }
  });
}
