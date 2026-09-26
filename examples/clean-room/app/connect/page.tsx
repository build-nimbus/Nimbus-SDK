"use client";

import { useState } from "react";
import { TotymButton, proveWallet, useTotymWallet, TotymProofError } from "@totym/sdk";

/**
 * 6 — Wallet connection, and proving control of it.
 *
 * ── Two different things, and the gap between them is the product ────────────
 *
 * `useTotymWallet` tells you which address the browser SAYS is connected. Anybody
 * can say anything; an address is public. So a gate built on that alone is a
 * decoration.
 *
 * `proveWallet` asks the wallet to sign a server-issued challenge and exchanges the
 * signature for a short-lived token. THAT token is what `requireTotymAccess` will
 * accept on the server — see `/server`. The wallet is never a parameter there; it
 * is read out of the token.
 *
 * The signMessage below is deliberately a stub, because this example installs no
 * wallet adapter: wiring one is the developer's choice of library and the SDK does
 * not care which. Replace it with your adapter's own signMessage and nothing else
 * changes.
 */
export default function Connect() {
  const { address, connected, chain } = useTotymWallet();
  const [status, setStatus] = useState<string>("");

  async function prove() {
    if (!address || !chain) return;
    setStatus("Waiting for a signature…");
    try {
      const session = await proveWallet({
        apiUrl: process.env.NEXT_PUBLIC_TOTYM_API_URL ?? "https://www.totym.io",
        wallet: address,
        chain,
        // Replace with your wallet adapter's signMessage.
        signMessage: async () => {
          throw new Error("No wallet adapter is installed in this example.");
        },
      });
      setStatus(`Proved. Token expires in ${session.expiresIn}s. Send it as a bearer token.`);
    } catch (err) {
      /**
       * `TotymProofError` carries the HTTP status, which is how you tell a declined
       * signature from an expired challenge from a server that is not configured.
       * Flattening them all into "no access" tells the wrong story to somebody who
       * does hold the token.
       */
      if (err instanceof TotymProofError) {
        setStatus(`Proof failed (${err.status}): ${err.message}`);
      } else {
        setStatus(err instanceof Error ? err.message : "Unknown failure");
      }
    }
  }

  return (
    <main style={{ maxWidth: "42rem" }}>
      <h1>Connect, then prove</h1>
      <TotymButton />
      <p style={{ marginTop: "1rem" }}>
        {connected ? (
          <>
            Connected: <code>{address}</code> on <code>{chain}</code>
          </>
        ) : (
          "No wallet connected. Everything gated reads as locked, which is correct."
        )}
      </p>
      <button onClick={prove} disabled={!connected} style={{ padding: "0.5rem 1rem" }}>
        Prove this wallet
      </button>
      {status ? <p style={{ color: "#555" }}>{status}</p> : null}
    </main>
  );
}
