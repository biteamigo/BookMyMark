import { renderHook, act } from '@testing-library/react-native';
import { useDebouncedValue } from '../useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('updates debounced value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );
    expect(result.current).toBe('a');
    rerender({ value: 'b', delay: 300 });
    expect(result.current).toBe('a');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('b');
  });

  it('does not update before delay has passed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'first' } }
    );
    rerender({ value: 'second' });
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBe('first');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('second');
  });

  it('uses latest value when multiple updates occur within delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: '1' } }
    );
    rerender({ value: '2' });
    rerender({ value: '3' });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('3');
  });

  it('cleans up timeout on unmount', () => {
    const { unmount } = renderHook(() => useDebouncedValue('x', 1000));
    expect(() => unmount()).not.toThrow();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  });
});
