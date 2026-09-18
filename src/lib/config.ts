import type { AccessQuery, TotymConfig, TotymChain } from "../types";

/**
 * defineConfig — typed helper for the developer's totym config file.
 *
 * Phase 4 reality check: the SDK runs client-side, so "loading
 * totym.config.js from the project root" is an import, not filesystem
 * magic. The pattern:
 *
 *   // totym.config.ts (project root)
 *   import { defineConfig } from "@totym/sdk";
 *   export default defineConfig({
 *     communities: { bonk: { mint: "...", chain: "solana" } },
 *     tiers: { whale: { community: "bonk", minimum: 1000000 } },
 *   });
 *
 *   // app root
 *   import totymConfig from "../totym.config";
 *   <TotymProvider apiUrl="..." config={totymConfig}>
 *
 * One source of truth: change a threshold in the config file and every
 * <TotymGate tier="..."> on the site updates. defineConfig exists for
 * autocomplete and compile-time validation of the shape.
 */
export function defineConfig(config: TotymConfig): TotymConfig {
  return config;
}

/**
 * Config resolution.
 *
 * Tiers and communities are indirection: a tier names a community + minimum,
 * a community names a mint/contract + chain. This module flattens that
 * indirection into a concrete query the verify layer can execute.
 *
 * Phase 1 accepts config inline via <TotymProvider config={...}>.
 * The totym.config.js file loader is Phase 4 — it will produce this same
 * TotymConfig shape, so nothing downstream changes.
 */

export interface ResolvedQuery {
  mint?: string;
  contract?: string;
  chain: TotymChain;
  minimum: number;
  gateType: "token" | "nft";
  gateMode: "token_amount" | "dollar_value";
  minimumUsd?: number;
  collectionAddress?: string;
  /** Community slug, if the query came through config. Used for tier derivation. */
  communitySlug?: string;
}

export function resolveQuery(
  query: AccessQuery,
  config: TotymConfig | undefined
): ResolvedQuery {
  let { mint, contract, chain, minimum } = query;
  let communitySlug = query.community;

  // Tier → community + minimum
  if (query.tier) {
    const tier = config?.tiers?.[query.tier];
    if (!tier) {
      throw new Error(
        `[totym] Unknown tier "${query.tier}". Define it in your TotymProvider config.`
      );
    }
    communitySlug = tier.community;
    minimum = minimum ?? tier.minimum;
  }

  // Community → mint/contract + chain
  if (communitySlug) {
    const community = config?.communities?.[communitySlug];
    if (!community) {
      throw new Error(
        `[totym] Unknown community "${communitySlug}". Define it in your TotymProvider config.`
      );
    }
    mint = mint ?? community.mint;
    contract = contract ?? community.contract;
    chain = chain ?? community.chain;
  }

  if (!mint && !contract) {
    throw new Error(
      `[totym] Access query needs a target: pass mint, contract, community, or tier.`
    );
  }

  return {
    mint,
    contract,
    chain: chain ?? (contract ? "ethereum" : "solana"),
    minimum: minimum ?? 1,
    gateType: query.gateType ?? "token",
    gateMode: query.gateMode ?? "token_amount",
    minimumUsd: query.minimumUsd,
    collectionAddress: query.collectionAddress,
    communitySlug,
  };
}

/**
 * Derive the highest tier name a balance qualifies for, scoped to the
 * community this query belongs to. Falls back to "holder"/"none" when no
 * tier config exists, so `tier` is always a usable string.
 */
export function deriveTier(
  balance: number,
  hasAccess: boolean,
  communitySlug: string | undefined,
  config: TotymConfig | undefined
): string {
  const tiers = config?.tiers;
  if (tiers && communitySlug) {
    let best: { name: string; minimum: number } | null = null;
    for (const [name, tier] of Object.entries(tiers)) {
      if (tier.community !== communitySlug) continue;
      if (balance >= tier.minimum && (!best || tier.minimum > best.minimum)) {
        best = { name, minimum: tier.minimum };
      }
    }
    if (best) return best.name;
    return "none";
  }
  return hasAccess ? "holder" : "none";
}