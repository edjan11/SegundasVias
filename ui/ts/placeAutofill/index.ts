// @ts-nocheck
import { byId, debounce, qs } from '../dom.js';
import { PlaceAutoFillCache } from './cache.js';

function trimValue(value) {
  return String(value || '').trim();
}

export function createPlaceAutofill(opts) {
  const state = opts.state;
  const setBoundValue = opts.setBoundValue;
  const updateDirty = opts.updateDirty;
  const syncNaturalidadeLockedToBirth = opts.syncNaturalidadeLockedToBirth;
  const copyBirthToNaturalidade = opts.copyBirthToNaturalidade;
  const recordPlaceMappingFromState = opts.recordPlaceMappingFromState;

  const placeCache = new PlaceAutoFillCache();

  function setupLocalAutofill() {
    const localEl = byId('local-nascimento');
    const cityEl = qs('[data-bind="registro.municipio_nascimento"]');
    const ufEl = qs('[data-bind="registro.uf_nascimento"]');
    const natCityEl = qs('[data-bind="registro.municipio_naturalidade"]');
    const natUfEl = qs('[data-bind="registro.uf_naturalidade"]');
    const copyBtn = byId('copy-naturalidade');

    if (!localEl || !cityEl || !ufEl) return;

    let birthTouched = false;

    function applyPlaceEntry(entry, opts2) {
      const force = !!(opts2 && opts2.force);
      const allowNatural = !!(opts2 && opts2.allowNatural);

      const cityBirth = trimValue(entry.cityBirth);
      const ufBirth = trimValue(entry.ufBirth).toUpperCase();
      if (force || !trimValue(state.registro.municipio_nascimento))
        setBoundValue('registro.municipio_nascimento', cityBirth);
      if (force || !trimValue(state.registro.uf_nascimento))
        setBoundValue('registro.uf_nascimento', ufBirth);
      syncNaturalidadeLockedToBirth();

      if (allowNatural && state.ui.naturalidade_diferente) {
        const cityNatural = trimValue(entry.cityNatural);
        const ufNatural = trimValue(entry.ufNatural).toUpperCase();
        if (cityNatural) setBoundValue('registro.municipio_naturalidade', cityNatural);
        if (ufNatural) setBoundValue('registro.uf_naturalidade', ufNatural);
      }
    }

    const recordDebounced = debounce(() => recordPlaceMappingFromState(), 400);

    function recordPlaceMappingFromStateWithKey(placeTextOverride) {
      const placeText = trimValue(placeTextOverride || localEl.value);
      if (!placeText) return;
      const cityBirth = trimValue(state.registro.municipio_nascimento);
      const ufBirth = trimValue(state.registro.uf_nascimento).toUpperCase();
      const cityNatural = state.ui.naturalidade_diferente
        ? trimValue(state.registro.municipio_naturalidade)
        : '';
      const ufNatural = state.ui.naturalidade_diferente
        ? trimValue(state.registro.uf_naturalidade).toUpperCase()
        : '';
      if (!cityBirth || !ufBirth) return;
      placeCache.recordMapping({ placeText, cityBirth, ufBirth, cityNatural, ufNatural });
    }

    function handleExtracted(city, uf) {
      const currentCity = trimValue(state.registro.municipio_nascimento);
      const currentUf = trimValue(state.registro.uf_nascimento);
      const cityMatches = !currentCity || currentCity.toLowerCase() === city.toLowerCase();
      const ufMatches = !currentUf || currentUf.toUpperCase() === uf.toUpperCase();
      let applied = false;
      if (!currentCity && ufMatches) {
        setBoundValue('registro.municipio_nascimento', city);
        applied = true;
      }
      if (!currentUf && cityMatches) {
        setBoundValue('registro.uf_nascimento', uf);
        applied = true;
      }
      if (applied) {
        syncNaturalidadeLockedToBirth();
        updateDirty();
        recordPlaceMappingFromState();
        return;
      }
      recordPlaceMappingFromState();
    }

    function runSuggest() {
      const text = localEl.value.trim();
      if (!text) return;
      const extracted = placeCache.extractCityUfFromText(text);
      if (extracted) {
        handleExtracted(extracted.city, extracted.uf);
        return;
      }
      if (birthTouched) return;
      const match = placeCache.getBestMatch(text, { threshold: 0.75, ambiguityGap: 0.08 });
      if (!match) return;
      applyPlaceEntry(match, { force: false, allowNatural: true });
      updateDirty();
    }

    const suggestDebounced = debounce(() => runSuggest(), 250);

    localEl.addEventListener('input', () => {
      suggestDebounced();
    });
    localEl.addEventListener('blur', () => {
      runSuggest();
      recordPlaceMappingFromState();
    });
    localEl.addEventListener('change', () => {
      runSuggest();
      recordPlaceMappingFromState();
    });

    cityEl.addEventListener('input', () => {
      birthTouched = true;
      recordDebounced();
    });
    ufEl.addEventListener('change', () => {
      birthTouched = true;
      recordDebounced();
    });
    natCityEl?.addEventListener('input', recordDebounced);
    natUfEl?.addEventListener('change', recordDebounced);
    copyBtn?.addEventListener('click', () => {
      copyBirthToNaturalidade();
      updateDirty();
      recordPlaceMappingFromState();
    });
  }

  return { placeCache, setupLocalAutofill };
}
