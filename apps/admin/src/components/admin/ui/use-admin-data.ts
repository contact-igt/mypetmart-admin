"use client";

import { useEffect, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Shared loading/error/data pattern for every admin page's call into
 * `adminRepository`. Pages never touch fixtures directly — they call the
 * repository through this hook, so swapping in a REST repository later
 * needs no page changes (docs/ADMIN_PANEL_PLAN.md §6).
 *
 * `fetcher` must be a `useCallback`-memoized function — its own dependency
 * array (not a second one here) is what decides when this hook re-fetches.
 * `loading` only surfaces on the *first* fetch — a `reload()` after a
 * mutation swaps data in once ready without flashing a spinner over an
 * already-rendered list.
 */
export function useAdminData<T>(fetcher: () => Promise<T>): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Something went wrong.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, reloadKey]);

  return { ...state, reload: () => setReloadKey((k) => k + 1) };
}
