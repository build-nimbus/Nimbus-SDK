"use client";

import { useEffect, useMemo, useState } from "react";
import type { AccessQuery, AccessState } from "../types";
import { useTotymContext } from "../components/TotymProvider";
import { resolveQuery, deriveTier } from "../lib/config";
import { verifyAccess } from "../lib/verify";

/**
 * useTotymAccess — the core primitive of the SDK.
 *
 * Wallet ownership → token verification → access.
 *
 * Resolves tier/community indirection via provider config, sends the check
 * to the Totym API (always server-side verification), and returns reactive
 * state. Results are cached for 30s and deduped across concurrent callers
 * by the verify layer, so it's safe to call this from many gates at once.
 *
 * Usage:
 *   const { hasAccess, balance, tier, isLoading } = useTotymAccess({ community: "bonk" })
 *   const { hasAccess } = useTotymAccess({ mint: "TOKEN_ADDRESS", minimum: 1000 })
 */
export function useTotymAccess(query: AccessQuery): AccessState {
  const { apiUrl, config, wallet } = useTotymContext();

  const [result, setResult] = useState<{
    hasAccess: boolean;
    balance: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve config indirection once per query change. Resolution errors
  // (unknown tier, missing target) surface through `error`, not a throw —
  // a misconfigured gate should fail closed, not crash the host page.
  const resolved = useMemo(() => {
    try {
      return { query: resolveQuery(query, config), error: null as string | null };
    } catch (e) {
      return { query: null, error: (e as Error).message };
    }
    // Serialize: AccessQuery is a plain object of primitives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query), config]);

  // Stable key so the effect re-runs exactly when the real inputs change.
  const requestKey = useMemo(
    () =>
      resolved.query && wallet.address
        ? JSON.stringify({ q: resolved.query, w: wallet.address })
        : null,
    [resolved.query, wallet.address]
  );

  useEffect(() => {
    if (resolved.error) {
      setError(resolved.error);
      setResult(null);
      setIsLoading(false);
      return;
    }
    if (!requestKey || !resolved.query || !wallet.address) {
      // No wallet = no access. Not an error state — just disconnected.
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    verifyAccess(apiUrl, wallet.address, resolved.query)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setResult(null);
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const tier = useMemo(
    () =>
      deriveTier(
        result?.balance ?? 0,
        result?.hasAccess ?? false,
        resolved.query?.communitySlug,
        config
      ),
    [result, resolved.query?.communitySlug, config]
  );

  return {
    hasAccess: result?.hasAccess ?? false,
    balance: result?.balance ?? 0,
    tier,
    isLoading,
    error,
  };
}
