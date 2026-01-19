// @ts-nocheck
import { mapperHtmlToJson } from './mapperHtmlToJson.js';
import { normalizeDate } from '../../shared/validators/date.js';
import { validateDateDetailed } from '../../shared/validators/date.js';
import { normalizeTime } from '../../shared/validators/time.js';
import { normalizeCpf, isValidCpf } from '../../shared/validators/cpf.js';
import { validateName } from '../../shared/validators/name.js';
import { getFieldState, applyFieldState } from '../../shared/ui/fieldState.js';
import { applyDateMask, applyTimeMask } from '../../shared/ui/mask.js';
import { collectInvalidFields } from '../../shared/ui/debug.js';
import { buildMatriculaBase30, calcDv2Digits, buildMatriculaFinal } from '../../shared/matricula/cnj.js';
import { setupPrimaryShortcut } from '../../shared/productivity/index.js';
import { setupAdminPanel } from '../../shared/ui/admin.js';
import { createNameValidator } from '../../nameValidator.js';
import { buildCasamentoPrintHtml } from './printTemplate.js';

// ...restante do código do arquivo original...
