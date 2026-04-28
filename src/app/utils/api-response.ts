import { ApiResponse } from '@app/models';

/**
 * B17 (S3.7-W4): Adapter to normalize varying API envelope shapes returned by
 * the backend. Different services return inconsistent payloads:
 *   - /api/articles/        → { data: T[] }       (array under data)
 *   - /api/sales-orders/    → { data: { items: T[], ... } } (object wrapper)
 *   - /api/delivery-notes/  → { data: { items: T[] } }
 *   - /api/backorders/      → { data: { items: T[] } }
 *   - /api/lots/            → T[]                 (no envelope at all)
 *   - /api/stock-alerts/    → { data: null }      (null when empty)
 *
 * `unwrapApiResponseList<T>(resp)` flattens any of these into `T[]`.
 * `unwrapApiResponseItem<T>(resp)` returns the single object payload.
 *
 * Frontend-only normalization — backend cleanup tracked separately.
 */

type AnyEnvelope<T> =
  | ApiResponse<T>
  | ApiResponse<T[]>
  | ApiResponse<{ items?: T[]; data?: T[]; results?: T[] }>
  | { data?: T | T[] | null }
  | T[]
  | null
  | undefined;

/**
 * Unwrap a list payload from any of the inconsistent envelope shapes used by
 * the eSTOCK backend. Always returns an array; falls back to `[]` when the
 * response is null, undefined, or shaped unexpectedly.
 *
 * Recognised shapes:
 *   1. `ApiResponse<T[]>`               → resp.data
 *   2. `ApiResponse<{ items: T[] }>`    → resp.data.items (or .data / .results)
 *   3. `ApiResponse<null>`              → []
 *   4. raw array `T[]`                  → resp
 *   5. anything else                    → []
 */
export function unwrapApiResponseList<T>(resp: AnyEnvelope<T>): T[] {
  if (resp == null) return [];

  // Shape #4: bare array (no envelope)
  if (Array.isArray(resp)) return resp as T[];

  // Anything from here is treated as having an envelope. Pull out `data`.
  const data = (resp as { data?: unknown }).data;

  // Shape #3: data is null/undefined
  if (data == null) return [];

  // Shape #1: data is already an array
  if (Array.isArray(data)) return data as T[];

  // Shape #2: data is an object wrapper — look for common nested array keys
  if (typeof data === 'object') {
    const candidate = data as Record<string, unknown>;
    if (Array.isArray(candidate['items'])) return candidate['items'] as T[];
    if (Array.isArray(candidate['data'])) return candidate['data'] as T[];
    if (Array.isArray(candidate['results'])) return candidate['results'] as T[];
    if (Array.isArray(candidate['list'])) return candidate['list'] as T[];
  }

  return [];
}

/**
 * Unwrap a single-item payload. Returns null when the response is missing
 * or wraps a null payload.
 */
export function unwrapApiResponseItem<T>(resp: AnyEnvelope<T> | { data?: T }): T | null {
  if (resp == null) return null;
  if (Array.isArray(resp)) return (resp[0] as T) ?? null;

  const data = (resp as { data?: unknown }).data;
  if (data == null) return null;

  // If the backend wrapped a single item inside { data: { item: T } } we leave
  // that to the caller — we only flatten when explicitly an array shape.
  if (Array.isArray(data)) return (data[0] as T) ?? null;

  return data as T;
}

/**
 * Convenience: returns `true` only when the envelope reports success AND
 * carries a non-null payload. Useful for guarding UI rendering.
 */
export function isApiResponseListNonEmpty(resp: AnyEnvelope<unknown>): boolean {
  return unwrapApiResponseList(resp).length > 0;
}
