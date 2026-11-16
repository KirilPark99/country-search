import { describe, expect, test } from 'vitest';
import { HttpError } from '../src/countries.js';
import { getErrorMessage } from '../src/errors.js';

describe('getErrorMessage', () => {
  test('does not turn an intentional AbortError into a user error', () => {
    expect(
      getErrorMessage(new DOMException('Canceled', 'AbortError')),
    ).toBeNull();
  });

  test('shows a retryable message for TimeoutError, unlike AbortError', () => {
    expect(getErrorMessage(new DOMException('Timed out', 'TimeoutError'))).toBe(
      'The request timed out. Please try again.',
    );
  });

  test('keeps the HTTP status visible for real server failures', () => {
    expect(getErrorMessage(new HttpError(503))).toBe(
      'The server returned HTTP 503. Please try again.',
    );
  });

  test('shows a connection message for network and unexpected failures', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Could not load countries. Check your connection and try again.',
    );
    expect(getErrorMessage('unknown rejection')).toBe(
      'Could not load countries. Check your connection and try again.',
    );
  });
});
