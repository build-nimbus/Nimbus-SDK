/**
 * @totym/sdk — public API
 *
 * Wallet ownership → token verification → access → participation.
 */

// Components
export { TotymProvider } from "./components/TotymProvider";
export type { TotymProviderProps } from "./components/TotymProvider";
export { TotymGate } from "./components/TotymGate";
export type { TotymGateProps } from "./components/TotymGate";
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