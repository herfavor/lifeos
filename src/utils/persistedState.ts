/**
 * Small, dependency-free helpers for repairing persisted browser state.
 *
 * Backups can outlive several application versions.  These helpers deliberately
 * accept JSON strings as well as already-decoded values so stores can recover
 * from legacy and accidentally double-encoded exports without discarding the
 * rest of a user's data.
 */

export type UnknownRecord = Record<string, unknown>;

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Decode at most two JSON layers; malformed strings remain plain strings. */
export function decodePersistedValue(value: unknown): unknown {
  let decoded = value;
  for (let depth = 0; depth < 2 && typeof decoded === 'string'; depth += 1) {
    const trimmed = decoded.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) break;
    try {
      decoded = JSON.parse(trimmed);
    } catch {
      break;
    }
  }
  return decoded;
}

/**
 * Zustand's storage adapter normally removes its `{ state, version }`
 * envelope. Legacy backup tools occasionally saved that envelope as the state
 * itself, so accept either representation during recovery.
 */
export function unwrapPersistedState(value: unknown): unknown {
  const decoded = decodePersistedValue(value);
  if (isUnknownRecord(decoded) && isUnknownRecord(decoded.state)) {
    return decoded.state;
  }
  return decoded;
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))];
}

export function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function toValidDate(value: unknown, fallback: Date): Date {
  const date = value instanceof Date ? value : new Date(typeof value === 'string' || typeof value === 'number' ? value : NaN);
  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
}

export function toIsoDate(value: unknown, fallback: string): string {
  const date = new Date(typeof value === 'string' || typeof value === 'number' ? value : NaN);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}
