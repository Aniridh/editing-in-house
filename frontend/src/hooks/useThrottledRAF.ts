import { useRef, useCallback } from 'react';

/**
 * Hook to throttle updates using requestAnimationFrame
 * Useful for scroll/zoom events that need to be smooth but not too frequent
 */
export function useThrottledRAF<T extends (...args: any[]) => void>(
  callback: T,
  deps: React.DependencyList = []
): T {
  const rafIdRef = useRef<number | null>(null);
  const lastArgsRef = useRef<Parameters<T>>();

  const throttledCallback = useCallback(
    ((...args: Parameters<T>) => {
      lastArgsRef.current = args;

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (lastArgsRef.current) {
            callback(...lastArgsRef.current);
          }
          rafIdRef.current = null;
        });
      }
    }) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, ...deps]
  );

  return throttledCallback;
}
