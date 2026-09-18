"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { AccessQuery, TotymChain } from "../types";
import { useTotymContext } from "./TotymProvider";
import { useTotymAccess } from "../hooks/useTotymAccess";
import { TotymButton } from "./TotymButton";
import { resolveQuery } from "../lib/config";
import {
  fetchTokenMetadata,
  defaultBuyUrl,
  type TokenMetadata,
} from "../lib/metadata";

/**
 * <TotymWall> — drop-in full gate wall.
 *
 *   <TotymWall community="bonk" />
 *
 * Renders token branding (name, symbol, image — pulled live from the
 * Totym metadata API), a connect-wallet button, and a buy CTA. If the
 * connected wallet already has access, renders nothing — the wall only
 * exists for outsiders.
 *
 * Branding scope (Phase 2): token-level metadata only. Richer community
 * branding (cover image, custom pitch) lands when the platform exposes a
 * public community-config endpoint.
 *
 * Neutral inline styles by design — it must look acceptable inside any
 * host site without assuming a styling system. `className`/`style` pass
 * through for host theming.
 */

export interface TotymWallProps
  extends Pick<
    AccessQuery,
    | "community"
    | "mint"
    | "contract"
    | "chain"
    | "minimum"
    | "tier"
    | "gateType"
    | "collectionAddress"
  > {
  /** Custom message shown on the wall. */
  message?: string;
  /** Override the buy link. Defaults per chain (pump.fun / Uniswap). */
  buyUrl?: string;
  className?: string;
  style?: CSSProperties;
}

export function TotymWall({
  message,
  buyUrl,
  className,
  style,
  ...query
}: TotymWallProps) {
  const { apiUrl, config } = useTotymContext();
  const { hasAccess, isLoading } = useTotymAccess(query);
  const [meta, setMeta] = useState<TokenMetadata | null>(null);

  // Resolve once so metadata fetch and buy URL share the same target.
  const resolved = useMemo(() => {
    try {
      return resolveQuery(query, config);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query), config]);

  useEffect(() => {
    if (!resolved) return;
    let cancelled = false;
    fetchTokenMetadata(apiUrl, resolved)
      .then((m) => {
        if (!cancelled) setMeta(m);
      })
      .catch(() => {
        /* branding is progressive enhancement — wall works without it */
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, resolved]);

  // Holders never see the wall.
  if (hasAccess) return null;

  const symbol = meta?.symbol ? `$${meta.symbol}` : "the required token";
  const href =
    buyUrl ?? (resolved ? defaultBuyUrl(resolved) : undefined);

  return (
    <div className={className} style={{ ...s.wall, ...style }}>
      {meta?.image && (
        <img src={meta.image} alt={meta.name ?? ""} style={s.image} />
      )}

      <div style={s.titleBlock}>
        <p style={s.title}>{meta?.name ?? "Members only"}</p>
        <p style={s.subtitle}>
          {isLoading
            ? "Checking access…"
            : message ??
              `Connect your wallet and hold ${symbol} to unlock this content.`}
        </p>
      </div>

      <div style={s.actions}>
        <TotymButton
          chain={resolved?.chain === "solana" ? "solana" : resolved ? "evm" : "both"}
        />
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" style={s.buy}>
            Buy {symbol} ↗
          </a>
        )}
      </div>

      {resolved && resolved.minimum > 1 && (
        <p style={s.requirement}>
          Requires {resolved.minimum.toLocaleString()}+ {symbol}
        </p>
      )}
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  wall: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    padding: "2rem 1.5rem",
    border: "1px solid rgba(128,128,128,0.3)",
    borderRadius: "0.75rem",
    textAlign: "center",
    maxWidth: "24rem",
    margin: "0 auto",
  },
  image: {
    width: "3.5rem",
    height: "3.5rem",
    borderRadius: "0.75rem",
    objectFit: "cover",
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  title: {
    margin: 0,
    fontSize: "1.0625rem",
    fontWeight: 700,
  },
  subtitle: {
    margin: 0,
    fontSize: "0.875rem",
    opacity: 0.65,
    lineHeight: 1.45,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    width: "100%",
    maxWidth: "16rem",
  },
  buy: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.625rem 1.25rem",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    textDecoration: "none",
    color: "inherit",
    border: "1px solid rgba(128,128,128,0.3)",
    opacity: 0.85,
  },
  requirement: {
    margin: 0,
    fontSize: "0.75rem",
    opacity: 0.45,
    fontFamily: "monospace",
  },
};
