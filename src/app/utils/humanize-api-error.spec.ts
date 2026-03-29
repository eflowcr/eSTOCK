import { getHumanizedErrorKey, humanizeApiError } from './humanize-api-error';

// A minimal translator: returns 'TRANSLATED:key' so we can verify which key was used,
// or the key itself when it should fall back to the raw message.
const translate = (key: string) => `TRANSLATED:${key}`;

describe('humanize-api-error utils', () => {

  // ─── getHumanizedErrorKey ─────────────────────────────────────────────────

  describe('getHumanizedErrorKey()', () => {
    it('returns null for null/empty input', () => {
      expect(getHumanizedErrorKey(null as any)).toBeNull();
      expect(getHumanizedErrorKey('')).toBeNull();
      expect(getHumanizedErrorKey('   ')).toBeNull();
    });

    it('returns null for unknown messages', () => {
      expect(getHumanizedErrorKey('This is a normal message')).toBeNull();
    });

    it('maps inventario_serial to inventory_serial_failed key', () => {
      expect(getHumanizedErrorKey('inventario_serial error occurred')).toBe('errors.inventory_serial_failed');
    });

    it('maps SKU already exists message', () => {
      const key = getHumanizedErrorKey('Ya existe un artículo con el mismo SKU');
      expect(key).toBe('errors.sku_already_exists');
    });

    it('maps invalid credentials message', () => {
      const key = getHumanizedErrorKey('Credenciales inválidas');
      expect(key).toBe('errors.invalid_credentials');
    });

    it('maps email already exists message', () => {
      const key = getHumanizedErrorKey('El correo electrónico ya existe');
      expect(key).toBe('errors.email_already_exists');
    });

    it('is case-insensitive', () => {
      const key = getHumanizedErrorKey('CREDENCIALES INVÁLIDAS');
      expect(key).toBe('errors.invalid_credentials');
    });
  });

  // ─── humanizeApiError ─────────────────────────────────────────────────────

  describe('humanizeApiError()', () => {
    it('returns translated key when message matches technical pattern', () => {
      const result = humanizeApiError('inventario_serial problem', translate, 'fallback.key');
      expect(result).toBe('TRANSLATED:errors.inventory_serial_failed');
    });

    it('returns raw message when it looks user-friendly', () => {
      const userFriendly = 'El artículo no puede ser eliminado porque tiene inventario asociado';
      const result = humanizeApiError(userFriendly, translate, 'fallback.key');
      expect(result).toBe(userFriendly);
    });

    it('returns translated fallback when message looks technical', () => {
      const result = humanizeApiError('Error al crear', translate, 'fallback.key');
      // 'Error al crear' matches the generic catch-all → humanized key
      expect(result).toContain('TRANSLATED:');
    });

    it('returns translated fallback when message is empty', () => {
      const result = humanizeApiError('', translate, 'fallback.key');
      expect(result).toBe('TRANSLATED:fallback.key');
    });
  });
});
