import { EVM_CHAIN_IDS } from "../types";
import type { TotymChain } from "../types";
import { cachedFetch, cacheKey } from "./cache";

/**
 * Token metadata — name, symbol, image.
 *
 * Backed by the live platform endpoints:
 *   GET /api/token-metadata?mint=&network=
 *   GET /api/token-metadata-evm?contract=&chain_id=
 *
 * Used by <TotymWall> to brand the gate wall without the developer
 * supplying anything beyond a mint/contract. Goes through the shared cache
 * (metadata changes even less often than balances).
 */

export interface TokenMetadata {
  name: string | null;
  symbol: string | null;
  image: string | null;
}

export async function fetchTokenMetadata(
  apiUrl: string,
  target: { mint?: string; contract?: string; chain: TotymChain }
): Promise<TokenMetadata> {
  const base = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

  const url =
    target.chain === "solana"
      ? `${base}/api/token-metadata?mint=${target.mint}&network=mainnet`
      : `${base}/api/token-metadata-evm?contract=${target.contract}&chain_id=${
          EVM_CHAIN_IDS[target.chain as keyof typeof EVM_CHAIN_IDS]
        }`;

  return cachedFetch(cacheKey({ url }), async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[totym] Metadata fetch failed (${res.status})`);
    const data = await res.json();
    return {
      name: data.name ?? null,
      symbol: data.symbol ?? null,
      image: data.image ?? null,
    };
  });
}

/** Default buy URL per chain — mirrors platform behavior. Overridable via prop. */
export function defaultBuyUrl(
  target: { mint?: string; contract?: string; chain: TotymChain }
): string {
  switch (target.chain) {
    case "base":
      return `https://app.uniswap.org/explore/tokens/base/${target.contract}`;
    case "ethereum":
      return `https://app.uniswap.org/explore/tokens/ethereum/${target.contract}`;
    case "polygon":
      return `https://app.uniswap.org/explore/tokens/polygon/${target.contract}`;
    default:
      return `https://pump.fun/${target.mint}`;
  }
}
