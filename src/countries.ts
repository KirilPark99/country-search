import type { RawCountry } from './types.js';

export const REQUEST_TIMEOUT_MS = 10000;

export class HttpError extends Error {
  status: number;

  constructor(_status: number) {
    super('Not implemented');
    this.status = 0;
  }
}

export async function searchCountries(
  _query: string,
  _signal: AbortSignal,
): Promise<RawCountry[]> {
  throw new Error('Not implemented');
}
