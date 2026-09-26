/**
 * @totym/sdk/server — the half that actually protects something.
 *
 * ── Why this is a separate entry point ──────────────────────────────────────
 *
 * Everything in the main entry renders. `TotymReveal` decides whether to return
 * its children, and that is a decision about the VIEW: the markup it withholds
 * was still sent to the browser if the surrounding page fetched it, and the
 * condition it branches on runs on a machine the visitor controls. Hiding is
 * not protecting, and the README has always said so.
 *
 * This module is the other thing. It runs on your server, before the response
 * is built, and the protected payload is never read unless the check passes.
 *
 * It lives at `@totym/sdk/server` so that importing it into a client component
 * is a build error rather than a silent leak of whatever you configured.
 */

export interface TotymAccessQuery {
  /** Solana mint address. Use `contract` for EVM. */
  mint?: string;
  /** EVM contract address. */
  contract?: string;
  /** EVM chain id, when using `contract`. */
  chainId?: number;
  /** Minimum balance required. */
  minimum?: number | string;
  /** Minimum USD value required, Solana only. */
  minimumUsd?: number | string;
  gateType?: string;
  gateMode?: string;
  collectionAddress?: string;
}

export interface TotymHolder {
  /** The address that proved itself. Read from the token, never a parameter. */
  wallet: string;
  chain: string;
  /** Balance the API measured, or null when the creator bypass applied. */
  balance: number | null;
}

/** Thrown when the check could not be COMPLETED. Never means "denied". */
export class TotymUnavailableError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TotymUnavailableError";
    this.status = status;
  }
}

/** Pull a bearer token out of request headers. */
export function bearerFrom(headers: Headers | { get(name: string): string | null }): string | null {
  const raw = headers.get("authorization");
  if (!raw?.startsWith("Bearer ")) return null;
  const value = raw.slice(7).trim();
  return value.length > 0 ? value : null;
}

function trimSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Does the bearer of this token hold what the gate requires?
 *
 * Returns the holder, or `null` when they did not prove a wallet or do not
 * hold enough. Throws `TotymUnavailableError` when the answer could not be
 * obtained at all.
 *
 * ── That distinction is the whole contract ──────────────────────────────────
 *
 * "Denied" and "could not check" must not collapse into one value. If an
 * outage returned `null`, every real holder would be locked out of their own
 * community and the logs would show a clean, successful denial. If it returned
 * a holder, the outage would open the gate. So one is a value and the other is
 * an exception, and the caller has to decide what an unavailable check means
 * for their route — usually a 503, never a 403.
 */
export async function requireTotymAccess(options: {
  /** Base URL of the Totym API — the same one the client uses. */
  apiUrl: string;
  /** The token from `proveWallet()`, or the incoming request's headers. */
  token: string | null | Headers | { get(name: string): string | null };
  query: TotymAccessQuery;
  /** Passed through to fetch, for your own timeout or signal. */
  init?: RequestInit;
}): Promise<TotymHolder | null> {
  const token =
    typeof options.token === "string" || options.token === null
      ? options.token
      : bearerFrom(options.token);

  // No proof offered. Not an error — most visitors have not signed anything.
  if (!token) return null;

  const q = options.query;
  const params = new URLSearchParams();
  if (q.mint) params.set("mint", q.mint);
  if (q.contract) params.set("contract", q.contract);
  if (q.chainId != null) params.set("chain_id", String(q.chainId));
  if (q.minimum != null) params.set("minimum", String(q.minimum));
  if (q.minimumUsd != null) params.set("minimum_usd", String(q.minimumUsd));
  if (q.gateType) params.set("gate_type", q.gateType);
  if (q.gateMode) params.set("gate_mode", q.gateMode);
  if (q.collectionAddress) params.set("collection_address", q.collectionAddress);

  /**
   * Note what is NOT in those parameters: a wallet. The endpoint has no such
   * field, and the address comes out of the token. That is the difference
   * between this and `/api/check-access`, and it is the entire point.
   */
  const res = await fetch(
    `${trimSlash(options.apiUrl)}/api/sdk/access?${params.toString()}`,
    {
      ...options.init,
      headers: { ...(options.init?.headers ?? {}), authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  // The token is missing, forged or expired. Ask the wallet to sign again.
  if (res.status === 401) return null;

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new TotymUnavailableError(
      (body as { error?: string })?.error ?? `Access check failed (${res.status})`,
      res.status
    );
  }

  const data = (await res.json()) as {
    verified?: boolean;
    hasAccess?: boolean;
    balance?: number | null;
    wallet?: string;
    chain?: string;
  };

  /**
   * `verified` is checked even though only one endpoint can set it true. If a
   * proxy, a cache or a misconfigured base URL ever pointed this at the public
   * lookup instead, the shape of the answer would be close enough to pass —
   * and it would be an unverified address dressed as a proof.
   */
  if (!data.verified || !data.hasAccess) return null;

  return {
    wallet: data.wallet ?? "",
    chain: data.chain ?? "",
    balance: data.balance ?? null,
  };
}
