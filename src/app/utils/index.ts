/**
 * @description Returns complete URI by combining base URI and API Gateway
 * @param config Configuration object with URI and API_Gateway
 * @returns Complete URI string
 */
export function returnCompleteURI(config: { URI?: string; API_Gateway: string }): string {
  const { URI, API_Gateway } = config;

  if (!URI) {
    return API_Gateway;
  }

  // Remove trailing slash from URI if exists
  const baseURI = URI.endsWith('/') ? URI.slice(0, -1) : URI;

  // Ensure API_Gateway starts with slash if URI is provided
  const gateway = API_Gateway.startsWith('/') ? API_Gateway : `/${API_Gateway}`;

  return `${baseURI}${gateway}`;
}

export function returnCustomURI(config: { URI?: string; API_Gateway: string }):
  string {
  const { URI, API_Gateway } = config;

  if (!URI) {
    return API_Gateway;
  }

  // Remove trailing slash from URI if exists
  const baseURI = URI.endsWith('/') ? URI.slice(0, -1) : URI;

  // Remove /api from baseURI
  const customBaseURI = baseURI.replace('/api', '');

  return `${customBaseURI}${API_Gateway}`;
}

/**
 * Get the message from the backend's API error body (envelope: result.message, then message, error).
 * Use this in catch blocks when the thrown value is the response body from handleError.
 */
export function getApiErrorMessage(error: any): string {
  if (error == null) return '';
  if (typeof error === 'string') return error;
  const msg = error?.result?.message ?? error?.message ?? error?.error ?? '';
  return typeof msg === 'string' ? msg : '';
}

/**
 * @description Utility function to handle API errors (alias for getApiErrorMessage with fallback).
 * @param error Error object (backend body with result.message, or Error with message)
 * @param fallback Fallback message when no message is found
 * @returns Formatted error message
 */
export function handleApiError(error: any, fallback: string = 'An unexpected error occurred'): string {
  const msg = getApiErrorMessage(error);
  return msg || fallback;
}

import { humanizeApiError } from './humanize-api-error';
export { humanizeApiError, getHumanizedErrorKey } from './humanize-api-error';

/**
 * Returns a user-friendly error message: humanizes technical backend messages when a
 * translator is provided, otherwise falls back to handleApiError behavior.
 * @param error API error (response body with result.message, or Error)
 * @param translate Translation function (e.g. languageService.t)
 * @param fallbackKey Translation key for fallback (e.g. 'operation_failed')
 */
export function getDisplayableApiError(
  error: any,
  translate: (key: string) => string,
  fallbackKey: string
): string {
  const raw = getApiErrorMessage(error);
  if (!raw) return translate(fallbackKey);
  return humanizeApiError(raw, translate, fallbackKey);
}

/**
 * @description Utility function to check if API response is successful
 * @param response API response object
 * @returns Boolean indicating success
 */
export function isApiResponseSuccessful(response: any): boolean {
  return response?.result?.success === true;
}

// Re-export utilities
export * from './get-token';
export * from './handle-error';
export * from './permissions';
