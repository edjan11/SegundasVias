export type Abnt2NormalizeOptions = {
  allow?: RegExp;
  preserveNewlines?: boolean;
  collapseSpaces?: boolean;
  trimEdges?: boolean;
};

export type Abnt2FieldOptions = Abnt2NormalizeOptions & {
  skipTypes?: string[];
};

const DEFAULT_ALLOWED = /[^\p{L}\p{N}\s\-\/'.,:;()\[\]ºª]+/gu;
const DEFAULT_SKIP_TYPES = [
  'password',
  'email',
  'url',
  'number',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'color',
  'range',
  'file',
  'checkbox',
  'radio',
];

function normalizeSpaces(
  value: string,
  preserveNewlines: boolean,
  collapseSpaces: boolean,
  trimEdges: boolean,
): string {
  if (!preserveNewlines) {
    const collapsed = collapseSpaces ? value.replace(/\s+/g, ' ') : value;
    return trimEdges ? collapsed.trim() : collapsed;
  }

  const lines = value.split(/\r?\n/);
  const normalized = lines.map((line) => {
    const base = line.replace(/[\t\f\v]+/g, ' ');
    const spaced = collapseSpaces ? base.replace(/ {2,}/g, ' ') : base;
    return trimEdges ? spaced.trimEnd() : spaced;
  });
  return normalized.join('\n');
}

export function normalizeAbnt2Text(raw: string, options: Abnt2NormalizeOptions = {}): string {
  const {
    allow = DEFAULT_ALLOWED,
    preserveNewlines = false,
    collapseSpaces = true,
    trimEdges = true,
  } = options;
  if (!raw) return '';

  const normalized = raw.normalize('NFC');
  const cleaned = normalized.replace(allow, '');
  const spaced = normalizeSpaces(cleaned, preserveNewlines, collapseSpaces, trimEdges);
  return spaced.toUpperCase();
}

function shouldSkipInput(input: HTMLInputElement | HTMLTextAreaElement, skipTypes: string[]): boolean {
  if (input instanceof HTMLTextAreaElement) return false;
  const type = String(input.type || '').toLowerCase();
  return skipTypes.includes(type);
}

export function applyAbnt2ToField(
  input: HTMLInputElement | HTMLTextAreaElement,
  options: Abnt2FieldOptions = {},
): void {
  const {
    allow,
    preserveNewlines,
    skipTypes = DEFAULT_SKIP_TYPES,
    collapseSpaces,
    trimEdges,
  } = options;

  if (shouldSkipInput(input, skipTypes)) return;

  const next = normalizeAbnt2Text(input.value || '', {
    allow,
    preserveNewlines,
    collapseSpaces,
    trimEdges,
  });
  if (next === input.value) return;

  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = next;

  if (start != null && end != null) {
    try {
      input.setSelectionRange(start, end);
    } catch {
      // ignore
    }
  }
}

export function installAbnt2Guards(root: ParentNode = document, options: Abnt2FieldOptions = {}): void {
  const handler = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const isInputEvent = event.type === 'input';
      applyAbnt2ToField(target, {
        ...options,
        preserveNewlines: target instanceof HTMLTextAreaElement,
        collapseSpaces: isInputEvent ? false : true,
        trimEdges: isInputEvent ? false : true,
      });
    }
  };

  root.addEventListener('input', handler, true);
  root.addEventListener('change', handler, true);
}

export function normalizeAbnt2Payload<T extends Record<string, any>>(payload: T): T {
  const walk = (value: any): any => {
    if (typeof value === 'string') return normalizeAbnt2Text(value);
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      const out: Record<string, any> = {};
      Object.keys(value).forEach((key) => {
        out[key] = walk(value[key]);
      });
      return out;
    }
    return value;
  };

  return walk(payload);
}
