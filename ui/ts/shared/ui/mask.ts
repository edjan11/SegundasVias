
function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

export function applyDateMask(input) {
  if (!input) return;
  const digits = digitsOnly(input.value).slice(0, 8);
  let out = '';
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length >= 3) out += '/' + digits.slice(2, 4);
  else if (digits.length > 2) out += '/' + digits.slice(2);
  if (digits.length >= 5) out += '/' + digits.slice(4, 8);
  input.value = out;
}

export function applyTimeMask(input) {
  if (!input) return;
  const digits = digitsOnly(input.value).slice(0, 4);
  let out = '';
  if (digits.length >= 1) out += digits.slice(0, 2);
  if (digits.length > 2) out += ':' + digits.slice(2, 4);
  input.value = out;
}
