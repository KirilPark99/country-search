import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  HttpError,
  REQUEST_TIMEOUT_MS,
  searchCountries,
} from '../src/countries.js';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function pendingFetch(_input: RequestInfo | URL, options?: RequestInit) {
  const signal = options?.signal;
  return new Promise<Response>((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    });
  });
}

describe('HttpError', () => {
  test('is an Error that preserves its HTTP status', () => {
    const error = new HttpError(500);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(500);
  });
});

describe('searchCountries', () => {
  test('trims and encodes the query and returns the API array', async () => {
    const data = [{ name: 'New Zealand' }];
    fetchMock.mockResolvedValue(new Response(JSON.stringify(data)));
    await expect(
      searchCountries(' new zealand ', new AbortController().signal),
    ).resolves.toEqual(data);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://countries.dev/name/new%20zealand',
      { signal: expect.any(AbortSignal) },
    );
  });

  test('does not request empty or whitespace-only input', async () => {
    const signal = new AbortController().signal;
    await expect(searchCountries('', signal)).resolves.toEqual([]);
    await expect(searchCountries('   ', signal)).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('treats HTTP 404 as an empty result', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(
      searchCountries('not-a-country', new AbortController().signal),
    ).resolves.toEqual([]);
  });

  test.each([400, 429, 500, 503])(
    'throws HttpError for HTTP %i',
    async (status) => {
      fetchMock.mockResolvedValue(new Response(null, { status }));
      const request = searchCountries('Spain', new AbortController().signal);
      await expect(request).rejects.toBeInstanceOf(HttpError);
      await expect(request).rejects.toMatchObject({ status });
    },
  );

  test('preserves network failures', async () => {
    const error = new TypeError('Network unavailable');
    fetchMock.mockRejectedValue(error);
    await expect(
      searchCountries('Spain', new AbortController().signal),
    ).rejects.toBe(error);
  });

  test('really aborts the fetch when the caller cancels', async () => {
    fetchMock.mockImplementation(pendingFetch);
    const controller = new AbortController();
    const request = searchCountries('Spain', controller.signal);
    const combinedSignal = fetchMock.mock.calls[0]?.[1]?.signal;
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(combinedSignal?.aborted).toBe(true);
  });

  test('combines the timeout with caller cancellation and preserves TimeoutError', async () => {
    const timeout = new AbortController();
    const timeoutFactory = vi
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(timeout.signal);
    fetchMock.mockImplementation(pendingFetch);
    const caller = new AbortController();
    const request = searchCountries('Spain', caller.signal);
    timeout.abort(new DOMException('Request timed out', 'TimeoutError'));
    await expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(timeoutFactory).toHaveBeenCalledWith(REQUEST_TIMEOUT_MS);
    expect(caller.signal.aborted).toBe(false);
  });

  test('does not start a fetch for an already aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      searchCountries('Spain', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects an unexpected non-array JSON response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unexpected data' })),
    );
    await expect(
      searchCountries('Spain', new AbortController().signal),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
