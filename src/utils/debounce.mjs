/**
 * Returns a debounced version of the given function.
 *
 * The debounced function delays invoking `fn` until `wait` milliseconds have
 * elapsed since the last call. Subsequent calls within the delay window reset
 * the timer.
 *
 * @template {(...args: any[]) => any} T
 * @param {T}      fn         - The function to debounce
 * @param {number} [wait=100] - Delay in milliseconds (default: 100)
 * @returns {(...args: Parameters<T>) => void} Debounced function
 */
export default function debounce(fn, wait = 100) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.call(this, ...args), wait);
  };
}
