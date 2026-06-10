"use client";

import type { AccessQuery } from "../types";
import { useNimbusAccess } from "./useNimbusAccess";

/**
 * useNimbusTier — the tier name the connected wallet qualifies for.
 *
 * Returns the highest qualifying tier (e.g. "whale"), "none", or null
 * while the check is loading.
 *
 *   const tier = useNimbusTier({ community: "bonk" })
 *   if (tier === "whale") showWhaleContent()
 *
 * Thin wrapper over useNimbusAccess — same cache, same dedupe, so using
 * both in one tree costs one network request, not two.
 */
export function useNimbusTier(
  query: Pick<AccessQuery, "community" | "mint" | "contract" | "chain" | "minimum">
): string | null {
  const { tier, isLoading } = useNimbusAccess(query);
  return isLoading ? null : tier;
}
