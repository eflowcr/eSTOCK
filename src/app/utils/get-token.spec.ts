import { getBearerToken, requestHeaders, mediaRequestHeaders } from './get-token';

const STORAGE_KEY = 'auth_estock';

describe('get-token utils', () => {
  afterEach(() => localStorage.clear());

  // ─── getBearerToken ───────────────────────────────────────────────────────

  describe('getBearerToken()', () => {
    it('returns null when nothing stored', () => {
      expect(getBearerToken()).toBeNull();
    });

    it('returns token from stored auth data', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'my-token' }));
      expect(getBearerToken()).toBe('my-token');
    });

    it('falls back to access_token field', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ access_token: 'access-abc' }));
      expect(getBearerToken()).toBe('access-abc');
    });

    it('returns null when stored JSON is invalid', () => {
      localStorage.setItem(STORAGE_KEY, 'not-json');
      expect(getBearerToken()).toBeNull();
    });
  });

  // ─── requestHeaders ───────────────────────────────────────────────────────

  describe('requestHeaders()', () => {
    it('always includes Content-Type: application/json', () => {
      const options = requestHeaders();
      expect(options.headers.get('Content-Type')).toBe('application/json');
    });

    it('includes Authorization header when token is present', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'my-token' }));
      const options = requestHeaders();
      expect(options.headers.get('Authorization')).toBe('Bearer my-token');
    });

    it('omits Authorization header when no token', () => {
      const options = requestHeaders();
      expect(options.headers.get('Authorization')).toBeNull();
    });
  });

  // ─── mediaRequestHeaders ──────────────────────────────────────────────────

  describe('mediaRequestHeaders()', () => {
    it('does NOT set Content-Type', () => {
      const options = mediaRequestHeaders();
      expect(options.headers.get('Content-Type')).toBeNull();
    });

    it('includes Authorization header when token is present', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'media-token' }));
      const options = mediaRequestHeaders();
      expect(options.headers.get('Authorization')).toBe('Bearer media-token');
    });

    it('omits Authorization header when no token', () => {
      const options = mediaRequestHeaders();
      expect(options.headers.get('Authorization')).toBeNull();
    });
  });
});
