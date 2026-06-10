import type { WalletKind } from "../types";

/**
 * Detect the ecosystem of an address from its format.
 *
 * Locked decision: 0x + 40 hex chars = EVM, base58 32–44 chars = Solana.
 * This is format detection, not validation — the API is the source of truth.
 */
export function detectChain(address: string): WalletKind | null {
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return "evm";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return "solana";
  return null;
}
