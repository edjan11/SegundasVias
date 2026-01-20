import { RecordModel } from '../recordModel';

/**
 * Export the record to a canonical JSON string. Uses a deterministic key order
 * based on the object's own keys (preserves mapper ordering).
 */
export function exportRecordToJson(record: RecordModel): string {
  const obj = record.toObject();
  const ordered: { [k: string]: any } = {};
  // Preserve insertion order of keys as provided by the mapper
  for (const k of Object.keys(obj)) ordered[k] = obj[k];
  return JSON.stringify(ordered);
}
