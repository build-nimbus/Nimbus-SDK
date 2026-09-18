/**
 * @totym/sdk — shared types
 *
 * These types are the public contract of the SDK. Changing them is a
 * breaking change; add, don't mutate.
 */

/** Chains the SDK can verify against. */
export type TotymChain = "solana" | "base" | "ethereum" | "polygon";

/** Wallet ecosystems (a wallet is either Solana-native or EVM-native). */
export type WalletKind = "solana" | "evm";

/** EVM chain IDs the Totym API understands. */
export const EVM_CHAIN_IDS: Record<Exclude<TotymChain, "solana">, number> = {
  base: 8453,
  ethereum: 1,
  polygon: 137,
};

/** A single community defined in config. */
export interface CommunityConfig {
  /** SPL mint (Solana) or contract address (EVM). */
  mint?: string;
  contract?: string;
  chain?: TotymChain;
}

/** A named tier — references a community and sets a threshold. */
export interface TierConfig {
  community: string;
  minimum: number;
}

/** Inline config shape — mirrors totym.config.js (file loader lands in Phase 4). */
export interface TotymConfig {
  communities?: Record<string, CommunityConfig>;
  tiers?: Record<string, TierConfig>;
}

/** Everything needed to run one access check. */
export interface AccessQuery {
  /** Community slug — resolves mint/contract/chain from config. */
  community?: string;
  /** Tier name from config — resolves community + minimum. */
  tier?: string;
  /** Direct SPL token mint address (no config needed). */
  mint?: string;
  /** Direct EVM contract address (no config needed). */
  contract?: string;
  chain?: TotymChain;
  minimum?: number;
  /** Token gate vs NFT gate (Solana). Defaults to "token". */
  gateType?: "token" | "nft";
  /** Gate by token amount or USD value (Solana). Defaults to "token_amount". */
  gateMode?: "token_amount" | "dollar_value";
  minimumUsd?: number;
  collectionAddress?: string;
}

/** Result of a verification call. */
export interface AccessResult {
  hasAccess: boolean;
  balance: number;
}

/** State returned by useTotymAccess. */
export interface AccessState extends AccessResult {
  /** Highest tier name the balance qualifies for, or "none". */
  tier: string;
  isLoading: boolean;
  error: string | null;
}

/** State returned by useTotymWallet. */
export interface WalletState {
  address: string | null;
  connected: boolean;
  chain: WalletKind | null;
}
