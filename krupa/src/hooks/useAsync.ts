"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/errors";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | undefined;
  /** Last successful data, kept while a reload is in flight. */
  staleData: T | undefined;
  error: string | null;
  reload: () => void;
  /** Replace data locally after a mutation, without refetching. */
  setData: (data: T) => void;
}

/**
 * Runs an async service call whenever `key` changes (or `reload` is called) and
 * exposes loading / error / success state. Out-of-date responses are ignored.
 */
export function useAsync<T>(fn: () => Promise<T>, key: string, { enabled = true }: { enabled?: boolean } = {}): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const requestKey = `${key}#${nonce}`;
  const [result, setResult] = useState<{ key: string; data?: T; error?: string } | null>(null);
  const [lastData, setLastData] = useState<T | undefined>(undefined);

  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fnRef.current().then(
      (data) => {
        if (cancelled) return;
        setResult({ key: requestKey, data });
        setLastData(data);
      },
      (error: unknown) => {
        if (!cancelled) setResult({ key: requestKey, error: getErrorMessage(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [requestKey, enabled]);

  const settled = result?.key === requestKey ? result : null;
  const status: AsyncStatus = !enabled ? "idle" : !settled ? "loading" : settled.error ? "error" : "success";

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback(
    (data: T) => {
      setResult({ key: requestKey, data });
      setLastData(data);
    },
    [requestKey],
  );

  return {
    status,
    data: status === "success" ? settled?.data : undefined,
    staleData: lastData,
    error: settled?.error ?? null,
    reload,
    setData,
  };
}
