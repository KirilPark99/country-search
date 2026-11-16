import type { Country } from './types.js';

export const DEBOUNCE_MS = 300;
export type CountrySearch = (
  query: string,
  signal: AbortSignal,
) => Promise<Country[]>;
export interface SearchState {
  status: 'idle' | 'waiting' | 'loading' | 'success' | 'empty' | 'error';
  query: string;
  countries: Country[];
  error: string;
}
export interface SearchController {
  setQuery: (query: string) => void;
  searchNow: (query: string) => void;
  retry: () => void;
  dispose: () => void;
}

export function createSearchController(
  _search: CountrySearch,
  _onChange: (state: SearchState) => void,
): SearchController {
  throw new Error('Not implemented');
}
