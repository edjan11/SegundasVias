import { normalizeDate } from '../validators/date.js';
export function formatDateValue(raw) {
    return normalizeDate(raw);
}
