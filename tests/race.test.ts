import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { searchCountries } from '../src/countries.js';
import { mapCountryResponse } from '../src/map-country.js';
import {
  createSearchController,
  DEBOUNCE_MS,
} from '../src/search-controller.js';
import type { SearchState } from '../src/search-controller.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('an older response cannot replace a newer result, and its fetch really aborts', async () => {
  const responseAttempts: string[] = [];
  const abortedQueries: string[] = [];
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation((input, options) => {
      const query = decodeURIComponent(String(input).split('/').at(-1)!);
      const signal = options?.signal;
      if (!signal) throw new Error('The request must carry an AbortSignal');

      return new Promise<Response>((resolve, reject) => {
        const onAbort = () => {
          abortedQueries.push(query);
          reject(signal.reason);
        };
        signal.addEventListener('abort', onAbort, { once: true });

        // Keep the scheduled response attempt to exercise a late server response.
        setTimeout(
          () => {
            responseAttempts.push(query);
            signal.removeEventListener('abort', onAbort);
            const data =
              query === 'uni'
                ? [
                    { name: 'United States of America' },
                    { name: 'United Kingdom' },
                  ]
                : [{ name: 'United Kingdom' }];
            resolve(new Response(JSON.stringify(data)));
          },
          query === 'uni' ? 2000 : 20,
        );
      });
    });
  vi.stubGlobal('fetch', fetchMock);

  const changed = vi.fn<(state: SearchState) => void>();
  const controller = createSearchController(
    async (query, signal) =>
      (await searchCountries(query, signal)).map(mapCountryResponse),
    changed,
  );

  controller.setQuery('uni');
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  const oldFetchSignal = fetchMock.mock.calls[0]![1]!.signal!;
  controller.setQuery('united kingdom');

  expect(oldFetchSignal.aborted).toBe(true);
  expect(abortedQueries).toEqual(['uni']);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 20);
  expect(changed.mock.lastCall?.[0]).toMatchObject({
    status: 'success',
    query: 'united kingdom',
    countries: [{ name: 'United Kingdom' }],
  });

  await vi.advanceTimersByTimeAsync(2000);
  expect(responseAttempts).toEqual(['united kingdom', 'uni']);
  expect(changed.mock.lastCall?.[0]).toMatchObject({
    status: 'success',
    query: 'united kingdom',
    countries: [{ name: 'United Kingdom' }],
  });
  expect(changed.mock.calls.some(([state]) => state.status === 'error')).toBe(
    false,
  );
});
