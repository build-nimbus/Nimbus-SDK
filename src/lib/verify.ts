import type { AccessResult } from "../types";
import { EVM_CHAIN_IDS } from "../types";
import type { ResolvedQuery } from "./config";
import { cachedFetch, cacheKey } from "./cache";

/**
 * Verification layer.
 *
 * Locked decision: verification is ALWAYS server-side. This module only
 * knows how to talk to the Totym API — it never touches RPC, never trusts
 * a client-reported balance. The API decides; we relay.
 */

export async function verifyAccess(
  apiUrl: string,
  wallet: string,
  query: ResolvedQuery
): Promise<AccessResult> {
  const isEvm = query.chain !== "solana";

  const url = isEvm
    ? buildEvmUrl(apiUrl, wallet, query)
    : buildSolanaUrl(apiUrl, wallet, query);

  const key = cacheKey({ url });

  return cachedFetch(key, async () => {
    const res = await fetch(url);
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
