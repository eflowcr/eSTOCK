/**
 * Production defaults. No sensitive values — never put API URLs or keys here.
 * Sensitive config (API_BASE, etc.) must be in .env → environment.generated.ts.
 */
export const environment = {
  version: 'v4.20.0.0',
  versionBD: '4.20.0.0',
  API: {
    BASE: 'http://localhost:8080/api',
  },
  TESTING: false,
  production: true,
};
