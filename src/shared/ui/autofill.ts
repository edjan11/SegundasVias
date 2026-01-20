export type AutofillState = { lastAuto: string; dirty: boolean };

/**
 * API boundary: decide when a target can be auto-filled from a source.
 */
export function shouldAutofillFromSource(args: {
  sourceValue: string;
  targetValue: string;
  state: AutofillState;
}): boolean {
  const source = String(args.sourceValue || '').trim();
  const target = String(args.targetValue || '').trim();
  if (!source) return false;
  if (!target) return true;
  if (target === args.state.lastAuto) return true;
  return !args.state.dirty;
}

export function recordAutofill(state: AutofillState, value: string): AutofillState {
  return { lastAuto: String(value || ''), dirty: false };
}

export function recordUserEdit(state: AutofillState, targetValue: string): AutofillState {
  const target = String(targetValue || '').trim();
  if (!target) return { lastAuto: '', dirty: false };
  if (target !== state.lastAuto) return { lastAuto: state.lastAuto, dirty: true };
  return state;
}
