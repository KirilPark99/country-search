import { describe, expect, test, vi } from 'vitest';
import {
  addToHistory,
  HISTORY_KEY,
  HISTORY_LIMIT,
  loadHistory,
  saveHistory,
} from '../src/history.js';

function storage(value: string | null = null) {
  return { getItem: vi.fn().mockReturnValue(value), setItem: vi.fn() };
}

describe('search history', () => {
  test('loads saved history and normalizes duplicate or invalid entries', () => {
    const source = storage(
      JSON.stringify([' Spain ', 12, 'japan', 'SPAIN', '']),
    );
    expect(loadHistory(source)).toEqual(['spain', 'japan']);
    expect(source.getItem).toHaveBeenCalledWith(HISTORY_KEY);
  });

  test('handles missing, invalid, or unavailable storage', () => {
    expect(loadHistory(storage())).toEqual([]);
    expect(loadHistory(storage('not JSON'))).toEqual([]);
    expect(loadHistory(storage('{"unexpected":true}'))).toEqual([]);
    expect(loadHistory(null)).toEqual([]);
    const blocked = storage();
    blocked.getItem.mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    expect(loadHistory(blocked)).toEqual([]);
  });

  test('moves a repeated query to the front without mutating history', () => {
    const history = ['japan', 'spain'];
    expect(addToHistory(history, ' SPAIN ')).toEqual(['spain', 'japan']);
    expect(history).toEqual(['japan', 'spain']);
    expect(addToHistory(history, '  ')).toEqual(history);
  });

  test('keeps only the latest five unique queries', () => {
    const history = ['a', 'b', 'c', 'd', 'e'];
    expect(addToHistory(history, 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
    expect(
      loadHistory(storage(JSON.stringify([...history, 'f']))),
    ).toHaveLength(HISTORY_LIMIT);
  });

  test('persists history using the expected storage key', () => {
    const target = storage();
    saveHistory(target, ['spain', 'japan']);
    expect(target.setItem).toHaveBeenCalledExactlyOnceWith(
      HISTORY_KEY,
      '["spain","japan"]',
    );
  });

  test('does not break searching if storage writes are blocked', () => {
    const target = storage();
    target.setItem.mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    expect(() => saveHistory(target, ['spain'])).not.toThrow();
    expect(() => saveHistory(null, ['spain'])).not.toThrow();
  });
});
