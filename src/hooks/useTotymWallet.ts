"use client";

import type { WalletState } from "../types";
import { useTotymContext } from "../components/TotymProvider";

/**
 * useTotymWallet — the connected wallet, as the SDK sees it.
 *
 * Returns: { address, connected, chain }
 *
 * Deliberately a thin read of provider state. The provider owns detection
 * and overrides; this hook just exposes the result so components and
 * downstream hooks share one source of truth.
 */
export function useTotymWallet(): WalletState {
  return useTotymContext().wallet;
}
