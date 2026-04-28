import {
  unwrapApiResponseList,
  unwrapApiResponseItem,
  isApiResponseListNonEmpty,
} from './api-response';

// B17 (S3.7-W4): adapter for inconsistent backend envelope shapes.
describe('unwrapApiResponseList — normalizes various envelope shapes', () => {
  // Shape #1 — articles: { data: T[] }
  it('unwraps ApiResponse<T[]> (articles shape) to T[]', () => {
    const resp = {
      envelope: {} as any,
      result: { success: true, message: '', endpoint_code: '' },
      data: [{ id: '1' }, { id: '2' }],
    };
    expect(unwrapApiResponseList<{ id: string }>(resp)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  // Shape #2 — sales-orders/delivery-notes/backorders: { data: { items: T[] } }
  it('unwraps ApiResponse<{ items: T[] }> (sales-orders shape) to T[]', () => {
    const resp = {
      result: { success: true, message: '', endpoint_code: '' },
      data: { items: [{ id: 'so-1' }], total: 1 },
    };
    expect(unwrapApiResponseList<{ id: string }>(resp as any)).toEqual([{ id: 'so-1' }]);
  });

  it('unwraps ApiResponse<{ data: T[] }> nested envelope', () => {
    const resp = { data: { data: [{ id: 'x' }] } };
    expect(unwrapApiResponseList(resp as any)).toEqual([{ id: 'x' }]);
  });

  it('unwraps ApiResponse<{ results: T[] }> paged envelope', () => {
    const resp = { data: { results: [{ id: 'p' }], total: 1 } };
    expect(unwrapApiResponseList(resp as any)).toEqual([{ id: 'p' }]);
  });

  // Shape #3 — stock-alerts: { data: null }
  it('returns [] for ApiResponse<null> (stock-alerts empty shape)', () => {
    const resp = { result: { success: true, message: '', endpoint_code: '' }, data: null };
    expect(unwrapApiResponseList(resp as any)).toEqual([]);
  });

  // Shape #4 — lots: bare array, no envelope at all
  it('passes through a bare T[] (lots shape)', () => {
    const resp = [{ id: 'lot-1' }, { id: 'lot-2' }];
    expect(unwrapApiResponseList(resp as any)).toEqual([{ id: 'lot-1' }, { id: 'lot-2' }]);
  });

  // Shape #5 — defensive
  it('returns [] for null', () => {
    expect(unwrapApiResponseList(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(unwrapApiResponseList(undefined)).toEqual([]);
  });

  it('returns [] when data is an unrecognized object shape', () => {
    const resp = { data: { foo: 'bar' } };
    expect(unwrapApiResponseList(resp as any)).toEqual([]);
  });
});

describe('unwrapApiResponseItem — single object payloads', () => {
  it('returns data when ApiResponse<T> wraps an object', () => {
    const resp = { data: { id: 'so-1', total: 100 } };
    expect(unwrapApiResponseItem(resp as any)).toEqual({ id: 'so-1', total: 100 });
  });

  it('returns null when data is null', () => {
    expect(unwrapApiResponseItem({ data: null } as any)).toBeNull();
  });

  it('returns null for null/undefined response', () => {
    expect(unwrapApiResponseItem(null)).toBeNull();
    expect(unwrapApiResponseItem(undefined)).toBeNull();
  });

  it('returns first element of array shape for resilience', () => {
    expect(unwrapApiResponseItem({ data: [{ id: 'first' }, { id: 'second' }] } as any)).toEqual({ id: 'first' });
  });

  it('returns null for empty array', () => {
    expect(unwrapApiResponseItem({ data: [] } as any)).toBeNull();
  });
});

describe('isApiResponseListNonEmpty', () => {
  it('returns true when list shape contains items', () => {
    expect(isApiResponseListNonEmpty({ data: [{ id: '1' }] } as any)).toBeTrue();
  });

  it('returns false for empty array shape', () => {
    expect(isApiResponseListNonEmpty({ data: [] } as any)).toBeFalse();
  });

  it('returns false for null/undefined', () => {
    expect(isApiResponseListNonEmpty(null)).toBeFalse();
    expect(isApiResponseListNonEmpty(undefined)).toBeFalse();
  });

  it('returns false for nested empty items envelope', () => {
    expect(isApiResponseListNonEmpty({ data: { items: [] } } as any)).toBeFalse();
  });
});
