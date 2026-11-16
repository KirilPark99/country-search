export type Debounced<T extends unknown[]> = ((...args: T) => void) & {
  cancel: () => void;
};

export function debounce<T extends unknown[]>(
  _callback: (...args: T) => void,
  _delay: number,
): Debounced<T> {
  throw new Error('Not implemented');
}
