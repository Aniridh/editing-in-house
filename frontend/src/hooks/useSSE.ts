import { useEffect, useRef } from "react";

export function useSSE(
  url: string | null,
  handlers: {
    onEvent?: (event: string, data: any) => void;
    onError?: (err: Error) => void;
    onDone?: () => void;
  }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!url) return;
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectDelay = 1000;
    const maxDelay = 8000;

    const connect = () => {
      es = new EventSource(url);
      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          handlersRef.current.onEvent?.(parsed.event, parsed.data);
          if (parsed.event === "complete" || parsed.event === "error") {
            handlersRef.current.onDone?.();
            cleanup();
          }
        } catch (err) {
          handlersRef.current.onError?.(
            err instanceof Error ? err : new Error(String(err))
          );
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        const jitter = Math.random() * 0.3;
        reconnectDelay = Math.min(maxDelay, reconnectDelay * 2 * (1 + jitter));
        reconnectTimeout = setTimeout(connect, reconnectDelay);
      };
    };

    const cleanup = () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) {
        es.close();
        es = null;
      }
    };

    connect();
    return cleanup;
  }, [url]);
}

