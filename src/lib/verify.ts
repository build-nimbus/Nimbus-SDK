import type { AccessResult } from "../types";
import { EVM_CHAIN_IDS } from "../types";
import type { ResolvedQuery } from "./config";
import { cachedFetch, cacheKey } from "./cache";

/**
 * Verification layer.
 *
 * The BALANCE is always server-side. This module never touches RPC and never
 * trusts a client-reported holding — it asks the API and relays the answer.
 *
 * ── What that sentence used to leave out ────────────────────────────────────
 *
 * It read "verification is ALWAYS server-side", which invited the reading that
 * the whole access decision was. It is not. Without a session, the ADDRESS is
 * whatever the caller supplied, so the answer means "this address holds enough"
 * and not "the visitor may come in". Anyone could read a whale's address off a
 * block explorer and be told `hasAccess: true`. The API now says as much on
 * every such response: `verified: false`.
 *
 * ── Two paths, and the caller picks by holding a token ──────────────────────
 *
 *   no token   →  /api/check-access       a balance lookup, verified: false
 *   token      →  /api/sdk/access         a decision, verified: true
 *
 * The second has no `wallet` parameter at all; the address is read out of the
 * token. Get one with `proveWallet()`.
 *
 * Either way this is presentation. Withholding data is `requireTotymAccess()`
 * from `@totym/sdk/server` — see that module for why hiding is not protecting.
 */

export async function verifyAccess(
  apiUrl: string,
  wallet: string,
  query: ResolvedQuery,
  /** A session from `proveWallet()`. With one, the verified path is used. */
  token?: string | null
): Promise<AccessResult> {
  const isEvm = query.chain !== "solana";

  const url = token
    ? buildVerifiedUrl(apiUrl, query, isEvm)
    : isEvm
      ? buildEvmUrl(apiUrl, wallet, query)
      : buildSolanaUrl(apiUrl, wallet, query);

  /**
   * The token is part of the cache key, not just the URL. The verified URL
   * carries no wallet, so two different proved wallets asking about the same
   * gate would otherwise share one cached answer — and the second would be
   * told about the first one's holdings.
   */
  const key = cacheKey({ url, token: token ?? null });

  return cachedFetch(key, async () => {
    const res = await fetch(url, token ? { headers: { authorization: `Bearer ${token}` } } : undefined);
    if (!res.ok) {
      throw new Error(`[totym] Verification failed (${res.status})`);
    }
    const data = (await res.json()) as {
      hasAccess?: boolean;
      balance?: number | null;
      isCreator?: boolean;
    };
    /**
     * `balance` is nullable on the wire and that is deliberate: the creator
     * bypass grants access without reading the chain, so there is no balance to
     * report. It reads as 0 here, and `isCreator` is what says why.
     *
     * (It arrived as `null` before the API said so too — the route returned
     * `Infinity`, which `JSON.stringify` emits as `null`. The old code did
     * `Number(data.balance ?? 0)` and lost the distinction, which is how a
     * creator ended up with `tier: "none"` alongside `hasAccess: true`.)
     */
    const balance = Number(data.balance ?? 0);
    return {
      hasAccess: Boolean(data.hasAccess),
      balance: Number.isFinite(balance) ? balance : 0,
      isCreator: Boolean(data.isCreator),
    };
  });
}

/**
 * The verified endpoint. Note the absence of a wallet parameter — it does not
 * accept one, and the address comes from the bearer token.
 */
function buildVerifiedUrl(apiUrl: string, q: ResolvedQuery, isEvm: boolean): string {
  const params = new URLSearchParams();
  if (isEvm) {
    params.set("contract", q.contract ?? "");
    params.set("chain_id", String(EVM_CHAIN_IDS[q.chain as keyof typeof EVM_CHAIN_IDS]));
    params.set("gate_type", "erc20");
    params.set("minimum", String(q.minimum));
  } else {
    params.set("mint", q.mint ?? "");
    params.set("minimum", String(q.minimum));
    params.set("gate_type", q.gateType);
    params.set("gate_mode", q.gateMode);
    if (q.minimumUsd != null) params.set("minimum_usd", String(q.minimumUsd));
    if (q.collectionAddress) params.set("collection_address", q.collectionAddress);
  }
  return `${trimSlash(apiUrl)}/api/sdk/access?${params.toString()}`;
}

function buildSolanaUrl(
  apiUrl: string,
  wallet: string,
  q: ResolvedQuery
): string {
  const params = new URLSearchParams({
    wallet,
    mint: q.mint ?? "",
    minimum: String(q.minimum),
    network: "mainnet",
    gate_type: q.gateType,
    gate_mode: q.gateMode,
  });
  if (q.minimumUsd != null) params.set("minimum_usd", String(q.minimumUsd));
  if (q.collectionAddress) params.set("collection_address", q.collectionAddress);
  return `${trimSlash(apiUrl)}/api/check-access?${params.toString()}`;
}

function buildEvmUrl(apiUrl: string, wallet: string, q: ResolvedQuery): string {
  const chainId = EVM_CHAIN_IDS[q.chain as keyof typeof EVM_CHAIN_IDS];
  const params = new URLSearchParams({
    wallet,
    contract: q.contract ?? "",
    chain_id: String(chainId),
    /**
     * Was hardcoded to "erc20", which made `gateType: "nft"` a Solana-only
     * option by accident: the endpoint serves `erc721` and has all along, but
     * an EVM NFT gate sent `erc20` and got an ERC-20 `balanceOf` against an
     * ERC-721 contract. Both expose `balanceOf(address)`, so that did not
     * revert — it returned a token COUNT and compared it to the threshold,
     * which is usually the right answer and never a guaranteed one.
     *
     * ERC-1155 is not reachable from here and cannot be: its `balanceOf` takes
     * a token id, which neither this query nor the endpoint accepts.
     */
    gate_type: q.gateType === "nft" ? "erc721" : "erc20",
    minimum: String(q.minimum),
  });
  return `${trimSlash(apiUrl)}/api/check-access-evm?${params.toString()}`;
}

function trimSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
