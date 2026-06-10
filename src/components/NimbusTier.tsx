"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AccessQuery } from "../types";
import { useNimbusAccess } from "../hooks/useNimbusAccess";

/**
 * <NimbusTier> — render different content per tier.
 *
 *   <NimbusTier community="bonk">
 *     <NimbusTier.Whale>you hold 1000+ tokens</NimbusTier.Whale>
 *     <NimbusTier.Holder>you hold some tokens</NimbusTier.Holder>
 *     <NimbusTier.None>you hold nothing</NimbusTier.None>
 *   </NimbusTier>
 *
 * The parent runs ONE access check and provides the derived tier via
 * context; subcomponents render only when their tier matches exactly.
 *
 * Whale/Holder/None cover the conventional names. Tiers are user-defined
 * in config, so custom names use the generic primitive they're built on:
 *
 *   <NimbusTier.Match tier="diamond">diamond hands only</NimbusTier.Match>
 *
 * While the check is loading, nothing renders — gates fail closed, and a
 * flash of <None> content at a holder would be worse than a brief blank.
 */

interface TierContextValue {
  tier: string;
  isLoading: boolean;
}

const TierContext = createContext<TierContextValue | null>(null);

export interface NimbusTierProps
  extends Pick<AccessQuery, "community" | "mint" | "contract" | "chain"> {
  children: ReactNode;
}

function NimbusTierRoot({ children, ...query }: NimbusTierProps) {
  const { tier, isLoading } = useNimbusAccess(query);
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
      "[nimbus] <NimbusTier.Match> must be used inside <NimbusTier>."
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

export const NimbusTier = Object.assign(NimbusTierRoot, {
  Match,
  Whale,
  Holder,
  None,
});
