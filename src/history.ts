export const HISTORY_KEY = 'country-search.history';
export const HISTORY_LIMIT = 5;
export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function loadHistory(_storage: HistoryStorage | null): string[] {
  throw new Error('Not implemented');
}

export function addToHistory(_history: string[], _query: string): string[] {
  throw new Error('Not implemented');
}

export function saveHistory(
  _storage: HistoryStorage | null,
  _history: string[],
): void {
  throw new Error('Not implemented');
}
