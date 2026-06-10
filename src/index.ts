/**
 * @nimbus/sdk — public API
 *
 * Wallet ownership → token verification → access → participation.
 */

// Components
export { NimbusProvider } from "./components/NimbusProvider";
export type { NimbusProviderProps } from "./components/NimbusProvider";
export { NimbusGate } from "./components/NimbusGate";
export type { NimbusGateProps } from "./components/NimbusGate";
export { NimbusTier } from "./components/NimbusTier";
export type { NimbusTierProps, TierMatchProps } from "./components/NimbusTier";
export { NimbusWall } from "./components/NimbusWall";
export type { NimbusWallProps } from "./components/NimbusWall";
export { NimbusButton } from "./components/NimbusButton";
export type { NimbusButtonProps } from "./components/NimbusButton";

// Hooks
export { useNimbusAccess } from "./hooks/useNimbusAccess";
export { useNimbusWallet } from "./hooks/useNimbusWallet";
export { useNimbusTier } from "./hooks/useNimbusTier";

// Utilities
export { detectChain } from "./lib/chain-detect";
export { clearCache } from "./lib/cache";

// Types
export type {
  NimbusChain,
  WalletKind,
  NimbusConfig,
  CommunityConfig,
  TierConfig,
  AccessQuery,
  AccessResult,
  AccessState,
  WalletState,
} from "./types";
export { EVM_CHAIN_IDS } from "./types";
