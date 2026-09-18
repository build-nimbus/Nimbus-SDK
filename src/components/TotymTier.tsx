"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AccessQuery } from "../types";
import { useTotymAccess } from "../hooks/useTotymAccess";

/**
 * <TotymTier> — render different content per tier.
 *
 *   <TotymTier community="bonk">
 *     <TotymTier.Whale>you hold 1000+ tokens</TotymTier.Whale>
 *     <TotymTier.Holder>you hold some tokens</TotymTier.Holder>
 *     <TotymTier.None>you hold nothing</TotymTier.None>
 *   </TotymTier>
 *
 * The parent runs ONE access check and provides the derived tier via
 * context; subcomponents render only when their tier matches exactly.
 *
 * Whale/Holder/None cover the conventional names. Tiers are user-defined
 * in config, so custom names use the generic primitive they're built on:
 *
 *   <TotymTier.Match tier="diamond">diamond hands only</TotymTier.Match>
 *
 * While the check is loading, nothing renders — gates fail closed, and a
 * flash of <None> content at a holder would be worse than a brief blank.
 */

interface TierContextValue {
  tier: string;
  isLoading: boolean;
}

const TierContext = createContext<TierContextValue | null>(null);

export interface TotymTierProps
  extends Pick<AccessQuery, "community" | "mint" | "contract" | "chain"> {
  children: ReactNode;
}

function TotymTierRoot({ children, ...query }: TotymTierProps) {
  const { tier, isLoading } = useTotymAccess(query);
  return (
    <TierContext.Provider value={{ tier, isLoading }}>
      {children}
    </TierContext.Provider>
  );
}

export interface TierMatchProps {
  tier: string;
  children: ReactNode;
}

function Match({ tier, children }: TierMatchProps) {
  const ctx = useContext(TierContext);
  if (!ctx) {
    throw new Error(
      "[totym] <TotymTier.Match> must be used inside <TotymTier>."
    );
  }
  if (ctx.isLoading) return null;
  if (ctx.tier !== tier) return null;
  return <>{children}</>;
}

const Whale = ({ children }: { children: ReactNode }) => (
  <Match tier="whale">{children}</Match>
);
const Holder = ({ children }: { children: ReactNode }) => (
  <Match tier="holder">{children}</Match>
);
const None = ({ children }: { children: ReactNode }) => (
  <Match tier="none">{children}</Match>
);

export const TotymTier = Object.assign(TotymTierRoot, {
  Match,
  Whale,
  Holder,
  None,
});
