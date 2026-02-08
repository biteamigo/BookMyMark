import { useState, useEffect, useRef } from 'react';

/**
 * Returns a debounced version of the given value.
 * After the value stops changing for `delayMs` milliseconds, the debounced value updates.
 * @param {*} value - Any value (typically string from an input)
 * @param {number} delayMs - Delay in milliseconds
 * @returns {*} - Debounced value
 */
export function useDebouncedValue(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      timeoutRef.current = null;
    }, delayMs);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delayMs]);

  return debouncedValue;
}
