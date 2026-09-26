/**
 * @totym/sdk — public API
 *
 * Wallet ownership → token verification → access → participation.
 */

// Components
export { TotymProvider } from "./components/TotymProvider";
export type { TotymProviderProps } from "./components/TotymProvider";
export { TotymReveal } from "./components/TotymReveal";
export type { TotymRevealProps } from "./components/TotymReveal";

/**
 * `TotymGate` was renamed to `TotymReveal` in 0.3.0, because the old name read as a
 * boundary and this component is not one — it decides what to SHOW, and the content it
 * hides has already been sent. See `TotymServerGate` in `@totym/sdk/rsc` for a refusal
 * that withholds bytes.
 *
 * Kept as an alias so nothing breaks. Step one of the three in VERSIONING.md: announce
 * in the types, keep it working. It still works, identically.
 *
 * @deprecated Renamed to `TotymReveal`. For content that must not reach a non-holder at
 * all, use `TotymServerGate` from `@totym/sdk/rsc` — this component cannot do that, and
 * its old name implied it could.
 */
export { TotymReveal as TotymGate } from "./components/TotymReveal";
/** @deprecated Renamed to `TotymRevealProps`. */
export type { TotymRevealProps as TotymGateProps } from "./components/TotymReveal";
export { TotymTier } from "./components/TotymTier";
export type { TotymTierProps, TierMatchProps } from "./components/TotymTier";
export { TotymWall } from "./components/TotymWall";
export type { TotymWallProps } from "./components/TotymWall";
export { TotymButton } from "./components/TotymButton";
export type { TotymButtonProps } from "./components/TotymButton";

// Hooks
export { useTotymAccess } from "./hooks/useTotymAccess";
export { useTotymWallet } from "./hooks/useTotymWallet";
export { useTotymTier } from "./hooks/useTotymTier";

// Wallet proof — the client half. The server half is `@totym/sdk/server`.
export { proveWallet, TotymProofError } from "./lib/prove";
export type { ProvedSession, SignMessage } from "./lib/prove";

// Config
export { defineConfig } from "./lib/config";

// Utilities
export { detectChain } from "./lib/chain-detect";
export { clearCache } from "./lib/cache";

// Types
export type {
  TotymChain,
  WalletKind,
  TotymConfig,
  CommunityConfig,
  TierConfig,
  AccessQuery,
  AccessResult,
  AccessState,
  WalletState,
} from "./types";
export { EVM_CHAIN_IDS } from "./types";