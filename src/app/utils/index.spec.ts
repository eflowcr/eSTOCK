import {
  returnCompleteURI,
  returnCustomURI,
  getApiErrorMessage,
  handleApiError,
  isApiResponseSuccessful,
} from './index';

describe('utils/index', () => {

  // ─── returnCompleteURI ────────────────────────────────────────────────────

  describe('returnCompleteURI()', () => {
    it('combines URI and gateway', () => {
      expect(returnCompleteURI({ URI: 'https://api.estock.com', API_Gateway: '/users' }))
        .toBe('https://api.estock.com/users');
    });

    it('strips trailing slash from URI', () => {
      expect(returnCompleteURI({ URI: 'https://api.estock.com/', API_Gateway: '/users' }))
        .toBe('https://api.estock.com/users');
    });

    it('adds leading slash to gateway when missing', () => {
      expect(returnCompleteURI({ URI: 'https://api.estock.com', API_Gateway: 'users' }))
        .toBe('https://api.estock.com/users');
    });

    it('returns just the gateway when URI is undefined', () => {
      expect(returnCompleteURI({ API_Gateway: '/users' })).toBe('/users');
    });
  });

  // ─── returnCustomURI ──────────────────────────────────────────────────────

  describe('returnCustomURI()', () => {
    it('strips /api from base URI', () => {
      // Use a URI where /api only appears at the end (not in the subdomain)
      expect(returnCustomURI({ URI: 'https://backend.estock.com/api', API_Gateway: '/ws' }))
        .toBe('https://backend.estock.com/ws');
    });

    it('returns gateway when URI is undefined', () => {
      expect(returnCustomURI({ API_Gateway: '/ws' })).toBe('/ws');
    });
  });

  // ─── getApiErrorMessage ───────────────────────────────────────────────────

  describe('getApiErrorMessage()', () => {
    it('returns empty string for null', () => {
      expect(getApiErrorMessage(null)).toBe('');
    });

    it('returns the string itself when passed a string', () => {
      expect(getApiErrorMessage('Something went wrong')).toBe('Something went wrong');
    });

    it('extracts result.message from ApiResponse error body', () => {
      const error = { result: { message: 'SKU already exists' } };
      expect(getApiErrorMessage(error)).toBe('SKU already exists');
    });

    it('falls back to error.message', () => {
      expect(getApiErrorMessage({ message: 'Network error' })).toBe('Network error');
    });

    it('falls back to error.error', () => {
      expect(getApiErrorMessage({ error: 'Bad Request' })).toBe('Bad Request');
    });

    it('returns empty string when no message field found', () => {
      expect(getApiErrorMessage({ code: 500 })).toBe('');
    });
  });

  // ─── handleApiError ───────────────────────────────────────────────────────

  describe('handleApiError()', () => {
    it('returns the message when found', () => {
      expect(handleApiError({ message: 'Oops' })).toBe('Oops');
    });

    it('returns fallback when no message found', () => {
      expect(handleApiError({}, 'Default error')).toBe('Default error');
    });

    it('uses generic fallback when not provided', () => {
      expect(handleApiError({})).toBe('An unexpected error occurred');
    });
  });

  // ─── isApiResponseSuccessful ──────────────────────────────────────────────

  describe('isApiResponseSuccessful()', () => {
    it('returns true when result.success is true', () => {
      expect(isApiResponseSuccessful({ result: { success: true } })).toBeTrue();
    });

    it('returns false when result.success is false', () => {
      expect(isApiResponseSuccessful({ result: { success: false } })).toBeFalse();
    });

    it('returns false for null/undefined', () => {
      expect(isApiResponseSuccessful(null)).toBeFalse();
      expect(isApiResponseSuccessful(undefined)).toBeFalse();
    });
  });
});
