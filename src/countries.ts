import type { RawCountry } from './types.js';

export const REQUEST_TIMEOUT_MS = 10000;

export class HttpError extends Error {
  status: number;

  constructor(status: number) {
    super(`Country request failed with HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

export async function searchCountries(
  query: string,
  signal: AbortSignal,
): Promise<RawCountry[]> {
  signal.throwIfAborted();
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const requestSignal = AbortSignal.any([
    signal,
    AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  ]);
  const response = await fetch(
    `https://countries.dev/name/${encodeURIComponent(trimmedQuery)}`,
    { signal: requestSignal },
  );

  if (response.status === 404) return [];
  if (!response.ok) throw new HttpError(response.status);

  const data: unknown = await response.json();
  requestSignal.throwIfAborted();
  if (
    !Array.isArray(data) ||
    data.some((country) => country === null || typeof country !== 'object')
  ) {
    throw new TypeError('Unexpected country response');
  }
  return data as RawCountry[];
}
