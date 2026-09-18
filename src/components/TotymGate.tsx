"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { AccessQuery, TotymChain } from "../types";
import { useTotymAccess } from "../hooks/useTotymAccess";

/**
 * <TotymGate> — the core component primitive.
 *
 * Wraps any React children and renders them only when the connected wallet
 * passes verification. Three gate styles:
 *
 *   block — hard cutoff. Content hidden entirely, lock UI in its place.
 *   fade  — NYT pattern. Content dissolves into a gradient at `fadeAt`,
 *           gate CTA floats below. Teaser UX for long-form content.
 *   blur  — content visible but unreadable, lock UI overlaid.
 *
 * IMPORTANT — what each style protects:
 * "block" keeps children out of the DOM for non-holders. "fade" and "blur"
 * RENDER children and obscure them visually — the content exists in the
 * page source by design (you can't fade what isn't rendered). Use fade/blur
 * for conversion teasers. Anything genuinely secret must be fetched from a
 * server route that re-verifies access, regardless of style.
 *
 * Fails closed: loading, errors, disconnected wallets, and misconfigured
 * gates all render the gated state, never the unlocked content.
 */

export interface TotymGateProps {
  children: ReactNode;
  /** Community slug from config. */
  community?: string;
  /** Direct SPL mint address. */
  mint?: string;
  /** Direct EVM contract address. */
  contract?: string;
  chain?: TotymChain;
  /** Minimum token balance. Default 1. */
  minimum?: number;
  /** Tier name from config. */
  tier?: string;
  /**
   * Gate on NFT ownership rather than a token balance. Default "token".
   *
   * Solana needs `collectionAddress` alongside it; EVM reads the `contract` as
   * an ERC-721. Without this prop an NFT gate was unreachable from the
   * components — only the hook could express one.
   */
  gateType?: "token" | "nft";
  /** Solana NFT collection address. Required when gateType="nft" on Solana. */
  collectionAddress?: string;
  /** Gate style. Default "block". */
  style?: "block" | "fade" | "blur";
  /**
   * Where the fade begins, as a percentage of the content's natural height
   * (style="fade" only). "60%" shows roughly the top 60% of the content,
   * dissolving over the last stretch of that window. Default "60%".
   */
  fadeAt?: string | number;
  /** Custom UI for non-holders, replacing the default lock UI. */
  fallback?: ReactNode;
  /** Custom message on the default gate wall. */
  message?: string;
}

export function TotymGate({
  children,
  community,
  mint,
  contract,
  chain,
  minimum,
  tier,
  gateType,
  collectionAddress,
  style = "block",
  fadeAt = "60%",
  fallback,
  message,
}: TotymGateProps) {
  const query: AccessQuery = { community, mint, contract, chain, minimum, tier, gateType, collectionAddress };
  const { hasAccess, isLoading } = useTotymAccess(query);

  if (hasAccess) return <>{children}</>;

  if (style === "fade") {
    return (
      <FadeGate fadeAt={fadeAt} isLoading={isLoading} message={message} cta={fallback}>
        {children}
      </FadeGate>
    );
  }

  if (style === "blur") {
    return (
      <BlurGate isLoading={isLoading} message={message} cta={fallback}>
        {children}
      </BlurGate>
    );
  }

  // block — content never enters the DOM for non-holders.
  if (fallback !== undefined) return <>{fallback}</>;
  return <DefaultLockUI isLoading={isLoading} message={message} />;
}

/* ────────────────────────────── fade ────────────────────────────── */

function parseFadeAt(fadeAt: string | number): number {
  const n =
    typeof fadeAt === "number" ? fadeAt : parseFloat(fadeAt.replace("%", ""));
  if (Number.isNaN(n)) return 0.6;
  return Math.min(Math.max(n / 100, 0.1), 0.95);
}

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function FadeGate({
  children,
  fadeAt,
  isLoading,
  message,
  cta,
}: {
  children: ReactNode;
  fadeAt: string | number;
  isLoading: boolean;
  message?: string;
  cta?: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [fullHeight, setFullHeight] = useState<number | null>(null);
  const fraction = parseFadeAt(fadeAt);

  // Measure the content's natural height. maxHeight starts at 0 (fail
  // closed — no flash of full content pre-measurement); scrollHeight still
  // reports the full height through an overflow-hidden clip.
  useIsomorphicLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setFullHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visiblePx =
    fullHeight !== null ? Math.max(96, Math.round(fullHeight * fraction)) : 0;

  return (
    <div>
      <div
        ref={contentRef}
        aria-hidden="true"
        style={{
          maxHeight: visiblePx,
          overflow: "hidden",
          // Gradient occupies the lower portion of the visible window.
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
      {cta !== undefined ? (
        cta
      ) : (
        <DefaultLockUI
          isLoading={isLoading}
          message={message ?? "Hold the required token to keep reading."}
        />
      )}
    </div>
  );
}

/* ────────────────────────────── blur ────────────────────────────── */

function BlurGate({
  children,
  isLoading,
  message,
  cta,
}: {
  children: ReactNode;
  isLoading: boolean;
  message?: string;
  cta?: ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div
        aria-hidden="true"
        style={{
          filter: "blur(10px)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        {cta !== undefined ? (
          cta
        ) : (
          <div style={blurOverlayStyles}>
            <DefaultLockUI isLoading={isLoading} message={message} bare />
          </div>
        )}
      </div>
    </div>
  );
}

const blurOverlayStyles: CSSProperties = {
  background: "rgba(0, 0, 0, 0.55)",
  color: "#fff",
  borderRadius: "0.5rem",
  padding: "0.25rem 0.5rem",
  backdropFilter: "blur(2px)",
  maxWidth: "90%",
};

/* ─────────────────────────── lock UI ────────────────────────────── */

/**
 * Default lock UI. Inline styles, no CSS file, no Tailwind dependency —
 * this renders inside arbitrary host sites and must not assume any styling
 * system. `bare` strips the border for use inside the blur overlay.
 */
function DefaultLockUI({
  isLoading,
  message,
  bare = false,
}: {
  isLoading: boolean;
  message?: string;
  bare?: boolean;
}) {
  return (
    <div
      style={bare ? lockStyles.bare : lockStyles.wall}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true" style={lockStyles.icon}>
        {isLoading ? "◌" : "🔒"}
      </span>
      <span>
        {isLoading
          ? "Checking access…"
          : message ?? "Hold the required token to unlock this content."}
      </span>
    </div>
  );
}

const lockStyles: Record<string, CSSProperties> = {
  wall: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.875rem 1rem",
    border: "1px solid rgba(128, 128, 128, 0.35)",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    lineHeight: 1.4,
    color: "inherit",
    opacity: 0.85,
  },
  bare: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    lineHeight: 1.4,
  },
  icon: {
    flexShrink: 0,
  },
};