import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createCountrySearch } from '../src/country-client.js';
import spain from './fixtures/spain.json';

const fetchMock = vi.fn<typeof fetch>();
const response = () => new Response(JSON.stringify(spain));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function pendingFetches() {
  const finish: ((value: Response) => void)[] = [];
  fetchMock.mockImplementation(
    (_input, options) =>
      new Promise((resolve, reject) => {
        finish.push(resolve);
        const signal = options?.signal;
        signal?.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
      }),
  );
  return finish;
}

describe('cached and shared country search', () => {
  test('caches successful results by normalized query', async () => {
    fetchMock.mockResolvedValue(response());
    const search = createCountrySearch();
    const first = await search(' Spain ', new AbortController().signal);
    const second = await search('spain', new AbortController().signal);
    expect(first).toEqual(second);
    expect(first[0]?.name).toBe('Spain');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('also caches a successful empty 404 result', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    const search = createCountrySearch();
    await expect(search('none', new AbortController().signal)).resolves.toEqual(
      [],
    );
    await expect(search('none', new AbortController().signal)).resolves.toEqual(
      [],
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('shares one in-flight fetch between two callers', async () => {
    const finish = pendingFetches();
    const search = createCountrySearch();
    const first = search('spain', new AbortController().signal);
    const second = search('spain', new AbortController().signal);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish[0]!(response());
    expect(await first).toEqual(await second);
  });

  test('canceling one caller does not abort the other caller or the shared fetch', async () => {
    const finish = pendingFetches();
    const search = createCountrySearch();
    const firstCaller = new AbortController();
    const first = search('spain', firstCaller.signal);
    const second = search('spain', new AbortController().signal);
    const sharedSignal = fetchMock.mock.calls[0]![1]!.signal!;
    const rejection = expect(first).rejects.toMatchObject({
      name: 'AbortError',
    });
    firstCaller.abort();
    await rejection;
    expect(sharedSignal.aborted).toBe(false);
    finish[0]!(response());
    await expect(second).resolves.toMatchObject([{ name: 'Spain' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('aborts the real fetch as soon as its last caller cancels', async () => {
    pendingFetches();
    const search = createCountrySearch();
    const firstCaller = new AbortController();
    const secondCaller = new AbortController();
    const first = search('spain', firstCaller.signal);
    const second = search('spain', secondCaller.signal);
    const firstRejection = expect(first).rejects.toMatchObject({
      name: 'AbortError',
    });
    const secondRejection = expect(second).rejects.toMatchObject({
      name: 'AbortError',
    });
    firstCaller.abort();
    expect(fetchMock.mock.calls[0]![1]!.signal!.aborted).toBe(false);
    secondCaller.abort();
    expect(fetchMock.mock.calls[0]![1]!.signal!.aborted).toBe(true);
    await Promise.all([firstRejection, secondRejection]);
  });

  test('does not cache HTTP failures, so retry starts a fresh request', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(response());
    const search = createCountrySearch();
    await expect(
      search('spain', new AbortController().signal),
    ).rejects.toMatchObject({ status: 500 });
    await expect(
      search('spain', new AbortController().signal),
    ).resolves.toMatchObject([{ name: 'Spain' }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('never reuses an aborted in-flight request or lets its cleanup delete a newer one', async () => {
    const finish = pendingFetches();
    const search = createCountrySearch();
    const oldCaller = new AbortController();
    const old = search('spain', oldCaller.signal);
    const oldRejection = expect(old).rejects.toMatchObject({
      name: 'AbortError',
    });
    oldCaller.abort();
    const fresh = search('spain', new AbortController().signal);
    await oldRejection;
    const joined = search('spain', new AbortController().signal);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    finish[1]!(response());
    expect(await fresh).toEqual(await joined);
  });

  test('rejects an already canceled caller even when data is cached', async () => {
    fetchMock.mockResolvedValue(response());
    const search = createCountrySearch();
    await search('spain', new AbortController().signal);
    const caller = new AbortController();
    caller.abort();
    await expect(search('spain', caller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
