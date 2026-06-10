"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { NimbusConfig, WalletState, WalletKind } from "../types";
import { detectChain } from "../lib/chain-detect";

/**
 * NimbusProvider — the SDK root.
 *
 * Owns three things:
 *  1. API config (apiUrl, projectId) — where verification requests go.
 *  2. Tier/community config — inline for Phase 1; the nimbus.config.js
 *     loader (Phase 4) will feed the same shape.
 *  3. Wallet state — detected from injected providers, or supplied by the
 *     host via the `wallet` prop.
 *
 * Wallet strategy (Phase 1 decision):
 * We do NOT bundle or import any wallet library. Hosts that already run
 * Solana Wallet Adapter or wagmi pass the connected address down via
 * `wallet` — one line, zero dependency coupling. Hosts with nothing get
 * best-effort detection of injected providers (window.solana /
 * window.ethereum). Auto-detecting third-party React contexts requires
 * optional peer deps + conditional imports, which breaks unpredictably
 * across bundlers — deferred until it earns its complexity.
 */

interface NimbusContextValue {
  apiUrl: string;
  projectId?: string;
  config?: NimbusConfig;
  wallet: WalletState;
  /** Request connection from an injected wallet. Resolves to the address or null. */
  connect: (kind: WalletKind) => Promise<string | null>;
}

const NimbusContext = createContext<NimbusContextValue | null>(null);

export interface NimbusProviderProps {
  children: ReactNode;
  /** Base URL of the Nimbus API, e.g. "https://api.nimbus.xyz" or your proxy. */
  apiUrl: string;
  /** Project ID from the Nimbus dashboard. */
  projectId?: string;
  /** Inline tier/community config (mirrors nimbus.config.js). */
  config?: NimbusConfig;
  /**
   * Wallet override. If your app already manages wallets (wallet-adapter,
   * wagmi, Privy), pass the connected address here and the SDK skips its
   * own detection entirely.
   */
  wallet?: { address: string | null };
}

const DISCONNECTED: WalletState = {
  address: null,
  connected: false,
  chain: null,
};

export function NimbusProvider({
  children,
  apiUrl,
  projectId,
  config,
  wallet: walletOverride,
}: NimbusProviderProps) {
  const [detected, setDetected] = useState<WalletState>(DISCONNECTED);

  const hasOverride = walletOverride !== undefined;

  // Best-effort injected-wallet detection. Only runs when the host hasn't
  // taken ownership via the wallet prop.
  useEffect(() => {
    if (hasOverride || typeof window === "undefined") return;

    let cancelled = false;

    const setAddress = (address: string | null, kind: WalletKind | null) => {
      if (cancelled) return;
      setDetected(
        address
          ? { address, connected: true, chain: kind }
          : DISCONNECTED
      );
    };

    // --- Solana (Phantom-style injected provider) ---
    const solana = (window as any).solana;
    if (solana?.publicKey) {
      setAddress(solana.publicKey.toString(), "solana");
    }
    const onSolConnect = () =>
      setAddress(solana?.publicKey?.toString() ?? null, "solana");
    const onSolDisconnect = () => setAddress(null, null);
    solana?.on?.("connect", onSolConnect);
    solana?.on?.("disconnect", onSolDisconnect);
    solana?.on?.("accountChanged", onSolConnect);

    // --- EVM (EIP-1193 injected provider) ---
    const ethereum = (window as any).ethereum;
    const onAccountsChanged = (accounts: string[]) =>
      setAddress(accounts[0] ?? null, accounts[0] ? "evm" : null);

    if (ethereum && !solana?.publicKey) {
      // eth_accounts is silent — returns [] unless already authorized.
      ethereum
        .request?.({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts?.[0]) setAddress(accounts[0], "evm");
        })
        .catch(() => {
          /* ignore — detection is best-effort */
        });
    }
    ethereum?.on?.("accountsChanged", onAccountsChanged);

    return () => {
      cancelled = true;
      solana?.off?.("connect", onSolConnect);
      solana?.off?.("disconnect", onSolDisconnect);
      solana?.off?.("accountChanged", onSolConnect);
      ethereum?.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [hasOverride]);

  const wallet: WalletState = useMemo(() => {
    if (hasOverride) {
      const address = walletOverride?.address ?? null;
      return {
        address,
        connected: Boolean(address),
        chain: address ? detectChain(address) : null,
      };
    }
    return detected;
  }, [hasOverride, walletOverride?.address, detected]);

  /**
   * connect() — explicit connection request to an injected wallet.
   *
   * Phantom: window.solana.connect() opens the approval popup.
   * EVM: eth_requestAccounts opens MetaMask/Rabby/etc.
   *
   * When the host has taken wallet ownership via the `wallet` prop, the
   * popup still opens (we can't know the host's intent), but the override
   * remains the source of truth for state — documented behavior: hosts
   * managing their own wallets should use their own connect button.
   */
  const connect = useCallback(
    async (kind: WalletKind): Promise<string | null> => {
      if (typeof window === "undefined") return null;
      try {
        if (kind === "solana") {
          const solana = (window as any).solana;
          if (!solana?.connect) return null;
          const res = await solana.connect();
          const address =
            res?.publicKey?.toString() ?? solana.publicKey?.toString() ?? null;
          if (address && !hasOverride) {
            setDetected({ address, connected: true, chain: "solana" });
          }
          return address;
        }
        const ethereum = (window as any).ethereum;
        if (!ethereum?.request) return null;
        const accounts: string[] = await ethereum.request({
          method: "eth_requestAccounts",
        });
        const address = accounts?.[0] ?? null;
        if (address && !hasOverride) {
          setDetected({ address, connected: true, chain: "evm" });
        }
        return address;
      } catch {
        // User rejected or wallet errored — not exceptional, just no address.
        return null;
      }
    },
    [hasOverride]
  );

  const value = useMemo(
    () => ({ apiUrl, projectId, config, wallet, connect }),
    [apiUrl, projectId, config, wallet, connect]
  );

  return (
    <NimbusContext.Provider value={value}>{children}</NimbusContext.Provider>
  );
}

export function useNimbusContext(): NimbusContextValue {
  const ctx = useContext(NimbusContext);
  if (!ctx) {
    throw new Error(
      "[nimbus] Missing <NimbusProvider>. Wrap your app root with it and pass apiUrl."
    );
  }
  return ctx;
}
