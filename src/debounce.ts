export type Debounced<T extends unknown[]> = ((...args: T) => void) & {
  cancel: () => void;
};

export function debounce<T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number,
): Debounced<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };

  run.cancel = () => clearTimeout(timer);
  return run;
}
