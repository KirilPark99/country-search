import { debounce } from './debounce.js';
import { getErrorMessage } from './errors.js';
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
  search: CountrySearch,
  onChange: (state: SearchState) => void,
): SearchController {
  let activeRequest: AbortController | undefined;
  let latestQuery = '';
  let disposed = false;

  function publish(
    status: SearchState['status'],
    query: string,
    countries: Country[] = [],
    error = '',
  ) {
    onChange({ status, query, countries, error });
  }

  async function run(query: string) {
    const request = new AbortController();
    activeRequest = request;
    publish('loading', query);

    try {
      const countries = await search(query, request.signal);
      if (request.signal.aborted) return;
      publish(countries.length ? 'success' : 'empty', query, countries);
    } catch (error) {
      if (request.signal.aborted) return;
      const message = getErrorMessage(error);
      if (message !== null) publish('error', query, [], message);
    } finally {
      if (activeRequest === request) activeRequest = undefined;
    }
  }

  const delayedSearch = debounce(
    (query: string) => void run(query),
    DEBOUNCE_MS,
  );

  function cancelPending() {
    activeRequest?.abort();
    activeRequest = undefined;
    delayedSearch.cancel();
  }

  function updateQuery(query: string, immediate: boolean) {
    if (disposed) return;
    cancelPending();
    latestQuery = query.trim();
    if (!latestQuery) {
      publish('idle', '');
    } else if (immediate) {
      void run(latestQuery);
    } else {
      publish('waiting', latestQuery);
      delayedSearch(latestQuery);
    }
  }

  publish('idle', '');

  return {
    setQuery: (query) => updateQuery(query, false),
    searchNow: (query) => updateQuery(query, true),
    retry: () => updateQuery(latestQuery, true),
    dispose: () => {
      disposed = true;
      cancelPending();
    },
  };
}
