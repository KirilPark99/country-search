import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { debounce } from '../src/debounce.js';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test('waits for the full delay before calling the function', () => {
    const callback = vi.fn();
    const run = debounce(callback, 300);
    run();
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('resets the timer and uses the latest arguments', () => {
    const callback = vi.fn();
    const run = debounce(callback, 300);
    run('sp');
    vi.advanceTimersByTime(200);
    run('spain');
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith('spain');
  });

  test('passes multiple arguments to the function', () => {
    const callback = vi.fn();
    const run = debounce(callback, 100);
    run('Spain', 2);
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledExactlyOnceWith('Spain', 2);
  });

  test('can schedule another call after the previous one completed', () => {
    const callback = vi.fn();
    const run = debounce(callback, 100);
    run('first');
    vi.advanceTimersByTime(100);
    run('second');
    vi.advanceTimersByTime(100);
    expect(callback.mock.calls).toEqual([['first'], ['second']]);
  });

  test('keeps separate debounce instances independent', () => {
    const first = vi.fn();
    const second = vi.fn();
    debounce(first, 100)();
    debounce(second, 200)();
    vi.advanceTimersByTime(100);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(second).toHaveBeenCalledTimes(1);
  });

  test('cancel prevents a queued call', () => {
    const callback = vi.fn();
    const run = debounce(callback, 300);
    run('Spain');
    run.cancel();
    vi.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();
  });
});
