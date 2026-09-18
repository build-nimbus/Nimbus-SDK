"use client";

import type { AccessQuery } from "../types";
import { useTotymAccess } from "./useTotymAccess";

/**
 * useTotymTier — the tier name the connected wallet qualifies for.
 *
 * Returns the highest qualifying tier (e.g. "whale"), "none", or null
 * while the check is loading.
 *
 *   const tier = useTotymTier({ community: "bonk" })
 *   if (tier === "whale") showWhaleContent()
 *
 * Thin wrapper over useTotymAccess — same cache, same dedupe, so using
 * both in one tree costs one network request, not two.
 */
export function useTotymTier(
  query: Pick<AccessQuery, "community" | "mint" | "contract" | "chain" | "minimum">
): string | null {
  const { tier, isLoading } = useTotymAccess(query);
  return isLoading ? null : tier;
}
