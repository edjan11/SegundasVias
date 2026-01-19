// Entry point for the refactored bundle.
// Legacy vendor loader removed: original monolithic bundle was backed up and deleted.

// Import shared extracted modules (non-invasive exposure)
import * as DateValidator from './shared/validators/date.js';
import * as CpfValidator from './shared/validators/cpf.js';
import * as Mask from './shared/ui/mask.js';
import * as Matricula from './shared/matricula.js';
import { mapperHtmlToJson } from './app/mapperHtmlToJson.js';
import * as UiSetup from './ui/setup-ui.js';

// Re-export some known globals into a single App namespace to preserve global API.
(function exposeGlobals() {
  try {
    const win = window || globalThis;
    win.App = win.App || {};
    // preserve existing functions if present
    win.App.updateMatricula = win.updateMatricula || win.App.updateMatricula;
    win.App.generateJson = win.generateJson || win.App.generateJson || (typeof generateJson === 'function' ? generateJson : undefined);
    win.App.generateXml = win.generateXml || win.App.generateXml || (typeof generateXml === 'function' ? generateXml : undefined);
    // keep a snapshot util
    win.App.computeSnapshot = win.computeSnapshot || win.App.computeSnapshot || (typeof computeSnapshot === 'function' ? computeSnapshot : undefined);

    // expose newly modularized helpers (non-destructive)
    win.App.normalizeDate = win.App.normalizeDate || DateValidator.normalizeDate;
    win.App.validateDateDetailed = win.App.validateDateDetailed || DateValidator.validateDateDetailed;
    win.App.normalizeCpf = win.App.normalizeCpf || CpfValidator.normalizeCpf;
    win.App.formatCpf = win.App.formatCpf || CpfValidator.formatCpf;
    win.App.isValidCpf = win.App.isValidCpf || CpfValidator.isValidCpf;
    win.App.formatCpfInput = win.App.formatCpfInput || CpfValidator.formatCpfInput;
    win.App.applyDateMask = win.App.applyDateMask || Mask.applyDateMask;
    win.App.mapperHtmlToJson = win.App.mapperHtmlToJson || mapperHtmlToJson;
    win.App.matricula = win.App.matricula || Matricula;
    // expose UI setup helpers but do not auto-run them to avoid doubling listeners
    win.App.ui = win.App.ui || {};
    win.App.ui.setupActions = win.App.ui.setupActions || UiSetup.setupActions;
    win.App.ui.setupConfigPanel = win.App.ui.setupConfigPanel || UiSetup.setupConfigPanel;
    win.App.ui.setupNaturalidadeToggle = win.App.ui.setupNaturalidadeToggle || UiSetup.setupNaturalidadeToggle;
    win.App.ui.setupShortcuts = win.App.ui.setupShortcuts || UiSetup.setupShortcuts;
    win.App.ui.setupActSelect = win.App.ui.setupActSelect || UiSetup.setupActSelect;
    win.App.ui.setupCartorioTyping = win.App.ui.setupCartorioTyping || UiSetup.setupCartorioTyping;
    win.App.ui.setupNameValidation = win.App.ui.setupNameValidation || UiSetup.setupNameValidation;
    win.App.ui.setupBeforeUnload = win.App.ui.setupBeforeUnload || UiSetup.setupBeforeUnload;
    win.App.ui.setStatus = win.App.ui.setStatus || UiSetup.setStatus;
    win.App.ui.setDirty = win.App.ui.setDirty || UiSetup.setDirty;
    win.App.ui.updateTipoButtons = win.App.ui.updateTipoButtons || UiSetup.updateTipoButtons;
    win.App.ui.updateSexoOutros = win.App.ui.updateSexoOutros || UiSetup.updateSexoOutros;
    win.App.ui.updateIgnoreFields = win.App.ui.updateIgnoreFields || UiSetup.updateIgnoreFields;
  } catch (e) {
    // noop
  }
})();