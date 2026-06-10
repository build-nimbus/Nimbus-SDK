"use client";

import type { CSSProperties, ReactNode } from "react";
import type { AccessQuery, NimbusChain } from "../types";
import { useNimbusAccess } from "../hooks/useNimbusAccess";

/**
 * <NimbusGate> — the core component primitive.
 *
 * Wraps any React children (components, articles, even a single string for
 * word-level gating) and renders them only when the connected wallet passes
 * verification.
 *
 * Phase 1 ships style="block" with the default lock UI. "fade" and "blur"
 * land in Phase 3 — the prop is typed now so consumer code (Pantheon) can
 * be written against the final signature.
 *
 * Fails closed: loading, errors, disconnected wallets, and misconfigured
 * gates all render the locked state, never the content.
 */

export interface NimbusGateProps {
  children: ReactNode;
  /** Community slug from config. */
  community?: string;
  /** Direct SPL mint address. */
  mint?: string;
  /** Direct EVM contract address. */
  contract?: string;
  chain?: NimbusChain;
  /** Minimum token balance. Default 1. */
  minimum?: number;
  /** Tier name from config. */
  tier?: string;
  /** Gate style. Phase 1 supports "block"; "fade"/"blur" arrive in Phase 3. */
  style?: "block" | "fade" | "blur";
  /** Fade start point, e.g. "60%" (Phase 3, style="fade"). */
  fadeAt?: string;
  /** Custom UI for non-holders, replacing the default lock UI. */
  fallback?: ReactNode;
  /** Custom message on the default gate wall. */
  message?: string;
}

export function NimbusGate({
  children,
  community,
  mint,
  contract,
  chain,
  minimum,
  tier,
  style = "block",
  fallback,
  message,
}: NimbusGateProps) {
  const query: AccessQuery = { community, mint, contract, chain, minimum, tier };
  const { hasAccess, isLoading } = useNimbusAccess(query);

  if (hasAccess) return <>{children}</>;

  if (fallback !== undefined) return <>{fallback}</>;

  return <DefaultLockUI isLoading={isLoading} message={message} />;
}

/**
 * Default lock UI.
 *
 * Inline styles, no CSS file, no Tailwind dependency — this renders inside
 * arbitrary host sites and must not assume any styling system. Neutral by
 * design: hosts wanting branded walls use `fallback` or <NimbusWall>
 * (Phase 2).
 */
function DefaultLockUI({
  isLoading,
  message,
}: {
  isLoading: boolean;
  message?: string;
}) {
  return (
    <div style={styles.wall} role="status" aria-live="polite">
      <span aria-hidden="true" style={styles.icon}>
        {isLoading ? "◌" : "🔒"}
      </span>
      <span style={styles.text}>
        {isLoading
          ? "Checking access…"
          : message ?? "Hold the required token to unlock this content."}
      </span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
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
  icon: {
    flexShrink: 0,
  },
  text: {
    margin: 0,
  },
};
