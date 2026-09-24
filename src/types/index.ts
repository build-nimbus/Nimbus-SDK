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
  /**
   * Token gate vs NFT gate. Defaults to "token".
   *
   * Both families honour it: on Solana it selects an SPL balance check or a
   * collection membership check, and on EVM it selects `erc20` or `erc721`.
   */
  gateType?: "token" | "nft";
  /** Gate by token amount or USD value (Solana). Defaults to "token_amount". */
  gateMode?: "token_amount" | "dollar_value";
  minimumUsd?: number;
  collectionAddress?: string;
}

/** Result of a verification call. */
export interface AccessResult {
  hasAccess: boolean;
  /**
   * The wallet's balance, in whole tokens on Solana and in RAW BASE UNITS on
   * EVM — the API returns `balanceOf` undivided, so one token of an 18-decimal
   * ERC-20 is 1e18 here. `minimum` is compared in the same units, so a
   * threshold written for one family does not transfer to the other.
   *
   * 0 when the API did not measure one. That happens on the creator bypass,
   * which grants access without reading the chain; check `isCreator` before
   * treating a 0 as "holds nothing".
   */
  balance: number;
  /**
   * The connected wallet is the community's creator, so access was granted
   * without a balance read. `balance` is 0 and means nothing in this case.
   */
  isCreator: boolean;
}

/** State returned by useTotymAccess. */
export interface AccessState extends AccessResult {
  /**
   * Highest tier name the balance qualifies for, or "none". A creator gets the
   * highest tier configured for the community, not "none" — they hold the keys
   * to it whether or not they hold the token.
   */
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
