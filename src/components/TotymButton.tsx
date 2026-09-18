"use client";

import { useState, type CSSProperties } from "react";
import type { WalletKind } from "../types";
import { useTotymContext } from "./TotymProvider";

/**
 * <TotymButton> — wallet connect button, styleable to match the host site.
 *
 *   <TotymButton chain="solana" onConnect={(address) => ...} />
 *
 * chain="both" (default) renders a button per detected injected wallet —
 * a visitor with only Phantom sees one Solana button, not a dead EVM one.
 * If nothing is injected, renders a short "no wallet detected" notice.
 *
 * Note for hosts that pass `wallet` into TotymProvider: you already have
 * a connect flow — use your own button. This one drives the SDK's
 * injected-wallet detection path.
 */

export interface TotymButtonProps {
  onConnect?: (address: string) => void;
  chain?: "solana" | "evm" | "both";
  className?: string;
  style?: CSSProperties;
  /** Override button label. Default: "Connect Wallet" / per-chain labels. */
  label?: string;
}

export function TotymButton({
  onConnect,
  chain = "both",
  className,
  style,
  label,
}: TotymButtonProps) {
  const { connect, wallet } = useTotymContext();
  const [busy, setBusy] = useState<WalletKind | null>(null);

  // Already connected — show the address, not another connect button.
  if (wallet.connected && wallet.address) {
    return (
      <span className={className} style={{ ...baseStyles.connected, ...style }}>
        {shorten(wallet.address)}
      </span>
    );
  }

  const hasSolana =
    typeof window !== "undefined" && Boolean((window as any).solana);
  const hasEvm =
    typeof window !== "undefined" && Boolean((window as any).ethereum);

  const kinds: WalletKind[] =
    chain === "solana" ? ["solana"] : chain === "evm" ? ["evm"] : ["solana", "evm"];

  const available = kinds.filter((k) =>
    k === "solana" ? hasSolana : hasEvm
  );

  if (available.length === 0) {
    return (
      <span className={className} style={{ ...baseStyles.notice, ...style }}>
        No wallet detected — install Phantom or an EVM wallet to continue.
      </span>
    );
  }

  const handleConnect = async (kind: WalletKind) => {
    setBusy(kind);
    const address = await connect(kind);
    setBusy(null);
    if (address && onConnect) onConnect(address);
  };

  return (
    <>
      {available.map((kind) => (
        <button
          key={kind}
          type="button"
          className={className}
          style={{ ...baseStyles.button, ...style }}
          disabled={busy !== null}
          onClick={() => handleConnect(kind)}
        >
          {busy === kind
            ? "Connecting…"
            : label ??
              (available.length > 1
                ? kind === "solana"
                  ? "Connect Solana Wallet"
                  : "Connect EVM Wallet"
                : "Connect Wallet")}
        </button>
      ))}
    </>
  );
}

function shorten(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

const baseStyles: Record<string, CSSProperties> = {
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.625rem 1.25rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(128,128,128,0.35)",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  connected: {
    fontFamily: "monospace",
    fontSize: "0.875rem",
    opacity: 0.8,
  },
  notice: {
    fontSize: "0.8125rem",
    opacity: 0.7,
  },
};
