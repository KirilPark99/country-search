import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { HttpError, searchCountries } from '../src/countries.js';
import { mapCountryResponse } from '../src/map-country.js';
import {
  createSearchController,
  DEBOUNCE_MS,
} from '../src/search-controller.js';
import type { CountrySearch, SearchState } from '../src/search-controller.js';
import type { Country } from '../src/types.js';
import spain from './fixtures/spain.json';

const countries = spain.map(mapCountryResponse);

function pendingSearch(_query: string, signal: AbortSignal) {
  return new Promise<Country[]>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    });
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('search controller and error states', () => {
  test('starts idle and never searches empty input', async () => {
    const search = vi.fn<CountrySearch>();
    const changed = vi.fn<(state: SearchState) => void>();
    const controller = createSearchController(search, changed);
    controller.setQuery('   ');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(search).not.toHaveBeenCalled();
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      status: 'idle',
      countries: [],
    });
  });

  test('debounces input, shows loading, then publishes results', async () => {
    const search = vi.fn<CountrySearch>().mockResolvedValue(countries);
    const changed = vi.fn<(state: SearchState) => void>();
    const controller = createSearchController(search, changed);
    controller.setQuery(' spain ');
    expect(changed.mock.lastCall?.[0].status).toBe('waiting');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(
      changed.mock.calls.some(([state]) => state.status === 'loading'),
    ).toBe(true);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      status: 'success',
      query: 'spain',
      countries,
    });
  });

  test('aborts on input immediately, not after the next debounce delay', async () => {
    const search = vi.fn<CountrySearch>().mockImplementation(pendingSearch);
    const changed = vi.fn<(state: SearchState) => void>();
    const controller = createSearchController(search, changed);
    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    const firstSignal = search.mock.calls[0]![1];
    controller.setQuery('spain');
    expect(firstSignal.aborted).toBe(true);
    expect(search).toHaveBeenCalledTimes(1);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      status: 'waiting',
      query: 'spain',
      countries: [],
    });
    controller.dispose();
  });

  test('clearing cancels the active request silently and clears results', async () => {
    const search = vi.fn<CountrySearch>().mockImplementation(pendingSearch);
    const changed = vi.fn<(state: SearchState) => void>();
    const controller = createSearchController(search, changed);
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    controller.setQuery('');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(search.mock.calls[0]![1].aborted).toBe(true);
    expect(search).toHaveBeenCalledTimes(1);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      status: 'idle',
      countries: [],
      error: '',
    });
    expect(changed.mock.calls.some(([state]) => state.status === 'error')).toBe(
      false,
    );
  });

  test('clearing also cancels a search that has not passed debounce yet', async () => {
    const search = vi.fn<CountrySearch>();
    const controller = createSearchController(search, vi.fn());
    controller.setQuery('spain');
    controller.setQuery('');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(search).not.toHaveBeenCalled();
  });

  test('HTTP 404 becomes a friendly empty state, not an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );
    const changed = vi.fn<(state: SearchState) => void>();
    const search: CountrySearch = async (query, signal) =>
      (await searchCountries(query, signal)).map(mapCountryResponse);
    const controller = createSearchController(search, changed);
    controller.searchNow('no-matches');
    await vi.advanceTimersByTimeAsync(0);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      status: 'empty',
      countries: [],
      error: '',
    });
  });

  test.each([
    [new HttpError(500), 'The server returned HTTP 500. Please try again.'],
    [
      new DOMException('Timed out', 'TimeoutError'),
      'The request timed out. Please try again.',
    ],
    [
      new TypeError('Offline'),
      'Could not load countries. Check your connection and try again.',
    ],
  ])('shows real errors with a retryable state: %s', async (error, message) => {
    const search = vi.fn<CountrySearch>().mockRejectedValue(error);
    const changed = vi.fn<(state: SearchState) => void>();
    const controller = createSearchController(search, changed);
    controller.searchNow('spain');
    await vi.advanceTimersByTimeAsync(0);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      status: 'error',
      error: message,
    });
  });

  test('retry immediately searches the latest input, not the old failed query', async () => {
    const search = vi
      .fn<CountrySearch>()
      .mockRejectedValueOnce(new TypeError('Offline'))
      .mockResolvedValue(countries);
    const changed = vi.fn<(state: SearchState) => void>();
    const controller = createSearchController(search, changed);
    controller.searchNow('sp');
    await vi.advanceTimersByTimeAsync(0);
    controller.setQuery('spain');
    controller.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(search.mock.calls.map(([query]) => query)).toEqual(['sp', 'spain']);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      status: 'success',
      query: 'spain',
    });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(search).toHaveBeenCalledTimes(2);
  });

  test('searchNow bypasses debounce for history selection', async () => {
    const search = vi.fn<CountrySearch>().mockResolvedValue(countries);
    const controller = createSearchController(search, vi.fn());
    controller.searchNow('spain');
    expect(search).toHaveBeenCalledExactlyOnceWith(
      'spain',
      expect.any(AbortSignal),
    );
    await vi.advanceTimersByTimeAsync(0);
  });

  test('dispose aborts requests and cancels queued work', async () => {
    const search = vi.fn<CountrySearch>().mockImplementation(pendingSearch);
    const controller = createSearchController(search, vi.fn());
    controller.searchNow('sp');
    const signal = search.mock.calls[0]![1];
    controller.setQuery('spain');
    controller.dispose();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(signal.aborted).toBe(true);
    expect(search).toHaveBeenCalledTimes(1);
  });
});
