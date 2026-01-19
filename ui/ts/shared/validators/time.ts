
function pad2(value) {
  return String(value).padStart(2, '0');
}

export function normalizeTime(raw) {
  const input = String(raw || '').trim();
  if (!input) return '';

  const m = /^(\d{1,2})[:]?(\d{2})$/.exec(input);
  if (!m) return '';
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!isValidTimeParts(hh, mm)) return '';
  return `${pad2(hh)}:${pad2(mm)}`;
}

export function isValidTime(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return false;
  const m = /^(\d{2}):(\d{2})$/.exec(normalized);
  if (!m) return false;
  return isValidTimeParts(Number(m[1]), Number(m[2]));
}

function isValidTimeParts(hour, minute) {
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  return true;
}
