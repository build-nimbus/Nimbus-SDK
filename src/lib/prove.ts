import type { WalletKind } from "../types";

/**
 * Proving the visitor CONTROLS the wallet, rather than that they typed it.
 *
 * ── What this fixes ─────────────────────────────────────────────────────────
 *
 * `verifyAccess` asks `/api/check-access` whether an address holds enough of a
 * token. That answer is true, server-side, and not an access decision — because
 * the address is whatever the caller supplied. Anyone can read a whale's
 * address off a block explorer, pass it as the `wallet` prop, and be told
 * `hasAccess: true`.
 *
 * The API says so itself now: every `/api/check-access` response carries
 * `verified: false`. This module is how you get `verified: true`.
 *
 * ── The exchange ────────────────────────────────────────────────────────────
 *
 *   1. ask the API for a challenge — a single-use nonce, and the exact text
 *   2. the wallet signs that text
 *   3. the API checks the signature and returns a short-lived token
 *
 * The token carries the wallet. Every later question is asked with the token,
 * and the address is read from it rather than from a parameter — so there is
 * nothing left to spoof.
 *
 * ── Why you pass the signer in ──────────────────────────────────────────────
 *
 * The same reason `TotymProvider` takes a `wallet` prop rather than importing
 * a wallet library: this package bundles none, and will not start. You already
 * have a signer — wallet-adapter's `signMessage`, wagmi's `signMessageAsync`,
 * Privy's, or `window.solana.signMessage`. Hand it over; the SDK stays free of
 * the dependency and you keep whatever wallet stack you already chose.
 */

/**
 * Signs a message and returns the signature as the chain encodes it: base58 for
 * Solana, `0x…` hex for EVM. Both are what the usual libraries already return.
 */
export type SignMessage = (message: string) => Promise<string>;

export interface ProvedSession {
  /** Send as `Authorization: Bearer …`. Treat it as a credential. */
  token: string;
  /** Seconds until it expires. The wallet signs again after that. */
  expiresIn: number;
  /** The address the token is bound to, echoed by the server. */
  wallet: string;
  chain: WalletKind;
}

export class TotymProofError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TotymProofError";
    this.status = status;
  }
}

function trimSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function post(url: string, body: unknown): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new TotymProofError(
      data?.error ?? `Request failed (${res.status})`,
      res.status
    );
  }
  return data;
}

/**
 * Run the exchange. Resolves to a session, or throws.
 *
 * Throwing rather than returning null is deliberate: every failure here is
 * something the developer or the user can act on — the user declined the
 * signature, the challenge expired, the server is not configured — and a null
 * would flatten all of them into "no access", which is the wrong story to tell
 * somebody who does hold the token.
 */
export async function proveWallet(options: {
  /** Same base URL you gave `TotymProvider`. */
  apiUrl: string;
  /** The connected address. */
  wallet: string;
  chain: WalletKind;
  signMessage: SignMessage;
}): Promise<ProvedSession> {
  const api = trimSlash(options.apiUrl);

  const challenge = await post(`${api}/api/sdk/challenge`, {
    wallet: options.wallet,
    chain: options.chain,
  });

  /**
   * Sign what the server sent, byte for byte.
   *
   * Do not rebuild this string, do not trim it, do not re-encode it. The server
   * reconstructs the same text to check the signature against, so one changed
   * character is a failed proof — and a client that assembles its own message
   * is a client that can be talked into signing something else.
   */
  const signature = await options.signMessage(challenge.message);

  const session = await post(`${api}/api/sdk/session`, {
    wallet: options.wallet,
    chain: options.chain,
    nonce: challenge.nonce,
    signature,
  });

  return {
    token: session.token,
    expiresIn: session.expiresIn,
    wallet: session.wallet,
    chain: session.chain,
  };
}
