import type { AccessResult } from "../types";
import { EVM_CHAIN_IDS } from "../types";
import type { ResolvedQuery } from "./config";
import { cachedFetch, cacheKey } from "./cache";

/**
 * Verification layer.
 *
 * Locked decision: verification is ALWAYS server-side. This module only
 * knows how to talk to the Nimbus API — it never touches RPC, never trusts
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
      throw new Error(`[nimbus] Verification failed (${res.status})`);
    }
    const data = (await res.json()) as Partial<AccessResult>;
    return {
      hasAccess: Boolean(data.hasAccess),
      balance: Number(data.balance ?? 0),
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
    gate_type: "erc20",
    minimum: String(q.minimum),
  });
  return `${trimSlash(apiUrl)}/api/check-access-evm?${params.toString()}`;
}

function trimSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
